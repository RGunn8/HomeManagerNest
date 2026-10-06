import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { createHash, randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { AcceptHomeInvitationDto, CreateHomeDto, CreateHomeInvitationDto } from './dto';
import { HomeAccessService } from './home-access.service';

const INVITATION_LIFETIME_MS = 7 * 24 * 60 * 60 * 1000;

@Injectable()
export class HomeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: HomeAccessService,
  ) {}

  getHomes(userId: string) {
    return this.prisma.home.findMany({
      where: { OR: [{ ownerId: userId }, { members: { some: { userId } } }] },
      include: { rooms: true },
    });
  }

  async inviteMember(homeId: bigint, userId: string, dto: CreateHomeInvitationDto) {
    const home = await this.access.requireHomeOwner(homeId, userId);
    const email = dto.email.trim().toLowerCase();
    const inviter = await this.prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { email: true } });
    if (email === inviter.email.toLowerCase()) throw new BadRequestException('The home owner is already a member');

    const existingUser = await this.prisma.user.findUnique({ where: { email }, select: { id: true } });
    if (existingUser) {
      const existingMembership = await this.prisma.homeMember.findUnique({
        where: { homeId_userId: { homeId, userId: existingUser.id } },
      });
      if (existingUser.id === home.ownerId || existingMembership) throw new ConflictException('User is already a home member');
    }

    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + INVITATION_LIFETIME_MS);
    const invitation = await this.prisma.homeInvitation.create({
      data: {
        email,
        tokenHash: this.hashInvitationToken(token),
        homeId,
        invitedById: userId,
        expiresAt,
      },
    });
    return { id: invitation.id.toString(), homeId: home.id.toString(), email, token, expiresAt: expiresAt.toISOString() };
  }

  async acceptInvitation(homeId: bigint, userId: string, dto: AcceptHomeInvitationDto) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { email: true } });
    const now = new Date();
    const invitation = await this.prisma.homeInvitation.findFirst({
      where: { homeId, tokenHash: this.hashInvitationToken(dto.token), acceptedAt: null, expiresAt: { gt: now } },
    });
    if (!invitation) throw new NotFoundException('Invitation not found or expired');
    if (invitation.email.toLowerCase() !== user.email.toLowerCase()) {
      throw new ForbiddenException('This invitation was sent to a different email address');
    }

    await this.prisma.$transaction(async (tx) => {
      const claimed = await tx.homeInvitation.updateMany({
        where: { id: invitation.id, acceptedAt: null, expiresAt: { gt: now } },
        data: { acceptedAt: now },
      });
      if (claimed.count !== 1) throw new ConflictException('Invitation has already been accepted');
      await tx.homeMember.upsert({
        where: { homeId_userId: { homeId, userId } },
        create: { homeId, userId },
        update: {},
      });
    });

    return { homeId: homeId.toString(), role: 'MEMBER' as const };
  }

  async getMembers(homeId: bigint, userId: string) {
    await this.access.requireHome(homeId, userId);
    const home = await this.prisma.home.findUniqueOrThrow({
      where: { id: homeId },
      select: {
        owner: { select: { id: true, email: true, firstName: true, lastName: true } },
        members: {
          include: { user: { select: { id: true, email: true, firstName: true, lastName: true } } },
          orderBy: { joinedAt: 'asc' },
        },
      },
    });
    return [
      { ...home.owner, role: 'OWNER' as const },
      ...home.members.map(({ user }) => ({ ...user, role: 'MEMBER' as const })),
    ];
  }

  async removeMember(homeId: bigint, memberUserId: string, userId: string) {
    await this.access.requireHomeOwner(homeId, userId);
    const result = await this.prisma.homeMember.deleteMany({ where: { homeId, userId: memberUserId } });
    if (result.count === 0) throw new NotFoundException('Home member not found');
  }

  async getHome(homeId: bigint, userId: string) {
    await this.access.requireHome(homeId, userId);
    return this.prisma.home.findUnique({ where: { id: homeId }, include: { rooms: true } });
  }

  createHome(userId: string, dto: CreateHomeDto) {
    return this.prisma.home.create({ data: { ...dto, ownerId: userId } });
  }

  private hashInvitationToken(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }
}
