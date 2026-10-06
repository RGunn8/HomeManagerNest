import { Controller, Get, HttpCode, HttpStatus, UseGuards, Param, Post, Body, Patch, Delete } from '@nestjs/common';
import { RoomService } from './room.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ApiBearerAuth, ApiCreatedResponse, ApiNoContentResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUserDecorator } from '../auth/current-user.decorator';
import { CurrentUser } from '../common/current-user';
import { CreateNoteDto, CreateRoomDto, NoteDto, RoomCreatedDto, RoomDetailDto, RoomListItemDto, RoomSummaryDto, UpdateNoteDto, UpdateRoomDto } from './dto';

@ApiTags('rooms')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/homes/:homeId/rooms')
export class RoomController {
    constructor(private readonly roomService: RoomService) { }

    @Get()
    @ApiOkResponse({ type: [RoomListItemDto] })
    getRooms(@CurrentUserDecorator() user: CurrentUser, @Param('homeId') homeId: string) {
    return this.roomService.getRooms(BigInt(homeId), user.userId);
    }

    @Get(':roomId')
    @ApiOkResponse({ type: RoomDetailDto })
    getRoom(
    @CurrentUserDecorator() user: CurrentUser,
    @Param('homeId') homeId: string,
    @Param('roomId') roomId: string,
    ) {
    return this.roomService.getRoomById(BigInt(roomId), BigInt(homeId), user.userId);
    }

    @Post()
    @ApiCreatedResponse({ type: RoomCreatedDto })
    createRoom(
    @CurrentUserDecorator() user: CurrentUser,
    @Param('homeId') homeId: string,
    @Body() dto: CreateRoomDto,
    ) {
    return this.roomService.createRoom(BigInt(homeId), user.userId, dto);
    }

    @Patch(':roomId')
    @ApiOkResponse({ type: RoomSummaryDto })
    updateRoom(
    @CurrentUserDecorator() user: CurrentUser,
    @Param('homeId') homeId: string,
    @Param('roomId') roomId: string,
    @Body() dto: UpdateRoomDto,
    ) {
    return this.roomService.updateRoom(BigInt(roomId), BigInt(homeId), user.userId, dto);
    }

    @Delete(':roomId')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiNoContentResponse()
    deleteRoom(
    @CurrentUserDecorator() user: CurrentUser,
    @Param('homeId') homeId: string,
    @Param('roomId') roomId: string,
    ) {
    return this.roomService.deleteRoom(BigInt(roomId), BigInt(homeId), user.userId);
    }

    @Get(':roomId/notes')
    @ApiOkResponse({ type: [NoteDto] })
    getNotes(
    @CurrentUserDecorator() user: CurrentUser,
    @Param('homeId') homeId: string,
    @Param('roomId') roomId: string,
    ) {
    return this.roomService.getNotes(BigInt(roomId), BigInt(homeId), user.userId);
    }

    @Post(':roomId/notes')
    @ApiCreatedResponse({ type: NoteDto })
    createNote(
    @CurrentUserDecorator() user: CurrentUser,
    @Param('homeId') homeId: string,
    @Param('roomId') roomId: string,
    @Body() dto: CreateNoteDto,
    ) {
    return this.roomService.createNote(BigInt(roomId), BigInt(homeId), user.userId, dto);
    }

    @Patch(':roomId/notes/:noteId')
    @ApiOkResponse({ type: NoteDto })
    updateNote(
    @CurrentUserDecorator() user: CurrentUser,
    @Param('homeId') homeId: string,
    @Param('roomId') roomId: string,
    @Param('noteId') noteId: string,
    @Body() dto: UpdateNoteDto,
    ) {
    return this.roomService.updateNote(BigInt(noteId), BigInt(roomId), BigInt(homeId), user.userId, dto);
    }

    @Delete(':roomId/notes/:noteId')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiNoContentResponse()
    deleteNote(
    @CurrentUserDecorator() user: CurrentUser,
    @Param('homeId') homeId: string,
    @Param('roomId') roomId: string,
    @Param('noteId') noteId: string,
    ) {
    return this.roomService.deleteNote(BigInt(noteId), BigInt(roomId), BigInt(homeId), user.userId);
    }
}
