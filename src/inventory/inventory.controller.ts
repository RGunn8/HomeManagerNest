import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiNoContentResponse, ApiOkResponse, ApiQuery, ApiTags } from '@nestjs/swagger';
import { CurrentUserDecorator } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/current-user';
import { CreateInventoryDto, InventoryAutocompleteDto, InventoryCategoryGroupDto, InventoryDto, UpdateInventoryDto } from './dto';
import { InventoryService } from './inventory.service';

@ApiTags('inventory')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/homes/:homeId/inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get()
  @ApiOkResponse({ type: [InventoryCategoryGroupDto], description: 'Inventory grouped by category' })
  getInventory(@CurrentUserDecorator() user: CurrentUser, @Param('homeId') homeId: string) {
    return this.inventoryService.getInventory(BigInt(homeId), user.userId);
  }

  @Get('autocomplete')
  @ApiQuery({ name: 'query', required: false, example: 'detergent' })
  @ApiOkResponse({ type: [InventoryAutocompleteDto] })
  autocomplete(
    @CurrentUserDecorator() user: CurrentUser,
    @Param('homeId') homeId: string,
    @Query('query') query?: string,
  ) {
    return this.inventoryService.autocomplete(BigInt(homeId), user.userId, query ?? '');
  }

  @Get(':inventoryId')
  @ApiOkResponse({ type: InventoryDto })
  getInventoryItem(@CurrentUserDecorator() user: CurrentUser, @Param('homeId') homeId: string, @Param('inventoryId') inventoryId: string) {
    return this.inventoryService.getInventoryItem(BigInt(homeId), BigInt(inventoryId), user.userId);
  }

  @Post()
  @ApiCreatedResponse({ type: InventoryDto })
  createInventory(@CurrentUserDecorator() user: CurrentUser, @Param('homeId') homeId: string, @Body() dto: CreateInventoryDto) {
    return this.inventoryService.createInventory(BigInt(homeId), user.userId, dto);
  }

  @Patch(':inventoryId')
  @ApiOkResponse({ type: InventoryDto })
  updateInventory(@CurrentUserDecorator() user: CurrentUser, @Param('homeId') homeId: string, @Param('inventoryId') inventoryId: string, @Body() dto: UpdateInventoryDto) {
    return this.inventoryService.updateInventory(BigInt(homeId), BigInt(inventoryId), user.userId, dto);
  }

  @Delete(':inventoryId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse()
  deleteInventory(@CurrentUserDecorator() user: CurrentUser, @Param('homeId') homeId: string, @Param('inventoryId') inventoryId: string) {
    return this.inventoryService.deleteInventory(BigInt(homeId), BigInt(inventoryId), user.userId);
  }
}
