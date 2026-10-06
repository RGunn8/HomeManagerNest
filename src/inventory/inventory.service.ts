import { Injectable, NotFoundException } from '@nestjs/common';
import { InventoryItemStatus, InventoryTrackingMode, Prisma } from '@prisma/client';
import { HomeAccessService } from '../home/home-access.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateInventoryDto, UpdateInventoryDto } from './dto';

const LOW_STOCK_LIST_NAME = 'Low Stock Shopping List';

type LowStockCandidate = {
  id: bigint;
  name: string;
  quantity: number;
  minQuantity: number;
  status: InventoryItemStatus;
  trackingMode: InventoryTrackingMode;
  price: Prisma.Decimal | null;
};

// COUNT: below the threshold, or at it while marked LOW. LEVEL: marked LOW. NONE: never.
// Keep in sync with lowStockWhere below.
export function isLowStock(item: Pick<LowStockCandidate, 'quantity' | 'minQuantity' | 'status' | 'trackingMode'>) {
  switch (item.trackingMode) {
    case InventoryTrackingMode.COUNT:
      return item.quantity < item.minQuantity || (item.status === InventoryItemStatus.LOW && item.quantity <= item.minQuantity);
    case InventoryTrackingMode.LEVEL:
      return item.status === InventoryItemStatus.LOW;
    case InventoryTrackingMode.NONE:
      return false;
  }
}

export function lowStockWhere(minQuantity: Prisma.FieldRef<'Inventory', 'Int'>): Prisma.InventoryWhereInput {
  return {
    OR: [
      { trackingMode: InventoryTrackingMode.COUNT, quantity: { lt: minQuantity } },
      { trackingMode: InventoryTrackingMode.COUNT, status: InventoryItemStatus.LOW, quantity: { lte: minQuantity } },
      { trackingMode: InventoryTrackingMode.LEVEL, status: InventoryItemStatus.LOW },
    ],
  };
}

@Injectable()
export class InventoryService {
  constructor(private readonly prisma: PrismaService, private readonly access: HomeAccessService) {}

  async getInventory(homeId: bigint, userId: string) {
    await this.access.requireHome(homeId, userId);
    const inventory = await this.prisma.inventory.findMany({
      where: { homeId },
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    });
    const groups = new Map<string, typeof inventory>();

    for (const item of inventory) {
      const categoryItems = groups.get(item.category) ?? [];
      categoryItems.push(item);
      groups.set(item.category, categoryItems);
    }

    return Array.from(groups, ([category, items]) => ({ category, items }));
  }

  async autocomplete(homeId: bigint, userId: string, query: string) {
    await this.access.requireHome(homeId, userId);
    const search = query.trim();
    if (!search) return [];

    const items = await this.prisma.inventory.findMany({
      where: { homeId, name: { contains: search, mode: 'insensitive' } },
      orderBy: { name: 'asc' },
      take: 10,
      select: { id: true, name: true, category: true, quantity: true, minQuantity: true },
    });
    return items.map((item) => ({ ...item, id: item.id.toString() }));
  }

  async getInventoryItem(homeId: bigint, inventoryId: bigint, userId: string) {
    await this.access.requireHome(homeId, userId);
    const item = await this.prisma.inventory.findFirst({ where: { id: inventoryId, homeId } });
    if (!item) throw new NotFoundException('Inventory item not found');
    return item;
  }

  async createInventory(homeId: bigint, userId: string, dto: CreateInventoryDto) {
    await this.access.requireHome(homeId, userId);
    const item = await this.prisma.inventory.create({
      data: {
        name: dto.name,
        description: dto.description,
        category: dto.category ?? 'Uncategorized',
        quantity: dto.quantity,
        minQuantity: dto.minQuantity,
        status: dto.status ?? InventoryItemStatus.FULL,
        price: dto.price,
        tags: dto.tags ?? [],
        link: dto.link,
        trackingMode: dto.trackingMode,
        notes: dto.notes,
        stores: dto.stores ?? [],
        homeId,
        roomId: dto.roomId ? BigInt(dto.roomId) : null,
      },
    });
    await this.syncLowStockItem(homeId, item);
    return item;
  }

  async updateInventory(homeId: bigint, inventoryId: bigint, userId: string, dto: UpdateInventoryDto) {
    await this.access.requireHome(homeId, userId);
    const existing = await this.prisma.inventory.findFirst({ where: { id: inventoryId, homeId } });
    if (!existing) throw new NotFoundException('Inventory item not found');

    const item = await this.prisma.inventory.update({
      where: { id: inventoryId },
      data: {
        name: dto.name ?? existing.name,
        description: dto.description ?? existing.description,
        category: dto.category ?? existing.category,
        quantity: dto.quantity ?? existing.quantity,
        minQuantity: dto.minQuantity ?? existing.minQuantity,
        status: dto.status ?? existing.status,
        price: dto.price ?? existing.price,
        tags: dto.tags ?? existing.tags,
        link: dto.link,
        trackingMode: dto.trackingMode,
        notes: dto.notes,
        stores: dto.stores,
      },
    });
    await this.syncLowStockItem(homeId, item);
    return item;
  }

  async deleteInventory(homeId: bigint, inventoryId: bigint, userId: string): Promise<void> {
    await this.access.requireHome(homeId, userId);
    await this.prisma.$transaction(async (tx) => {
      const result = await tx.inventory.deleteMany({ where: { id: inventoryId, homeId } });
      if (result.count === 0) throw new NotFoundException('Inventory item not found');
      // lowStockInventoryItemId is not a foreign key, so remove the item's open low-stock entry by hand.
      await tx.shoppingTripItem.deleteMany({
        where: {
          lowStockInventoryItemId: inventoryId,
          shoppingTrip: { homeId, name: LOW_STOCK_LIST_NAME, status: { in: ['NOT_STARTED', 'ACTIVE', 'PAUSED'] } },
        },
      });
    });
  }

  async syncLowStockItems(homeId: bigint, items: LowStockCandidate[]) {
    for (const item of items) await this.syncLowStockItem(homeId, item);
  }

  private async syncLowStockItem(homeId: bigint, item: LowStockCandidate) {
    const list = await this.findOrCreateLowStockList(homeId);
    const existing = await this.prisma.shoppingTripItem.findFirst({
      where: { shoppingTripId: list.id, lowStockInventoryItemId: item.id },
    });

    if (!isLowStock(item)) {
      if (existing) await this.prisma.shoppingTripItem.delete({ where: { id: existing.id } });
      return;
    }

    const needed = Math.max(item.minQuantity - item.quantity, 1);
    if (existing) {
      await this.prisma.shoppingTripItem.update({
        where: { id: existing.id },
        data: { name: item.name, rawTranscript: `Low stock: ${item.name}`, quantity: needed, price: item.price ?? 0 },
      });
    } else {
      await this.prisma.shoppingTripItem.create({
        data: {
          rawTranscript: `Low stock: ${item.name}`,
          name: item.name,
          quantity: needed,
          price: item.price ?? 0,
          status: 'PENDING',
          shoppingTripId: list.id,
          lowStockInventoryItemId: item.id,
        },
      });
    }
  }

  private async findOrCreateLowStockList(homeId: bigint) {
    const existing = await this.prisma.shoppingTrip.findFirst({
      where: { homeId, name: LOW_STOCK_LIST_NAME, status: { in: ['NOT_STARTED', 'ACTIVE', 'PAUSED'] } },
    });
    if (existing) return existing;
    return this.prisma.shoppingTrip.create({
      data: {
        name: LOW_STOCK_LIST_NAME,
        description: 'Auto-generated list for inventory items below minimum quantity.',
        homeId,
      },
    });
  }
}
