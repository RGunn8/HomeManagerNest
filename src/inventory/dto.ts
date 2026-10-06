import { ApiProperty } from '@nestjs/swagger';
import { InventoryItemStatus, InventoryTrackingMode } from '@prisma/client';
import { IsArray, IsEnum, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, IsUrl, MaxLength, Min } from 'class-validator';

export class CreateInventoryDto {
  @ApiProperty() @IsString() name!: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() description?: string;
  @ApiProperty({ required: false, default: 'Uncategorized' }) @IsOptional() @IsString() @IsNotEmpty() @MaxLength(80) category?: string;
  @ApiProperty() @IsInt() @Min(0) quantity!: number;
  @ApiProperty() @IsInt() @Min(0) minQuantity!: number;
  @ApiProperty({ enum: InventoryItemStatus, default: InventoryItemStatus.FULL, required: false }) @IsOptional() @IsEnum(InventoryItemStatus) status?: InventoryItemStatus;
  @ApiProperty({ required: false }) @IsOptional() @IsNumber() price?: number;
  @ApiProperty({ required: false, type: [String] }) @IsOptional() @IsArray() tags?: string[];
  @ApiProperty({ required: false }) @IsOptional() @IsUrl() link?: string;
  @ApiProperty({ enum: InventoryTrackingMode, default: InventoryTrackingMode.COUNT, required: false, description: 'COUNT uses quantity/minQuantity, LEVEL uses status, NONE is never low stock' }) @IsOptional() @IsEnum(InventoryTrackingMode) trackingMode?: InventoryTrackingMode;
  @ApiProperty({ required: false }) @IsOptional() @IsString() notes?: string;
  @ApiProperty({ required: false, type: [String] }) @IsOptional() @IsArray() @IsString({ each: true }) stores?: string[];
  @ApiProperty({ required: false }) @IsOptional() roomId?: string;
}

export class UpdateInventoryDto {
  @ApiProperty({ required: false }) @IsOptional() @IsString() name?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() description?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() @IsNotEmpty() @MaxLength(80) category?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsInt() @Min(0) quantity?: number;
  @ApiProperty({ required: false }) @IsOptional() @IsInt() @Min(0) minQuantity?: number;
  @ApiProperty({ enum: InventoryItemStatus, required: false }) @IsOptional() @IsEnum(InventoryItemStatus) status?: InventoryItemStatus;
  @ApiProperty({ required: false }) @IsOptional() @IsNumber() price?: number;
  @ApiProperty({ required: false, type: [String] }) @IsOptional() @IsArray() tags?: string[];
  @ApiProperty({ required: false }) @IsOptional() @IsUrl() link?: string;
  @ApiProperty({ enum: InventoryTrackingMode, default: InventoryTrackingMode.COUNT, required: false, description: 'COUNT uses quantity/minQuantity, LEVEL uses status, NONE is never low stock' }) @IsOptional() @IsEnum(InventoryTrackingMode) trackingMode?: InventoryTrackingMode;
  @ApiProperty({ required: false }) @IsOptional() @IsString() notes?: string;
  @ApiProperty({ required: false, type: [String] }) @IsOptional() @IsArray() @IsString({ each: true }) stores?: string[];
}

export class InventoryDto {
  @ApiProperty() id!: string;
  @ApiProperty() name!: string;
  @ApiProperty({ type: String, nullable: true }) description!: string | null;
  @ApiProperty() category!: string;
  @ApiProperty() quantity!: number;
  @ApiProperty() minQuantity!: number;
  @ApiProperty({ enum: InventoryItemStatus }) status!: InventoryItemStatus;
  @ApiProperty({ enum: InventoryTrackingMode }) trackingMode!: InventoryTrackingMode;
  @ApiProperty({ type: Number, nullable: true }) price!: number | null;
  @ApiProperty({ type: String, nullable: true }) link!: string | null;
  @ApiProperty({ type: String, nullable: true, format: 'date-time' }) lastPurchaseDate!: string | null;
  @ApiProperty({ type: String, nullable: true, format: 'date-time' }) expiresDate!: string | null;
  @ApiProperty({ type: [String] }) tags!: string[];
  @ApiProperty({ type: String, nullable: true }) notes!: string | null;
  @ApiProperty({ type: [String] }) stores!: string[];
  @ApiProperty() homeId!: string;
  @ApiProperty({ type: String, nullable: true }) roomId!: string | null;
  @ApiProperty({ format: 'date-time' }) createdAt!: string;
  @ApiProperty({ format: 'date-time' }) updatedAt!: string;
}

export class InventoryCategoryGroupDto {
  @ApiProperty() category!: string;
  @ApiProperty({ type: [InventoryDto] }) items!: InventoryDto[];
}

export class InventoryAutocompleteDto {
  @ApiProperty() id!: string;
  @ApiProperty() name!: string;
  @ApiProperty() category!: string;
  @ApiProperty() quantity!: number;
  @ApiProperty() minQuantity!: number;
}
