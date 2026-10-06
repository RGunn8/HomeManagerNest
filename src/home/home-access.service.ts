import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class HomeAccessService {
  constructor(private readonly prisma: PrismaService) {}

  async requireHome(homeId: bigint, userId: string) {
    const home = await this.prisma.home.findFirst({
      where: {
        id: homeId,
        OR: [{ ownerId: userId }, { members: { some: { userId } } }],
      },
    });
    if (!home) throw new NotFoundException('Home not found');
    return home;
  }

  async requireHomeOwner(homeId: bigint, userId: string) {
    const home = await this.prisma.home.findUnique({ where: { id: homeId } });
    if (!home) throw new NotFoundException('Home not found');
    if (home.ownerId !== userId) throw new ForbiddenException('Only the home owner can manage members');
    return home;
  }

  async requireHomeMember(homeId: bigint, userId: string) {
    const isMember = await this.prisma.home.findFirst({
      where: {
        id: homeId,
        OR: [{ ownerId: userId }, { members: { some: { userId } } }],
      },
      select: { id: true },
    });
    if (!isMember) throw new BadRequestException('Assigned user must belong to this home');
  }

  async requireRoom(homeId: bigint, roomId: bigint, userId: string) {
    await this.requireHome(homeId, userId);
    const room = await this.prisma.room.findFirst({ where: { id: roomId, homeId } });
    if (!room) throw new NotFoundException('Room not found');
    return room;
  }
}
