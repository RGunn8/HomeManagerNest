import { ApiProperty, OmitType, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ProjectStatus, RecurrenceFrequency, TaskStatus, TaskType } from '@prisma/client';
import { IsArray, IsBoolean, ValidateNested, IsDateString, IsEnum, IsInt, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';
import { CreateTaskDto } from '../task/dto';
import { CreateInventoryDto } from '../inventory/dto';

export class CreateProjectDto {
  @ApiProperty() @IsString() name!: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() description?: string;
  @ApiProperty({ enum: ProjectStatus, default: ProjectStatus.NOT_STARTED, required: false }) @IsOptional() @IsEnum(ProjectStatus) status?: ProjectStatus;
  @ApiProperty({ required: false }) @IsOptional() @IsNumber() estimatedCost?: number;
  @ApiProperty({ required: false, description: 'Amount spent so far' }) @IsOptional() @IsNumber() actualCost?: number;
  @ApiProperty({ required: false }) @IsOptional() roomId?: string;
  @ApiProperty({ required: false, example: '2026-12-31' }) @IsOptional() @IsDateString() targetDate?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsUUID() assigneeId?: string;
  @ApiProperty({ required: false, type: [CreateTaskDto], description: 'Tasks to create in this project; projectId is ignored and roomId defaults to the project room' })
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => CreateTaskDto) tasks?: CreateTaskDto[];
  @ApiProperty({ required: false, type: [CreateInventoryDto], description: 'Inventory items to add to the home; roomId defaults to the project room' })
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => CreateInventoryDto) createInventory?: CreateInventoryDto[];
}

export class UpdateProjectDto extends PartialType(
  OmitType(CreateProjectDto, ['assigneeId', 'tasks', 'createInventory'] as const),
) {
  @ApiProperty({ type: String, required: false, nullable: true, description: 'Send null to unassign' }) @IsOptional() @IsUUID() assigneeId?: string | null;
}

export class CreateProjectMaterialDto {
  @ApiProperty() @IsString() name!: string;
  @ApiProperty({ required: false, default: 1 }) @IsOptional() @IsInt() @Min(1) quantity?: number;
  @ApiProperty({ required: false }) @IsOptional() @IsNumber() @Min(0) unitCost?: number;
  @ApiProperty({ required: false, default: false }) @IsOptional() @IsBoolean() purchased?: boolean;
}

export class UpdateProjectMaterialDto extends PartialType(OmitType(CreateProjectMaterialDto, ['unitCost'] as const)) {
  @ApiProperty({ type: Number, required: false, nullable: true, description: 'Send null to clear' }) @IsOptional() @IsNumber() @Min(0) unitCost?: number | null;
}

export class ProjectMaterialDto {
  @ApiProperty() id!: string;
  @ApiProperty() name!: string;
  @ApiProperty() quantity!: number;
  @ApiProperty({ type: Number, nullable: true }) unitCost!: number | null;
  @ApiProperty() purchased!: boolean;
  @ApiProperty() projectId!: string;
  @ApiProperty({ format: 'date-time' }) createdAt!: string;
  @ApiProperty({ format: 'date-time' }) updatedAt!: string;
}

export class ProjectRoomResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() name!: string;
}

export class ProjectTaskResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() title!: string;
  @ApiProperty({ type: String, nullable: true }) notes!: string | null;
  @ApiProperty({ enum: TaskType }) type!: TaskType;
  @ApiProperty({ enum: TaskStatus }) status!: TaskStatus;
  @ApiProperty({ type: String, nullable: true }) dueDate!: string | null;
  @ApiProperty({ type: String, nullable: true }) completedAt!: string | null;
  @ApiProperty({ enum: RecurrenceFrequency }) recurrenceFrequency!: RecurrenceFrequency;
  @ApiProperty() recurrenceInterval!: number;
  @ApiProperty({ type: String, nullable: true }) roomId!: string | null;
  @ApiProperty({ type: String, nullable: true }) projectId!: string | null;
  @ApiProperty({ type: String, nullable: true }) assigneeId!: string | null;
}

export class ProjectResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() name!: string;
  @ApiProperty({ type: String, nullable: true }) description!: string | null;
  @ApiProperty({ enum: ProjectStatus }) status!: ProjectStatus;
  @ApiProperty({ type: String, nullable: true }) targetCompletionDate!: string | null;
  @ApiProperty({ type: String, nullable: true }) completedDate!: string | null;
  @ApiProperty({ type: Number, nullable: true }) estimatedCost!: number | null;
  @ApiProperty({ type: Number, nullable: true }) actualCost!: number | null;
  @ApiProperty() homeId!: string;
  @ApiProperty({ type: String, nullable: true }) roomId!: string | null;
  @ApiProperty({ type: String, nullable: true }) assigneeId!: string | null;
  @ApiProperty({ type: ProjectRoomResponseDto, nullable: true }) room!: ProjectRoomResponseDto | null;
  @ApiProperty({ type: [ProjectTaskResponseDto] }) tasks!: ProjectTaskResponseDto[];
  @ApiProperty({ type: [ProjectMaterialDto] }) materials!: ProjectMaterialDto[];
  @ApiProperty() createdAt!: string;
  @ApiProperty() updatedAt!: string;
}


