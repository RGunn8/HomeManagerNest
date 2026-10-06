import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiNoContentResponse, ApiOkResponse, ApiQuery, ApiTags } from '@nestjs/swagger';
import { TaskStatus } from '@prisma/client';
import { CurrentUserDecorator } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/current-user';
import { CreateTaskDto, TaskDto, UpdateTaskDto } from './dto';
import { TaskService } from './task.service';

@ApiTags('tasks')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/homes/:homeId/tasks')
export class TaskController {
  constructor(private readonly taskService: TaskService) {}

  @Get()
  @ApiQuery({ name: 'status', required: false, enum: TaskStatus })
  @ApiOkResponse({ type: [TaskDto] })
  getTasks(@CurrentUserDecorator() user: CurrentUser, @Param('homeId') homeId: string, @Query('status') status?: TaskStatus) {
    return this.taskService.getTasks(BigInt(homeId), user.userId, status);
  }

  @Post()
  @ApiCreatedResponse({ type: TaskDto })
  createTask(@CurrentUserDecorator() user: CurrentUser, @Param('homeId') homeId: string, @Body() dto: CreateTaskDto) {
    return this.taskService.createTask(BigInt(homeId), user.userId, dto);
  }

  @Patch(':taskId')
  @ApiOkResponse({ type: TaskDto })
  updateTask(@CurrentUserDecorator() user: CurrentUser, @Param('homeId') homeId: string, @Param('taskId') taskId: string, @Body() dto: UpdateTaskDto) {
    return this.taskService.updateTask(BigInt(homeId), BigInt(taskId), user.userId, dto);
  }

  @Delete(':taskId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse()
  deleteTask(@CurrentUserDecorator() user: CurrentUser, @Param('homeId') homeId: string, @Param('taskId') taskId: string) {
    return this.taskService.deleteTask(BigInt(homeId), BigInt(taskId), user.userId);
  }
}
