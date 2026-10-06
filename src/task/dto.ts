import { ApiProperty } from '@nestjs/swagger';
import { RecurrenceFrequency, TaskStatus, TaskType } from '@prisma/client';
import { IsDateString, IsEnum, IsInt, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class CreateTaskDto {
  @ApiProperty() @IsString() title!: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() notes?: string;
  @ApiProperty({ enum: TaskType }) @IsEnum(TaskType) type!: TaskType;
  @ApiProperty({ required: false }) @IsOptional() @IsDateString() dueDate?: string;
  @ApiProperty({ enum: RecurrenceFrequency, default: RecurrenceFrequency.NONE }) @IsOptional() @IsEnum(RecurrenceFrequency) recurrenceFrequency?: RecurrenceFrequency;
  @ApiProperty({ default: 1 }) @IsOptional() @IsInt() @Min(1) recurrenceInterval?: number;
  @ApiProperty({ required: false }) @IsOptional() roomId?: string;
  @ApiProperty({ required: false }) @IsOptional() projectId?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsUUID() assigneeId?: string;
}

export class UpdateTaskDto {
  @ApiProperty({ required: false }) @IsOptional() @IsString() title?: string;
  @ApiProperty({ type: String, required: false, nullable: true, description: 'Send null to clear' }) @IsOptional() @IsString() notes?: string | null;
  @ApiProperty({ enum: TaskType, required: false }) @IsOptional() @IsEnum(TaskType) type?: TaskType;
  @ApiProperty({ enum: TaskStatus, required: false }) @IsOptional() @IsEnum(TaskStatus) status?: TaskStatus;
  @ApiProperty({ required: false }) @IsOptional() @IsDateString() dueDate?: string;
  @ApiProperty({ enum: RecurrenceFrequency, required: false }) @IsOptional() @IsEnum(RecurrenceFrequency) recurrenceFrequency?: RecurrenceFrequency;
  @ApiProperty({ required: false }) @IsOptional() @IsInt() @Min(1) recurrenceInterval?: number;
  @ApiProperty({ required: false }) @IsOptional() roomId?: string;
  @ApiProperty({ required: false }) @IsOptional() projectId?: string;
  @ApiProperty({ type: String, required: false, nullable: true, description: 'Send null to unassign' }) @IsOptional() @IsUUID() assigneeId?: string | null;
}

export class TaskDto {
  @ApiProperty() id!: string;
  @ApiProperty() title!: string;
  @ApiProperty({ type: String, nullable: true }) notes!: string | null;
  @ApiProperty({ enum: TaskType }) type!: TaskType;
  @ApiProperty({ enum: TaskStatus }) status!: TaskStatus;
  @ApiProperty({ type: String, nullable: true, format: 'date-time' }) dueDate!: string | null;
  @ApiProperty({ type: String, nullable: true, format: 'date-time' }) completedAt!: string | null;
  @ApiProperty({ enum: RecurrenceFrequency }) recurrenceFrequency!: RecurrenceFrequency;
  @ApiProperty() recurrenceInterval!: number;
  @ApiProperty() homeId!: string;
  @ApiProperty({ type: String, nullable: true }) roomId!: string | null;
  @ApiProperty({ type: String, nullable: true }) projectId!: string | null;
  @ApiProperty({ type: String, nullable: true }) assigneeId!: string | null;
  @ApiProperty({ format: 'date-time' }) createdAt!: string;
  @ApiProperty({ format: 'date-time' }) updatedAt!: string;
}
