import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsNotEmpty, IsOptional, IsString, ValidateNested } from 'class-validator';
import { CreateTaskDto, TaskDto } from '../task/dto';
import { CreateInventoryDto, InventoryDto } from '../inventory/dto';

export class CreateRoomDto {
    @ApiProperty({ required: true })
    @IsString()
    name!: string;

    @ApiProperty({ required: true })
    @IsString()
    roomEmoji!: string ;

    @ApiProperty({ required: false, type: [CreateTaskDto], description: 'Tasks to create in this room' })
    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => CreateTaskDto)
    tasks?: CreateTaskDto[];

    @ApiProperty({ required: false, type: [CreateInventoryDto], description: 'Inventory items to create in this room' })
    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => CreateInventoryDto)
    inventory?: CreateInventoryDto[];
}

export class UpdateRoomDto {
    @ApiProperty({ required: false })
    @IsOptional()
    @IsString()
    name?: string;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsString()
    roomEmoji?: string ;
}

export class CreateNoteDto {
    @ApiProperty({ required: true })
    @IsString()
    @IsNotEmpty()
    content!: string;
}

export class UpdateNoteDto extends CreateNoteDto {}
export class NoteDto {
    @ApiProperty() id!: string;
    @ApiProperty() content!: string;
    @ApiProperty() roomId!: string;
    @ApiProperty({ format: 'date-time' }) createdAt!: string;
    @ApiProperty({ format: 'date-time' }) updatedAt!: string;
}

export class RoomSummaryDto {
    @ApiProperty() roomId!: string;
    @ApiProperty() homeId!: string;
    @ApiProperty() name!: string;
    @ApiProperty({ type: String, nullable: true }) roomEmoji!: string | null;
}

export class RoomListItemDto extends RoomSummaryDto {
    @ApiProperty() openTasks!: number;
    @ApiProperty() lowStockItems!: number;
    @ApiProperty() itemsTracked!: number;
}

export class RoomDetailDto extends RoomSummaryDto {
    @ApiProperty({ type: [NoteDto], description: 'Notes in the room, newest first' }) notes!: NoteDto[];
    @ApiProperty({ description: 'Number of projects in the room' }) projects!: number;
    @ApiProperty({ description: 'Number of tasks in the room' }) tasks!: number;
    @ApiProperty({ description: 'Number of inventory items in the room' }) inventory!: number;
}

export class RoomCreatedDto extends RoomSummaryDto {
    @ApiProperty({ format: 'date-time' }) createdAt!: string;
    @ApiProperty({ format: 'date-time' }) updatedAt!: string;
    @ApiProperty({ type: [TaskDto] }) tasks!: TaskDto[];
    @ApiProperty({ type: [InventoryDto] }) inventory!: InventoryDto[];
}
