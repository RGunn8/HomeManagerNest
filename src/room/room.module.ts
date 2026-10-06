import { Module } from '@nestjs/common';
import { HomeModule } from '../home/home.module';
import { InventoryModule } from '../inventory/inventory.module';
import { RoomService } from './room.service';
import { RoomController } from './room.controller';

@Module({
    imports: [HomeModule, InventoryModule],
    providers: [RoomService],
    controllers: [RoomController],
})
export class RoomModule { }