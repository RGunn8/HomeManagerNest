import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiQuery, ApiTags } from '@nestjs/swagger';
import { CurrentUserDecorator } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/current-user';
import { HomeDashboardDto } from './today-dto';
import { TodayService } from './today.service';

@ApiTags('today')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/homes/:homeId/today')
export class TodayController {
  constructor(private readonly today: TodayService) {}

  @Get()
  @ApiOkResponse({ type: HomeDashboardDto })
  @ApiQuery({ name: 'timezone', required: false, example: 'America/Los_Angeles' })
  getDashboard(
    @CurrentUserDecorator() user: CurrentUser,
    @Param('homeId') homeId: string,
    @Query('timezone') timezone?: string,
  ) {
    return this.today.getDashboard(BigInt(homeId), user.userId, timezone);
  }
}