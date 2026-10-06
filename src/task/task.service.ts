import { Injectable, NotFoundException } from '@nestjs/common';
import { RecurrenceFrequency, TaskStatus } from '@prisma/client';
import { HomeAccessService } from '../home/home-access.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTaskDto, UpdateTaskDto } from './dto';

@Injectable()
export class TaskService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: HomeAccessService,
  ) {}

  async getTasks(homeId: bigint, userId: string, status?: TaskStatus) {
    await this.access.requireHome(homeId, userId);
    return this.prisma.task.findMany({ where: { homeId, status }, orderBy: { dueDate: 'asc' } });
  }

  async createTask(homeId: bigint, userId: string, dto: CreateTaskDto) {
    await this.access.requireHome(homeId, userId);
    if (dto.assigneeId) await this.access.requireHomeMember(homeId, dto.assigneeId);
    return this.prisma.task.create({
      data: {
        title: dto.title,
        notes: dto.notes,
        type: dto.type,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
        recurrenceFrequency: dto.recurrenceFrequency ?? RecurrenceFrequency.NONE,
        recurrenceInterval: dto.recurrenceInterval ?? 1,
        homeId,
        roomId: dto.roomId ? BigInt(dto.roomId) : null,
        projectId: dto.projectId ? BigInt(dto.projectId) : null,
        assigneeId: dto.assigneeId ?? null,
      },
    });
  }

  async updateTask(homeId: bigint, taskId: bigint, userId: string, dto: UpdateTaskDto) {
    await this.access.requireHome(homeId, userId);
    const existing = await this.prisma.task.findFirst({ where: { id: taskId, homeId } });
    if (!existing) throw new NotFoundException('Task not found');
    const assigneeId = dto.assigneeId === undefined ? existing.assigneeId : dto.assigneeId;
    if (assigneeId) await this.access.requireHomeMember(homeId, assigneeId);

    const wasDone = existing.status === TaskStatus.DONE;



    const updated = await this.prisma.task.update({
      where: { id: taskId },
      data: {
        title: dto.title ?? existing.title,
        notes: dto.notes,
        type: dto.type ?? existing.type,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : existing.dueDate,
        status: dto.status ?? existing.status,
        recurrenceFrequency: dto.recurrenceFrequency ?? existing.recurrenceFrequency,
        recurrenceInterval: dto.recurrenceInterval ?? existing.recurrenceInterval,
        completedAt: dto.status === TaskStatus.DONE && !existing.completedAt ? new Date() : existing.completedAt,
        assigneeId,
      },
    });

    if (!wasDone && updated.status === TaskStatus.DONE && updated.recurrenceFrequency !== RecurrenceFrequency.NONE) {
      await this.prisma.task.create({
        data: {
          title: updated.title,
          notes: updated.notes,
          type: updated.type,
          status: TaskStatus.TODO,
          dueDate: this.nextDueDate(updated.dueDate, updated.recurrenceFrequency, updated.recurrenceInterval),
          recurrenceFrequency: updated.recurrenceFrequency,
          recurrenceInterval: updated.recurrenceInterval,
          homeId: updated.homeId,
          roomId: updated.roomId,
          projectId: updated.projectId,
          assigneeId: updated.assigneeId,
        },
      });
    }

    return updated;
  }

  async deleteTask(homeId: bigint, taskId: bigint, userId: string): Promise<void> {
    await this.access.requireHome(homeId, userId);
    const result = await this.prisma.task.deleteMany({ where: { id: taskId, homeId } });
    if (result.count === 0) throw new NotFoundException('Task not found');
  }

  private nextDueDate(date: Date | null, frequency: RecurrenceFrequency, interval: number): Date {
    const next = new Date(date ?? new Date());
    switch (frequency) {
      case RecurrenceFrequency.DAILY: next.setDate(next.getDate() + interval); break;
      case RecurrenceFrequency.WEEKLY: next.setDate(next.getDate() + interval * 7); break;
      case RecurrenceFrequency.MONTHLY: next.setMonth(next.getMonth() + interval); break;
      case RecurrenceFrequency.YEARLY: next.setFullYear(next.getFullYear() + interval); break;
      case RecurrenceFrequency.NONE: break;
    }
    return next;
  }
}
