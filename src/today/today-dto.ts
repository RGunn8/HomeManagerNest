import { ApiProperty } from '@nestjs/swagger';
import { InventoryTrackingMode, TaskStatus, TaskType } from '@prisma/client';

export class TaskPreviewDto {
    @ApiProperty() id!: string;
    @ApiProperty() title!: string;
    @ApiProperty({ enum: TaskType }) type!: TaskType;
    @ApiProperty({ enum: TaskStatus }) status!: TaskStatus;
    @ApiProperty({ type: String, nullable: true }) dueDate!: string | null;
}

export class InventoryPreviewDto {
    @ApiProperty() id!: string;
    @ApiProperty() name!: string;
    @ApiProperty() quantity!: number;
    @ApiProperty() minQuantity!: number;
    @ApiProperty({ enum: InventoryTrackingMode }) trackingMode!: InventoryTrackingMode;
    @ApiProperty({ description: 'Units below minQuantity; 0 for LEVEL items, which are low by status' }) belowThresholdBy!: number;
}

export class TaskGroupDto {
    @ApiProperty() total!: number;
    @ApiProperty({ type: [TaskPreviewDto] }) tasks!: TaskPreviewDto[];
}

export class TodayTaskGroupDto extends TaskGroupDto {
    @ApiProperty() open!: number;
    @ApiProperty() completed!: number;
    @ApiProperty() hasMore!: boolean;
}

export class ProjectTodayDto {
    @ApiProperty() id!: string;
    @ApiProperty() name!: string;
    @ApiProperty({ type: String, nullable: true }) room!: string | null;
    @ApiProperty({ type: String, nullable: true }) dueDate!: string | null;
    @ApiProperty() tasksTotal!: number;
    @ApiProperty() tasksCompleted!: number;
    @ApiProperty({ type: Number, nullable: true }) budgetSpent!: number | null;
    @ApiProperty({ type: Number, nullable: true }) budgetTotal!: number | null;
}

export class ShoppingTripTodayDto {
    @ApiProperty() id!: string;
    @ApiProperty() name!: string;
    @ApiProperty() pickedItems!: number;
    @ApiProperty() totalItems!: number;
    @ApiProperty({ type: [String] }) items!: string[];
}

export class HomeDashboardDto {
    @ApiProperty({ example: '2026-09-28' }) date!: string;
    @ApiProperty({ type: TaskGroupDto }) overdue!: TaskGroupDto;
    @ApiProperty({ type: TodayTaskGroupDto }) today!: TodayTaskGroupDto;
    @ApiProperty({ type: [ProjectTodayDto] }) projects!: ProjectTodayDto[];
    @ApiProperty({ type: [InventoryPreviewDto] }) lowInventory!: InventoryPreviewDto[];
    @ApiProperty({ type: [ShoppingTripTodayDto] }) shoppingTrips!: ShoppingTripTodayDto[];
}