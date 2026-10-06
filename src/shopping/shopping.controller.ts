import { Body, Controller, Get, MessageEvent, Param, ParseFilePipe, Patch, Post, Sse, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiCreatedResponse, ApiOkResponse, ApiProduces, ApiTags } from '@nestjs/swagger';
import { Observable } from 'rxjs';
import { CurrentUserDecorator } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/current-user';
import {
  AddShoppingItemDto,
  AddShoppingItemsDto,
  CaptureAudioDto,
  CheckShoppingItemDto,
  CreateShoppingTripDto,
  ShoppingCaptureJobDto,
  ShoppingLiveStateDto,
  ShoppingTripDto,
  ShoppingTripWithItemsDto,
  UpdateCapturedItemDto,
} from './dto';
import { ShoppingService } from './shopping.service';

@ApiTags('shopping')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/homes/:homeId/shopping-trips')
export class ShoppingController {
  constructor(private readonly shopping: ShoppingService) {}

  @Get()
  @ApiOkResponse({ type: [ShoppingTripWithItemsDto] })
  getTrips(@CurrentUserDecorator() user: CurrentUser, @Param('homeId') homeId: string) {
    return this.shopping.getTrips(BigInt(homeId), user.userId);
  }

  @Post()
  @ApiCreatedResponse({ type: ShoppingTripDto })
  createTrip(@CurrentUserDecorator() user: CurrentUser, @Param('homeId') homeId: string, @Body() dto: CreateShoppingTripDto) {
    return this.shopping.createTrip(BigInt(homeId), user.userId, dto);
  }

  @Get(':tripId/shopping-mode')
  @ApiOkResponse({ type: ShoppingLiveStateDto })
  liveState(@CurrentUserDecorator() user: CurrentUser, @Param('homeId') homeId: string, @Param('tripId') tripId: string) {
    return this.shopping.liveState(BigInt(homeId), BigInt(tripId), user.userId);
  }

  @Sse(':tripId/events')
  @ApiProduces('text/event-stream')
  @ApiOkResponse({
    description: 'Server-sent events. `shopping-trip-updated` events carry a ShoppingLiveStateDto; `heartbeat` events carry {} every 25s.',
    type: ShoppingLiveStateDto,
  })
  events(
    @CurrentUserDecorator() user: CurrentUser,
    @Param('homeId') homeId: string,
    @Param('tripId') tripId: string,
  ): Promise<Observable<MessageEvent>> {
    return this.shopping.streamTrip(BigInt(homeId), BigInt(tripId), user.userId);
  }

  @Post(':tripId/items')
  @ApiCreatedResponse({ type: ShoppingLiveStateDto })
  addItem(@CurrentUserDecorator() user: CurrentUser, @Param('homeId') homeId: string, @Param('tripId') tripId: string, @Body() dto: AddShoppingItemDto) {
    return this.shopping.addItem(BigInt(homeId), BigInt(tripId), user.userId, dto);
  }

  @Post(':tripId/items/bulk')
  @ApiCreatedResponse({ type: ShoppingLiveStateDto, description: 'Adds several items at once, e.g. ones the app parsed from voice' })
  addItems(@CurrentUserDecorator() user: CurrentUser, @Param('homeId') homeId: string, @Param('tripId') tripId: string, @Body() dto: AddShoppingItemsDto) {
    return this.shopping.addItems(BigInt(homeId), BigInt(tripId), user.userId, dto);
  }

  @Post(':tripId/start')
  @ApiCreatedResponse({ type: ShoppingLiveStateDto, description: 'NOT_STARTED or PAUSED to ACTIVE; 409 otherwise' })
  start(@CurrentUserDecorator() user: CurrentUser, @Param('homeId') homeId: string, @Param('tripId') tripId: string) {
    return this.shopping.startTrip(BigInt(homeId), BigInt(tripId), user.userId);
  }

  @Post(':tripId/pause')
  @ApiCreatedResponse({ type: ShoppingLiveStateDto, description: 'ACTIVE to PAUSED; 409 otherwise' })
  pause(@CurrentUserDecorator() user: CurrentUser, @Param('homeId') homeId: string, @Param('tripId') tripId: string) {
    return this.shopping.pauseTrip(BigInt(homeId), BigInt(tripId), user.userId);
  }

  @Patch(':tripId/items/:itemId/checked')
  @ApiOkResponse({ type: ShoppingLiveStateDto })
  checkItem(@CurrentUserDecorator() user: CurrentUser, @Param('homeId') homeId: string, @Param('tripId') tripId: string, @Param('itemId') itemId: string, @Body() dto: CheckShoppingItemDto) {
    return this.shopping.checkItem(BigInt(homeId), BigInt(tripId), BigInt(itemId), user.userId, dto);
  }

  @Post(':tripId/complete')
  @ApiCreatedResponse({ type: ShoppingLiveStateDto })
  complete(@CurrentUserDecorator() user: CurrentUser, @Param('homeId') homeId: string, @Param('tripId') tripId: string) {
    return this.shopping.completeTrip(BigInt(homeId), BigInt(tripId), user.userId);
  }

  @Post(':tripId/capture/audio')
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: CaptureAudioDto })
  @ApiCreatedResponse({ type: ShoppingCaptureJobDto, description: 'Capture job; status is FAILED with lastError set if extraction failed' })
  @UseInterceptors(FileInterceptor('audio'))
  captureAudio(@CurrentUserDecorator() user: CurrentUser, @Param('homeId') homeId: string, @Param('tripId') tripId: string, @UploadedFile(new ParseFilePipe()) audio: Express.Multer.File) {
    return this.shopping.captureAudio(BigInt(homeId), BigInt(tripId), user.userId, audio);
  }

  @Patch(':tripId/capture/items/:itemId')
  @ApiOkResponse({ type: ShoppingLiveStateDto })
  updateCapturedItem(@CurrentUserDecorator() user: CurrentUser, @Param('homeId') homeId: string, @Param('tripId') tripId: string, @Param('itemId') itemId: string, @Body() dto: UpdateCapturedItemDto) {
    return this.shopping.updateCapturedItem(BigInt(homeId), BigInt(tripId), BigInt(itemId), user.userId, dto);
  }

  @Post(':tripId/capture/:captureJobId/apply')
  @ApiCreatedResponse({
    type: ShoppingLiveStateDto,
    description: 'Accepts the reviewed capture: every item not REJECTED becomes APPLIED (checked off). Reject unwanted items first via PATCH capture/items/:itemId.',
  })
  applyCapture(@CurrentUserDecorator() user: CurrentUser, @Param('homeId') homeId: string, @Param('tripId') tripId: string, @Param('captureJobId') captureJobId: string) {
    return this.shopping.applyCaptureJob(BigInt(homeId), BigInt(tripId), BigInt(captureJobId), user.userId);
  }
}
