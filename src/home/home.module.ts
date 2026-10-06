import { Module } from '@nestjs/common';
import { HomeAccessService } from './home-access.service';
import { HomeController } from './home.controller';
import { HomeService } from './home.service';

@Module({
  controllers: [HomeController],
  providers: [HomeService, HomeAccessService],
  exports: [HomeAccessService],
})
export class HomeModule {}
