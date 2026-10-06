import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { HomeModule } from './home/home.module';
import { InventoryModule } from './inventory/inventory.module';
import { PrismaModule } from './prisma/prisma.module';
import { ProjectModule } from './project/project.module';
import { RoomModule } from './room/room.module';
import { ShoppingModule } from './shopping/shopping.module';
import { TaskModule } from './task/task.module';
import { TodayModule } from './today/today.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    HomeModule,
    TaskModule,
    ProjectModule,
    RoomModule,
    InventoryModule,
    ShoppingModule,
    TodayModule,
  ],
})
export class AppModule {}
