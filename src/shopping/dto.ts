import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { CaptureJobStatus, ShoppingDealType, ShoppingTripItemStatus, ShoppingTripStatus } from '@prisma/client';
import { ArrayMinSize, IsArray, IsBoolean, IsEnum, IsInt, IsNumber, IsOptional, IsString, Min, ValidateIf, ValidateNested } from 'class-validator';

export class CreateShoppingTripDto {
  @ApiProperty() @IsString() name!: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() description?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsNumber() budget?: number;
}

// Line totals honor MULTI_BUY: full groups at multiBuyPrice, the rest at regularPrice ?? price.
export class ShoppingDealFieldsDto {
  @ApiProperty({ type: Number, required: false, nullable: true, description: 'Price before the deal' }) @IsOptional() @IsNumber() @Min(0) regularPrice?: number | null;
  @ApiProperty({ enum: ShoppingDealType, required: false, nullable: true, description: 'Send null to clear the deal' }) @IsOptional() @IsEnum(ShoppingDealType) dealType?: ShoppingDealType | null;
  @ApiProperty({ type: Number, required: false, nullable: true, description: 'Required for MULTI_BUY: the "3" in 3 for $5' })
  @ValidateIf((item) => item.dealType === ShoppingDealType.MULTI_BUY) @IsInt() @Min(2) multiBuyQuantity?: number | null;
  @ApiProperty({ type: Number, required: false, nullable: true, description: 'Required for MULTI_BUY: the "$5" in 3 for $5' })
  @ValidateIf((item) => item.dealType === ShoppingDealType.MULTI_BUY) @IsNumber() @Min(0) multiBuyPrice?: number | null;
}

export class AddShoppingItemDto extends ShoppingDealFieldsDto {
  @ApiProperty() @IsString() name!: string;
  @ApiProperty({ default: 1 }) @IsOptional() @IsInt() @Min(1) quantity?: number;
  @ApiProperty({ required: false, description: 'Price per item. For MULTI_BUY, items outside a full group are charged at regularPrice, falling back to this' }) @IsOptional() @IsNumber() price?: number;
}

export class AddShoppingItemsDto {
  @ApiProperty({ type: [AddShoppingItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => AddShoppingItemDto)
  items!: AddShoppingItemDto[];
}

export class CheckShoppingItemDto {
  @ApiProperty() @IsBoolean() checked!: boolean;
  @ApiProperty({ required: false }) @IsOptional() @IsNumber() price?: number;
}

export class UpdateCapturedItemDto extends ShoppingDealFieldsDto {
  @ApiProperty({ required: false }) @IsOptional() @IsString() name?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsInt() @Min(0) quantity?: number;
  @ApiProperty({ required: false }) @IsOptional() @IsNumber() price?: number;
  @ApiProperty({ enum: ShoppingTripItemStatus, required: false }) @IsOptional() @IsEnum(ShoppingTripItemStatus) status?: ShoppingTripItemStatus;
}

export class CaptureAudioDto {
  @ApiProperty({ type: 'string', format: 'binary', description: 'Recorded audio file (e.g. webm, m4a, mp3, wav)' }) audio!: unknown;
}

export class ShoppingTripItemDto {
  @ApiProperty() id!: string;
  @ApiProperty() rawTranscript!: string;
  @ApiProperty({ type: String, nullable: true }) name!: string | null;
  @ApiProperty({ type: Number, nullable: true }) quantity!: number | null;
  @ApiProperty() price!: number;
  @ApiProperty({ type: Number, nullable: true }) regularPrice!: number | null;
  @ApiProperty({ enum: ShoppingDealType, nullable: true }) dealType!: ShoppingDealType | null;
  @ApiProperty({ type: Number, nullable: true }) multiBuyQuantity!: number | null;
  @ApiProperty({ type: Number, nullable: true }) multiBuyPrice!: number | null;
  @ApiProperty({ type: Number, nullable: true }) confidence!: number | null;
  @ApiProperty({ enum: ShoppingTripItemStatus }) status!: ShoppingTripItemStatus;
  @ApiProperty({ type: String, nullable: true }) lowStockInventoryItemId!: string | null;
  @ApiProperty({ type: String, nullable: true }) inventoryItemId!: string | null;
  @ApiProperty({ type: String, nullable: true }) shoppingTripId!: string | null;
  @ApiProperty({ type: String, nullable: true }) captureJobId!: string | null;
  @ApiProperty({ format: 'date-time' }) createdAt!: string;
  @ApiProperty({ format: 'date-time' }) updatedAt!: string;
}

export class ShoppingTripDto {
  @ApiProperty() id!: string;
  @ApiProperty() name!: string;
  @ApiProperty({ type: String, nullable: true }) description!: string | null;
  @ApiProperty() runningTotal!: number;
  @ApiProperty() totalCost!: number;
  @ApiProperty() budget!: number;
  @ApiProperty({ type: String, nullable: true, format: 'date-time' }) startDate!: string | null;
  @ApiProperty({ type: String, nullable: true, format: 'date-time' }) completedDate!: string | null;
  @ApiProperty({ enum: ShoppingTripStatus }) status!: ShoppingTripStatus;
  @ApiProperty() homeId!: string;
  @ApiProperty({ format: 'date-time' }) createdAt!: string;
  @ApiProperty({ format: 'date-time' }) updatedAt!: string;
}

export class ShoppingTripWithItemsDto extends ShoppingTripDto {
  @ApiProperty({ type: [ShoppingTripItemDto] }) items!: ShoppingTripItemDto[];
}

export class ShoppingLiveItemDto {
  @ApiProperty() id!: string;
  @ApiProperty({ type: String, nullable: true }) name!: string | null;
  @ApiProperty({ enum: ShoppingTripItemStatus }) status!: ShoppingTripItemStatus;
  @ApiProperty({ type: Number, nullable: true }) quantity!: number | null;
  @ApiProperty() price!: number;
  @ApiProperty({ type: Number, nullable: true }) regularPrice!: number | null;
  @ApiProperty({ enum: ShoppingDealType, nullable: true }) dealType!: ShoppingDealType | null;
  @ApiProperty({ type: Number, nullable: true }) multiBuyQuantity!: number | null;
  @ApiProperty({ type: Number, nullable: true }) multiBuyPrice!: number | null;
}

export class ShoppingLiveStateDto {
  @ApiProperty() shoppingTripId!: string;
  @ApiProperty() name!: string;
  @ApiProperty({ enum: ShoppingTripStatus }) status!: ShoppingTripStatus;
  @ApiProperty() budgetedAmount!: number;
  @ApiProperty() checkedOffAmount!: number;
  @ApiProperty() remainingBudget!: number;
  @ApiProperty({ type: [ShoppingLiveItemDto] }) items!: ShoppingLiveItemDto[];
}

export class ShoppingCaptureJobDto {
  @ApiProperty() id!: string;
  @ApiProperty({ type: String, nullable: true }) audioRef!: string | null;
  @ApiProperty({ type: String, nullable: true }) textRef!: string | null;
  @ApiProperty() attempts!: number;
  @ApiProperty({ type: String, nullable: true }) lastError!: string | null;
  @ApiProperty({ enum: CaptureJobStatus }) status!: CaptureJobStatus;
  @ApiProperty({ type: [ShoppingTripItemDto] }) items!: ShoppingTripItemDto[];
  @ApiProperty({ format: 'date-time' }) createdAt!: string;
  @ApiProperty({ format: 'date-time' }) updatedAt!: string;
}
