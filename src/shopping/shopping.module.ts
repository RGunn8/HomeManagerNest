import { Module } from '@nestjs/common';
import { HomeModule } from '../home/home.module';
import { GroceryExtractionService } from './grocery-extraction.service';
import { ShoppingController } from './shopping.controller';
import { ShoppingService } from './shopping.service';

@Module({
  imports: [HomeModule],
  controllers: [ShoppingController],
  providers: [ShoppingService, GroceryExtractionService],
})
export class ShoppingModule {}
