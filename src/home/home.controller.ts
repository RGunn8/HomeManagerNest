import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/current-user';
import { CurrentUserDecorator } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import {
  AcceptHomeInvitationDto,
  AcceptHomeInvitationResponseDto,
  CreateHomeDto,
  CreateHomeInvitationDto,
  HomeDto,
  HomeInvitationDto,
  HomeMemberDto,
  HomeWithRoomsDto,
} from './dto';
import { HomeService } from './home.service';

@ApiTags('homes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/homes')
export class HomeController {
  constructor(private readonly homeService: HomeService) {}

  @Get()
  @ApiOkResponse({ type: [HomeWithRoomsDto] })
  getHomes(@CurrentUserDecorator() user: CurrentUser) {
    return this.homeService.getHomes(user.userId);
  }

  @Post()
  @ApiCreatedResponse({ type: HomeDto })
  createHome(@CurrentUserDecorator() user: CurrentUser, @Body() dto: CreateHomeDto) {
    return this.homeService.createHome(user.userId, dto);
  }

  @Post(':homeId/invitations')
  @ApiCreatedResponse({ type: HomeInvitationDto })
  inviteMember(
    @CurrentUserDecorator() user: CurrentUser,
    @Param('homeId') homeId: string,
    @Body() dto: CreateHomeInvitationDto,
  ) {
    return this.homeService.inviteMember(BigInt(homeId), user.userId, dto);
  }

  @Post(':homeId/invitations/accept')
  @ApiCreatedResponse({ type: AcceptHomeInvitationResponseDto })
  acceptInvitation(
    @CurrentUserDecorator() user: CurrentUser,
    @Param('homeId') homeId: string,
    @Body() dto: AcceptHomeInvitationDto,
  ) {
    return this.homeService.acceptInvitation(BigInt(homeId), user.userId, dto);
  }

  @Get(':homeId/members')
  @ApiOkResponse({ type: [HomeMemberDto] })
  getMembers(@CurrentUserDecorator() user: CurrentUser, @Param('homeId') homeId: string) {
    return this.homeService.getMembers(BigInt(homeId), user.userId);
  }

  @Delete(':homeId/members/:memberId')
  @ApiOkResponse({ description: 'Member removed; empty body' })
  removeMember(
    @CurrentUserDecorator() user: CurrentUser,
    @Param('homeId') homeId: string,
    @Param('memberId') memberId: string,
  ) {
    return this.homeService.removeMember(BigInt(homeId), memberId, user.userId);
  }

  @Get(':homeId')
  @ApiOkResponse({ type: HomeWithRoomsDto })
  getHome(@CurrentUserDecorator() user: CurrentUser, @Param('homeId') homeId: string) {
    return this.homeService.getHome(BigInt(homeId), user.userId);
  }
}
