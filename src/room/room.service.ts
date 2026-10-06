import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { HomeAccessService } from '../home/home-access.service';
import { PrismaService } from '../prisma/prisma.service';
import { TaskStatus } from '@prisma/client';
import { CreateNoteDto, CreateRoomDto, UpdateNoteDto, UpdateRoomDto } from './dto';
import { InventoryService, isLowStock } from '../inventory/inventory.service';

@Injectable()
export class RoomService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly access: HomeAccessService,
        private readonly inventoryService: InventoryService,
    ) { }

    public async getRooms(homeId: bigint, userId: string) {
      
            await this.access.requireHome(homeId, userId);
            const rooms = await this.prisma.room.findMany({
                where: { homeId },
                include: { home: true , projects: true , tasks: true , inventory:true},
            });
            
    return rooms.map((room) => ({
        roomId: room.id,
        homeId: room.homeId,
        name: room.name,
        roomEmoji: room.roomEmoji,
        openTasks: room.tasks?.filter(task => task.status == TaskStatus.TODO).length ?? 0,
        lowStockItems: room.inventory?.filter(isLowStock).length ?? 0,
        itemsTracked: room.inventory?.length ?? 0,
    }));
    
    }   

    public async getRoomById(roomId: bigint, homeId:bigint, userId: string,) {
        await this.access.requireHome(homeId, userId);
        const room = await this.prisma.room.findFirst({
            where: { id: roomId, homeId },
            include: { home: true, projects: true, tasks: true, inventory: true, notes: { orderBy: { updatedAt: 'desc' } } },
        });
        if (!room) throw new NotFoundException('Room not found');
        return {
            roomId: room.id,
            homeId: room.homeId,
            name: room.name,
            roomEmoji: room.roomEmoji,
            notes: room.notes,
            projects: room.projects?.length ?? 0,
            tasks: room.tasks?.length ?? 0,
            inventory: room.inventory?.length ?? 0,
        };
    }

    public async createRoom(homeId: bigint, userId: string, dto: CreateRoomDto) {
        await this.access.requireHome(homeId, userId);

        const projectIds = dto.tasks?.flatMap((task) => task.projectId ? [BigInt(task.projectId)] : []) ?? [];
        if (projectIds.length > 0) {
            const projects = await this.prisma.project.findMany({
                where: { homeId, id: { in: projectIds } },
                select: { id: true },
            });
            if (projects.length !== new Set(projectIds.map(String)).size) {
                throw new BadRequestException('Task projects must belong to this home');
            }
        }

        const room = await this.prisma.room.create({
            data: {
                name: dto.name,
                roomEmoji: dto.roomEmoji,
                home: { connect: { id: homeId } },
                ...(dto.tasks?.length ? {
                    tasks: {
                        create: dto.tasks.map((task) => ({
                            title: task.title,
                            notes: task.notes,
                            type: task.type,
                            dueDate: task.dueDate ? new Date(task.dueDate) : undefined,
                            recurrenceFrequency: task.recurrenceFrequency,
                            recurrenceInterval: task.recurrenceInterval,
                            home: { connect: { id: homeId } },
                            ...(task.projectId ? { project: { connect: { id: BigInt(task.projectId) } } } : {}),
                        })),
                    },
                } : {}),
                ...(dto.inventory?.length ? {
                    inventory: {
                        create: dto.inventory.map((item) => ({
                            name: item.name,
                            description: item.description,
                            category: item.category ?? 'Uncategorized',
                            quantity: item.quantity,
                            minQuantity: item.minQuantity,
                            status: item.status,
                            price: item.price,
                            tags: item.tags ?? [],
                            link: item.link,
                            trackingMode: item.trackingMode,
                            notes: item.notes,
                            stores: item.stores ?? [],
                            home: { connect: { id: homeId } },
                        })),
                    },
                } : {}),
            },
            include: { tasks: true, inventory: true },
        });
        await this.inventoryService.syncLowStockItems(homeId, room.inventory);
        return {
            roomId: room.id,
            homeId: room.homeId,
            name: room.name,
            roomEmoji: room.roomEmoji,
            createdAt: room.createdAt,
            updatedAt: room.updatedAt,
            tasks: room.tasks,
            inventory: room.inventory,
        };
    }

    public async deleteRoom(roomId: bigint, homeId: bigint, userId: string): Promise<void> {
        await this.access.requireHome(homeId, userId);
        const result = await this.prisma.room.deleteMany({
            where: { id: roomId, homeId },
        });
        if (result.count === 0) throw new NotFoundException('Room not found');
    }

    public async updateRoom(roomId: bigint, homeId: bigint, userId: string, dto: UpdateRoomDto) {
        await this.access.requireRoom(homeId, roomId, userId);
        const room = await this.prisma.room.update({
            where: { id: roomId },
            data: {
                name: dto.name,
                roomEmoji: dto.roomEmoji,
            },
        });
        return {
            roomId: room.id,
            homeId: room.homeId,
            name: room.name,
            roomEmoji: room.roomEmoji,
        };
    }

    public async getNotes(roomId: bigint, homeId: bigint, userId: string) {
        await this.access.requireRoom(homeId, roomId, userId);
        return this.prisma.note.findMany({ where: { roomId }, orderBy: { updatedAt: 'desc' } });
    }

    public async createNote(roomId: bigint, homeId: bigint, userId: string, dto: CreateNoteDto) {
        await this.access.requireRoom(homeId, roomId, userId);
        return this.prisma.note.create({ data: { content: dto.content, roomId } });
    }

    public async updateNote(noteId: bigint, roomId: bigint, homeId: bigint, userId: string, dto: UpdateNoteDto) {
        await this.access.requireRoom(homeId, roomId, userId);
        const note = await this.prisma.note.findFirst({ where: { id: noteId, roomId } });
        if (!note) throw new NotFoundException('Note not found');
        return this.prisma.note.update({ where: { id: noteId }, data: { content: dto.content } });
    }

    public async deleteNote(noteId: bigint, roomId: bigint, homeId: bigint, userId: string): Promise<void> {
        await this.access.requireRoom(homeId, roomId, userId);
        const result = await this.prisma.note.deleteMany({ where: { id: noteId, roomId } });
        if (result.count === 0) throw new NotFoundException('Note not found');
    }

    public async healthCheck(): Promise<any> {
        try {
            return 'Hello :)';
        }
        catch (error: any) {
            throw error
        }
    }
}

