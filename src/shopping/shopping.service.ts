import { ConflictException, Injectable, MessageEvent, NotFoundException } from '@nestjs/common';
import { Prisma, ShoppingDealType, ShoppingTripItem, ShoppingTripItemStatus, ShoppingTripStatus } from '@prisma/client';
import { Observable, Subject, filter, interval, map, merge, of } from 'rxjs';
import { HomeAccessService } from '../home/home-access.service';
import { PrismaService } from '../prisma/prisma.service';
import { AddShoppingItemDto, AddShoppingItemsDto, CheckShoppingItemDto, CreateShoppingTripDto, ShoppingDealFieldsDto, UpdateCapturedItemDto } from './dto';
import { GroceryExtractionService } from './grocery-extraction.service';

const HEARTBEAT_MS = 25_000;
const APPLICABLE_CAPTURE_STATUSES: ShoppingTripItemStatus[] = [
  ShoppingTripItemStatus.PENDING,
  ShoppingTripItemStatus.PARSED,
  ShoppingTripItemStatus.NEEDS_REVIEW,
  ShoppingTripItemStatus.CONFIRMED,
];

// A multi-buy charges full groups at the deal price and the remainder at the regular price.
function lineTotal(item: Pick<ShoppingTripItem, 'price' | 'quantity' | 'regularPrice' | 'dealType' | 'multiBuyQuantity' | 'multiBuyPrice'>) {
  const quantity = item.quantity ?? 1;
  const { dealType, multiBuyQuantity, multiBuyPrice } = item;
  if (dealType !== ShoppingDealType.MULTI_BUY || !multiBuyQuantity || multiBuyPrice === null) return Number(item.price) * quantity;
  const unitPrice = Number(item.regularPrice ?? item.price);
  return Math.floor(quantity / multiBuyQuantity) * Number(multiBuyPrice) + (quantity % multiBuyQuantity) * unitPrice;
}

type LiveState = ReturnType<ShoppingService['toLiveState']>;
type LiveStateItem = Pick<
  ShoppingTripItem,
  'id' | 'name' | 'status' | 'price' | 'quantity' | 'regularPrice' | 'dealType' | 'multiBuyQuantity' | 'multiBuyPrice'
>;

@Injectable()
export class ShoppingService {
  private readonly updates$ = new Subject<{ tripId: string; state: LiveState }>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly access: HomeAccessService,
    private readonly extraction: GroceryExtractionService,
  ) {}

  async getTrips(homeId: bigint, userId: string) {
    await this.access.requireHome(homeId, userId);
    return this.prisma.shoppingTrip.findMany({ where: { homeId }, include: { items: true } });
  }

  async createTrip(homeId: bigint, userId: string, dto: CreateShoppingTripDto) {
    await this.access.requireHome(homeId, userId);
    return this.prisma.shoppingTrip.create({ data: { name: dto.name, description: dto.description, budget: dto.budget ?? 0, homeId } });
  }

  async liveState(homeId: bigint, tripId: bigint, userId: string) {
    await this.access.requireHome(homeId, userId);
    const trip = await this.getTrip(homeId, tripId);
    return this.toLiveState(trip);
  }

  async addItem(homeId: bigint, tripId: bigint, userId: string, dto: AddShoppingItemDto) {
    return this.addItems(homeId, tripId, userId, { items: [dto] });
  }

  async addItems(homeId: bigint, tripId: bigint, userId: string, dto: AddShoppingItemsDto) {
    await this.access.requireHome(homeId, userId);
    const trip = await this.getTrip(homeId, tripId);
    await this.prisma.shoppingTripItem.createMany({
      data: dto.items.map((item) => ({
        rawTranscript: item.name,
        name: item.name,
        quantity: item.quantity ?? 1,
        price: item.price ?? 0,
        ...this.dealData(item),
        shoppingTripId: trip.id,
        status: 'PENDING' as const,
      })),
    });
    return this.publishState(homeId, tripId);
  }

  async startTrip(homeId: bigint, tripId: bigint, userId: string) {
    await this.access.requireHome(homeId, userId);
    const trip = await this.getTrip(homeId, tripId);
    if (trip.status !== ShoppingTripStatus.NOT_STARTED && trip.status !== ShoppingTripStatus.PAUSED) {
      throw new ConflictException(`Cannot start a trip that is ${trip.status}`);
    }
    await this.prisma.shoppingTrip.update({
      where: { id: tripId },
      data: { status: ShoppingTripStatus.ACTIVE, startDate: trip.startDate ?? new Date() },
    });
    return this.publishState(homeId, tripId);
  }

  async pauseTrip(homeId: bigint, tripId: bigint, userId: string) {
    await this.access.requireHome(homeId, userId);
    const trip = await this.getTrip(homeId, tripId);
    if (trip.status !== ShoppingTripStatus.ACTIVE) throw new ConflictException(`Cannot pause a trip that is ${trip.status}`);
    await this.prisma.shoppingTrip.update({ where: { id: tripId }, data: { status: ShoppingTripStatus.PAUSED } });
    return this.publishState(homeId, tripId);
  }

  async checkItem(homeId: bigint, tripId: bigint, itemId: bigint, userId: string, dto: CheckShoppingItemDto) {
    await this.access.requireHome(homeId, userId);
    const item = await this.prisma.shoppingTripItem.findFirst({ where: { id: itemId, shoppingTripId: tripId } });
    if (!item) throw new NotFoundException('Shopping item not found');
    await this.prisma.shoppingTripItem.update({
      where: { id: itemId },
      data: { status: dto.checked ? 'CONFIRMED' : 'PENDING', price: dto.price ?? item.price },
    });
    return this.publishState(homeId, tripId);
  }

  async streamTrip(homeId: bigint, tripId: bigint, userId: string): Promise<Observable<MessageEvent>> {
    await this.access.requireHome(homeId, userId);
    const trip = await this.getTrip(homeId, tripId);
    const key = tripId.toString();

    const updates = this.updates$.pipe(filter((update) => update.tripId === key), map((update) => update.state));
    const state$ = merge(of(this.toLiveState(trip)), updates).pipe(
      map((state): MessageEvent => ({ type: 'shopping-trip-updated', data: state })),
    );
    // Keeps idle connections from being closed by proxies.
    const heartbeat$ = interval(HEARTBEAT_MS).pipe(map((): MessageEvent => ({ type: 'heartbeat', data: {} })));
    return merge(state$, heartbeat$);
  }

  async captureAudio(homeId: bigint, tripId: bigint, userId: string, file: Express.Multer.File) {
    await this.access.requireHome(homeId, userId);
    const trip = await this.getTrip(homeId, tripId);
    const job = await this.prisma.shoppingCaptureJob.create({ data: { audioRef: file.originalname, status: 'PROCESSING', attempts: 1 } });
    try {
      const extracted = await this.extraction.extractFromAudio(file);
      await this.prisma.shoppingTripItem.createMany({
        data: extracted.map((item) => ({
          rawTranscript: item.name,
          name: item.name,
          quantity: item.quantity ?? 1,
          price: item.price ?? 0,
          confidence: item.confidence,
          status: 'NEEDS_REVIEW',
          shoppingTripId: trip.id,
          captureJobId: job.id,
        })),
      });
      await this.prisma.shoppingCaptureJob.update({ where: { id: job.id }, data: { status: 'COMPLETED' } });
    } catch (error) {
      await this.prisma.shoppingCaptureJob.update({ where: { id: job.id }, data: { status: 'FAILED', lastError: error instanceof Error ? error.message : 'AI extraction failed' } });
    }
    await this.publishState(homeId, tripId);
    return this.prisma.shoppingCaptureJob.findUnique({ where: { id: job.id }, include: { items: true } });
  }

  async updateCapturedItem(homeId: bigint, tripId: bigint, itemId: bigint, userId: string, dto: UpdateCapturedItemDto) {
    await this.access.requireHome(homeId, userId);
    const item = await this.prisma.shoppingTripItem.findFirst({ where: { id: itemId, shoppingTripId: tripId } });
    if (!item) throw new NotFoundException('Capture item not found');
    await this.prisma.shoppingTripItem.update({ where: { id: itemId }, data: { ...dto, ...this.dealData(dto) } });
    return this.publishState(homeId, tripId);
  }

  async applyCaptureJob(homeId: bigint, tripId: bigint, captureJobId: bigint, userId: string) {
    await this.access.requireHome(homeId, userId);
    const trip = await this.getTrip(homeId, tripId);
    const items = await this.prisma.shoppingTripItem.findMany({ where: { shoppingTripId: trip.id, captureJobId } });
    if (items.length === 0) throw new NotFoundException('Capture job not found');
    // Applying accepts every reviewed item that was not rejected.
    const toApply = items.filter((item) => APPLICABLE_CAPTURE_STATUSES.includes(item.status));
    if (toApply.length === 0 && items.some((item) => item.status === ShoppingTripItemStatus.APPLIED)) {
      throw new ConflictException('Capture job has already been applied');
    }
    await this.prisma.shoppingTripItem.updateMany({ where: { id: { in: toApply.map((item) => item.id) } }, data: { status: 'APPLIED' } });
    return this.publishState(homeId, tripId);
  }

  async completeTrip(homeId: bigint, tripId: bigint, userId: string) {
    await this.access.requireHome(homeId, userId);
    const trip = await this.getTrip(homeId, tripId);
    if (trip.status === ShoppingTripStatus.COMPLETED) throw new ConflictException('Shopping trip is already completed');
    const items = trip.items.filter((item) => ['CONFIRMED', 'APPLIED'].includes(item.status) && item.name);

    for (const item of items) {
      const existing = await this.findMatchingInventory(homeId, item.name!);
      const quantity = item.quantity ?? 1;
      if (existing) {
        await this.prisma.inventory.update({ where: { id: existing.id }, data: { quantity: existing.quantity + quantity, price: item.price } });
      } else {
        await this.prisma.inventory.create({ data: { name: item.name!, quantity, minQuantity: 0, price: item.price, homeId, tags: ['shopping'] } });
      }
    }

    const state = this.toLiveState(trip);
    await this.prisma.shoppingTrip.update({ where: { id: tripId }, data: { status: 'COMPLETED', completedDate: new Date(), runningTotal: state.checkedOffAmount, totalCost: state.checkedOffAmount } });
    return this.publishState(homeId, tripId);
  }

  private async getTrip(homeId: bigint, tripId: bigint) {
    const trip = await this.prisma.shoppingTrip.findFirst({ where: { id: tripId, homeId }, include: { items: true } });
    if (!trip) throw new NotFoundException('Shopping trip not found');
    return trip;
  }

  // Clearing the deal type clears its details; a SALE has no multi-buy details.
  private dealData(dto: ShoppingDealFieldsDto) {
    if (dto.dealType === undefined) return {};
    const multiBuy = dto.dealType === ShoppingDealType.MULTI_BUY;
    return {
      dealType: dto.dealType,
      regularPrice: dto.dealType === null ? null : dto.regularPrice,
      multiBuyQuantity: multiBuy ? dto.multiBuyQuantity : null,
      multiBuyPrice: multiBuy ? dto.multiBuyPrice : null,
    };
  }

  private toLiveState(trip: { id: bigint; name: string; status: ShoppingTripStatus; budget: Prisma.Decimal; items: LiveStateItem[] }) {
    const checkedOffAmount = trip.items.filter((item) => ['CONFIRMED', 'APPLIED'].includes(item.status)).reduce((sum, item) => sum + lineTotal(item), 0);
    const budgetedAmount = Number(trip.budget);
    const items = trip.items.map((item) => ({
      id: item.id.toString(),
      name: item.name,
      status: item.status,
      quantity: item.quantity,
      price: Number(item.price),
      regularPrice: item.regularPrice === null ? null : Number(item.regularPrice),
      dealType: item.dealType,
      multiBuyQuantity: item.multiBuyQuantity,
      multiBuyPrice: item.multiBuyPrice === null ? null : Number(item.multiBuyPrice),
    }));
    return { shoppingTripId: trip.id.toString(), name: trip.name, status: trip.status, budgetedAmount, checkedOffAmount, remainingBudget: budgetedAmount - checkedOffAmount, items };
  }

  private async publishState(homeId: bigint, tripId: bigint) {
    const trip = await this.getTrip(homeId, tripId);
    const state = this.toLiveState(trip);
    await this.prisma.shoppingTrip.update({ where: { id: tripId }, data: { runningTotal: state.checkedOffAmount } });
    this.updates$.next({ tripId: tripId.toString(), state });
    return state;
  }

  private async findMatchingInventory(homeId: bigint, name: string) {
    const exact = await this.prisma.inventory.findFirst({ where: { homeId, name: { equals: name, mode: 'insensitive' } } });
    if (exact) return exact;
    const normalized = this.normalizeName(name);
    const inventory = await this.prisma.inventory.findMany({ where: { homeId } });
    return inventory.find((item) => this.normalizeName(item.name) === normalized) ?? null;
  }

  private normalizeName(name: string): string {
    return name.trim().toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(Boolean).map((word) => word.endsWith('ies') ? `${word.slice(0, -3)}y` : word.endsWith('s') ? word.slice(0, -1) : word).join(' ');
  }
}
