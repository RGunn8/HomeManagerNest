import { Module } from '@nestjs/common';
import { HomeModule } from '../home/home.module';
import { TodayController } from './today.controller';
import { TodayService } from './today.service';

@Module({
  imports: [HomeModule],
  controllers: [TodayController],
  providers: [TodayService],
})
export class TodayModule {}