import { Injectable, NotFoundException } from '@nestjs/common';
import { InventoryItemStatus, Prisma, ProjectStatus, RecurrenceFrequency } from '@prisma/client';
import { HomeAccessService } from '../home/home-access.service';
import { InventoryService } from '../inventory/inventory.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProjectDto, CreateProjectMaterialDto, ProjectResponseDto, UpdateProjectDto, UpdateProjectMaterialDto } from './dto';

type ProjectWithRelations = Prisma.ProjectGetPayload<{
  include: { room: true; tasks: true; assignee: true; materials: true };
}>;

@Injectable()
export class ProjectService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: HomeAccessService,
    private readonly inventoryService: InventoryService,
  ) {}

  async getProjects(homeId: bigint, userId: string) {
    await this.access.requireHome(homeId, userId);
    const projects = await this.prisma.project.findMany({
      where: { homeId },
      include: { room: true, tasks: true, assignee: true, materials: { orderBy: { id: 'asc' } } },
    });
    return projects.map((project) => this.toResponse(project));
  }

  async getProject(homeId: bigint, projectId: bigint, userId: string) {
    await this.access.requireHome(homeId, userId);
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, homeId },
      include: { room: true, tasks: true, assignee: true, materials: { orderBy: { id: 'asc' } } },
    });
    if (!project) throw new NotFoundException('Project not found');
    return this.toResponse(project);
  }

  async createProject(homeId: bigint, userId: string, dto: CreateProjectDto) {
    await this.access.requireHome(homeId, userId);
    const assigneeIds = new Set([dto.assigneeId, ...(dto.tasks ?? []).map((task) => task.assigneeId)].filter((id) => id !== undefined));
    for (const assigneeId of assigneeIds) await this.access.requireHomeMember(homeId, assigneeId);
    const projectRoomId = dto.roomId ? BigInt(dto.roomId) : null;
    const roomFor = (roomId?: string) => (roomId ? BigInt(roomId) : projectRoomId);

    const { projectId, inventory } = await this.prisma.$transaction(async (tx) => {
      const project = await tx.project.create({
        data: {
          name: dto.name,
          description: dto.description,
          status: dto.status ?? ProjectStatus.NOT_STARTED,
          estimatedCost: dto.estimatedCost,
          actualCost: dto.actualCost,
          targetCompletionDate: dto.targetDate ? new Date(dto.targetDate) : null,
          roomId: projectRoomId,
          assigneeId: dto.assigneeId ?? null,
          homeId,
        },
      });
      if (dto.tasks?.length) {
        await tx.task.createMany({
          data: dto.tasks.map((task) => ({
            title: task.title,
            notes: task.notes,
            type: task.type,
            dueDate: task.dueDate ? new Date(task.dueDate) : null,
            recurrenceFrequency: task.recurrenceFrequency ?? RecurrenceFrequency.NONE,
            recurrenceInterval: task.recurrenceInterval ?? 1,
            homeId,
            roomId: roomFor(task.roomId),
            projectId: project.id,
            assigneeId: task.assigneeId ?? null,
          })),
        });
      }
      const inventory = dto.createInventory?.length
        ? await tx.inventory.createManyAndReturn({
            data: dto.createInventory.map((item) => ({
              name: item.name,
              description: item.description,
              category: item.category ?? 'Uncategorized',
              quantity: item.quantity,
              minQuantity: item.minQuantity,
              status: item.status ?? InventoryItemStatus.FULL,
              price: item.price,
              tags: item.tags ?? [],
              link: item.link,
              trackingMode: item.trackingMode,
              notes: item.notes,
              stores: item.stores ?? [],
              homeId,
              roomId: roomFor(item.roomId),
            })),
          })
        : [];
      return { projectId: project.id, inventory };
    });

    await this.inventoryService.syncLowStockItems(homeId, inventory);
    return this.getProject(homeId, projectId, userId);
  }

  async updateProject(homeId: bigint, projectId: bigint, userId: string, dto: UpdateProjectDto) {
    await this.access.requireHome(homeId, userId);
    const existing = await this.prisma.project.findFirst({ where: { id: projectId, homeId } });
    if (!existing) throw new NotFoundException('Project not found');
    if (dto.assigneeId) await this.access.requireHomeMember(homeId, dto.assigneeId);
    const project = await this.prisma.project.update({
      where: { id: projectId },
      data: {
        name: dto.name,
        description: dto.description,
        status: dto.status,
        estimatedCost: dto.estimatedCost,
        actualCost: dto.actualCost,
        targetCompletionDate: dto.targetDate ? new Date(dto.targetDate) : undefined,
        roomId: dto.roomId ? BigInt(dto.roomId) : undefined,
        assigneeId: dto.assigneeId,
      },
      include: { room: true, tasks: true, assignee: true, materials: { orderBy: { id: 'asc' } } },
    });
    return this.toResponse(project);
  }

  async deleteProject(homeId: bigint, projectId: bigint, userId: string): Promise<void> {
    await this.access.requireHome(homeId, userId);
    const result = await this.prisma.project.deleteMany({ where: { id: projectId, homeId } });
    if (result.count === 0) throw new NotFoundException('Project not found');
  }

  async addMaterial(homeId: bigint, projectId: bigint, userId: string, dto: CreateProjectMaterialDto) {
    await this.requireProject(homeId, projectId, userId);
    return this.prisma.projectMaterial.create({
      data: { name: dto.name, quantity: dto.quantity ?? 1, unitCost: dto.unitCost, purchased: dto.purchased ?? false, projectId },
    });
  }

  async updateMaterial(homeId: bigint, projectId: bigint, materialId: bigint, userId: string, dto: UpdateProjectMaterialDto) {
    await this.requireMaterial(homeId, projectId, materialId, userId);
    return this.prisma.projectMaterial.update({ where: { id: materialId }, data: { ...dto } });
  }

  async deleteMaterial(homeId: bigint, projectId: bigint, materialId: bigint, userId: string): Promise<void> {
    await this.requireMaterial(homeId, projectId, materialId, userId);
    await this.prisma.projectMaterial.delete({ where: { id: materialId } });
  }

  private async requireProject(homeId: bigint, projectId: bigint, userId: string) {
    await this.access.requireHome(homeId, userId);
    const project = await this.prisma.project.findFirst({ where: { id: projectId, homeId }, select: { id: true } });
    if (!project) throw new NotFoundException('Project not found');
  }

  private async requireMaterial(homeId: bigint, projectId: bigint, materialId: bigint, userId: string) {
    await this.requireProject(homeId, projectId, userId);
    const material = await this.prisma.projectMaterial.findFirst({ where: { id: materialId, projectId }, select: { id: true } });
    if (!material) throw new NotFoundException('Material not found');
  }

  private toResponse(project: ProjectWithRelations): ProjectResponseDto {
    return {
      id: project.id.toString(),
      name: project.name,
      description: project.description,
      status: project.status,
      targetCompletionDate: project.targetCompletionDate?.toISOString().slice(0, 10) ?? null,
      completedDate: project.completedDate?.toISOString().slice(0, 10) ?? null,
      estimatedCost: project.estimatedCost === null ? null : Number(project.estimatedCost),
      actualCost: project.actualCost === null ? null : Number(project.actualCost),
      homeId: project.homeId.toString(),
      roomId: project.roomId?.toString() ?? null,
      assigneeId: project.assigneeId,
      room: project.room ? { id: project.room.id.toString(), name: project.room.name } : null,
      tasks: project.tasks.map((task) => ({
        id: task.id.toString(),
        title: task.title,
        notes: task.notes,
        type: task.type,
        status: task.status,
        dueDate: task.dueDate?.toISOString().slice(0, 10) ?? null,
        completedAt: task.completedAt?.toISOString() ?? null,
        recurrenceFrequency: task.recurrenceFrequency,
        recurrenceInterval: task.recurrenceInterval,
        roomId: task.roomId?.toString() ?? null,
        projectId: task.projectId?.toString() ?? null,
        assigneeId: task.assigneeId,
      })),
      materials: project.materials.map((material) => ({
        id: material.id.toString(),
        name: material.name,
        quantity: material.quantity,
        unitCost: material.unitCost === null ? null : Number(material.unitCost),
        purchased: material.purchased,
        projectId: material.projectId.toString(),
        createdAt: material.createdAt.toISOString(),
        updatedAt: material.updatedAt.toISOString(),
      })),
      createdAt: project.createdAt.toISOString(),
      updatedAt: project.updatedAt.toISOString(),
    };
  }
}
