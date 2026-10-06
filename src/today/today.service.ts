import { BadRequestException, Injectable } from '@nestjs/common';
import { ProjectStatus, ShoppingTripItemStatus, ShoppingTripStatus, TaskStatus } from '@prisma/client';
import { HomeAccessService } from '../home/home-access.service';
import { lowStockWhere } from '../inventory/inventory.service';
import { PrismaService } from '../prisma/prisma.service';
import { HomeDashboardDto, InventoryPreviewDto, TaskPreviewDto } from './today-dto';

@Injectable()
export class TodayService {
  constructor(private readonly prisma: PrismaService, private readonly access: HomeAccessService) {}

  async getDashboard(homeId: bigint, userId: string, timezone = 'UTC'): Promise<HomeDashboardDto> {
    await this.access.requireHome(homeId, userId);
    const { date, start, end } = this.getDayBounds(timezone);
    const activeTaskFilter = { homeId, status: { not: TaskStatus.CANCELLED } };
    const overdueWhere = { homeId, status: TaskStatus.TODO, dueDate: { lt: start } };
    const todayWhere = { ...activeTaskFilter, dueDate: { gte: start, lt: end } };
  

    const [overdueRows, todayTotal, todayOpen, todayCompleted, todayRows, lowInventoryRows, projects, shoppingTrips] = await Promise.all([
      this.prisma.task.findMany({ where: overdueWhere, orderBy: [{ dueDate: 'asc' }, { id: 'asc' }] }),
      this.prisma.task.count({ where: todayWhere }),
      this.prisma.task.count({ where: { ...todayWhere, status: TaskStatus.TODO } }),
      this.prisma.task.count({ where: { ...todayWhere, status: TaskStatus.DONE } }),
      this.prisma.task.findMany({ where: todayWhere, orderBy: [{ dueDate: 'asc' }, { id: 'asc' }], take: 5 }),
      this.prisma.inventory.findMany({
        where: { homeId, ...lowStockWhere(this.prisma.inventory.fields.minQuantity) },
        orderBy: [{ quantity: 'asc' }, { name: 'asc' }],
        select: { id: true, name: true, quantity: true, minQuantity: true, trackingMode: true },
      }),
      this.prisma.project.findMany({
        where: { homeId, status: ProjectStatus.IN_PROGRESS },
        orderBy: { updatedAt: 'desc' },
        include: { room: { select: { name: true } }, tasks: { select: { status: true } } },
      }),
      this.prisma.shoppingTrip.findMany({
        where: { homeId, status: { in: [ShoppingTripStatus.ACTIVE, ShoppingTripStatus.PAUSED, ShoppingTripStatus.NOT_STARTED] } },
        orderBy: { updatedAt: 'desc' },
        include: { items: { select: { name: true, rawTranscript: true, status: true } } },
      }),
    ]);

    return {
      date,
      overdue: { total: overdueRows.length, tasks: overdueRows.map((task) => this.toTaskPreview(task)) },
      today: {
        total: todayTotal,
        open: todayOpen,
        completed: todayCompleted,
        tasks: todayRows.map((task) => this.toTaskPreview(task)),
        hasMore: todayTotal > 5,
      },
      projects: projects.map((project) => ({
        id: project.id.toString(),
        name: project.name,
        room: project.room?.name ?? null,
        dueDate: project.targetCompletionDate?.toISOString().slice(0, 10) ?? null,
        tasksTotal: project.tasks.filter((task) => task.status !== TaskStatus.CANCELLED).length,
        tasksCompleted: project.tasks.filter((task) => task.status === TaskStatus.DONE).length,
        budgetSpent: project.actualCost === null ? null : Number(project.actualCost),
        budgetTotal: project.estimatedCost === null ? null : Number(project.estimatedCost),
      })),
      lowInventory: lowInventoryRows.map((item): InventoryPreviewDto => ({
        id: item.id.toString(),
        name: item.name,
        quantity: item.quantity,
        minQuantity: item.minQuantity,
        trackingMode: item.trackingMode,
        belowThresholdBy: Math.max(item.minQuantity - item.quantity, 0),
      })),
      shoppingTrips: shoppingTrips.map((trip) => {
        const items = trip.items.filter((item) => item.status !== ShoppingTripItemStatus.REJECTED);
        return {
          id: trip.id.toString(),
          name: trip.name,
          pickedItems: items.filter((item) => item.status === ShoppingTripItemStatus.CONFIRMED || item.status === ShoppingTripItemStatus.APPLIED).length,
          totalItems: items.length,
          items: items.map((item) => item.name ?? item.rawTranscript),
        };
      }),
    };
  }

  private getDayBounds(timezone: string) {
    let parts: Intl.DateTimeFormatPart[];
    try {
      parts = new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).formatToParts(new Date());
    } catch {
      throw new BadRequestException('Invalid timezone');
    }

    const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
    const date = `${values.year}-${values.month}-${values.day}`;
    const start = new Date(`${date}T00:00:00.000Z`);
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 1);
    return { date, start, end };
  }

  private toTaskPreview(task: { id: bigint; title: string; type: TaskPreviewDto['type']; status: TaskStatus; dueDate: Date | null }): TaskPreviewDto {
    return {
      id: task.id.toString(),
      title: task.title,
      type: task.type,
      status: task.status,
      dueDate: task.dueDate?.toISOString().slice(0, 10) ?? null,
    };
  }
}