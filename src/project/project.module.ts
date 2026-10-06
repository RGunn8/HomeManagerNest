import { Module } from '@nestjs/common';
import { HomeModule } from '../home/home.module';
import { InventoryModule } from '../inventory/inventory.module';
import { ProjectController } from './project.controller';
import { ProjectService } from './project.service';

@Module({
  imports: [HomeModule, InventoryModule],
  controllers: [ProjectController],
  providers: [ProjectService],
})
export class ProjectModule {}
