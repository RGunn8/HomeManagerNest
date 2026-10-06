import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { AuthResponseDto, LoginDto, SignupDto } from './dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  async signup(dto: SignupDto): Promise<AuthResponseDto> {
    const email = dto.email.trim().toLowerCase();
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) throw new BadRequestException('Email is already registered');

    const user = await this.prisma.user.create({
      data: {
        email,
        passwordHash: await bcrypt.hash(dto.password, 10),
        firstName: dto.firstName?.trim() || null,
        lastName: dto.lastName?.trim() || null,
      },
    });

    return this.authResponse(user.id, user.email);
  }

  async login(dto: LoginDto): Promise<AuthResponseDto> {
    const email = dto.email.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user?.passwordHash) throw new UnauthorizedException('Invalid email or password');

    const matches = await bcrypt.compare(dto.password, user.passwordHash);
    if (!matches) throw new UnauthorizedException('Invalid email or password');

    return this.authResponse(user.id, user.email);
  }

  // Owned homes pass to their longest-standing member, or are deleted if there is none.
  async deleteAccount(userId: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const ownedHomes = await tx.home.findMany({
        where: { ownerId: userId },
        select: { id: true, members: { where: { userId: { not: userId } }, orderBy: { joinedAt: 'asc' }, take: 1 } },
      });
      for (const home of ownedHomes) {
        const successor = home.members[0];
        if (!successor) {
          await tx.home.delete({ where: { id: home.id } });
          continue;
        }
        await tx.home.update({ where: { id: home.id }, data: { ownerId: successor.userId } });
        // Owners are implicit members, so the successor no longer needs a membership row.
        await tx.homeMember.delete({ where: { homeId_userId: { homeId: home.id, userId: successor.userId } } });
      }
      await tx.user.delete({ where: { id: userId } });
    });
  }

  async demoLogin(): Promise<AuthResponseDto> {
    const email = this.config.get<string>('DEMO_EMAIL') ?? 'demo@homemanager.app';
    let user = await this.prisma.user.findUnique({ where: { email } });

    if (!user) {
      user = await this.prisma.user.create({
        data: {
          email,
          passwordHash: await bcrypt.hash('DemoPassword123!', 10),
          firstName: 'Demo',
          lastName: 'User',
          homes: {
            create: {
              name: 'Demo Home',
              rooms: { create: [{ name: 'Kitchen' }, { name: 'Garage' }] },
            },
          },
        },
      });
    }

    return this.authResponse(user.id, user.email);
  }

  private authResponse(userId: string, email: string): AuthResponseDto {
    const expiresInSeconds = Number(this.config.get<string>('JWT_EXPIRES_IN') ?? '0');
    const payload = { sub: userId.toString(), email };
    return {
      accessToken: expiresInSeconds > 0
        ? this.jwtService.sign(payload, { expiresIn: expiresInSeconds })
        : this.jwtService.sign(payload),
      tokenType: 'Bearer',
    };
  }
}
