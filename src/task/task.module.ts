import { Module } from '@nestjs/common';
import { HomeModule } from '../home/home.module';
import { TaskController } from './task.controller';
import { TaskService } from './task.service';

@Module({
  imports: [HomeModule],
  controllers: [TaskController],
  providers: [TaskService],
})
export class TaskModule {}
