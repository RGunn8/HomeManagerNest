import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiNoContentResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUserDecorator } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/current-user';
import { CreateProjectDto, CreateProjectMaterialDto, ProjectMaterialDto, ProjectResponseDto, UpdateProjectDto, UpdateProjectMaterialDto } from './dto';
import { ProjectService } from './project.service';

@ApiTags('projects')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/homes/:homeId/projects')
export class ProjectController {
  constructor(private readonly projectService: ProjectService) {}

  @Get()
  @ApiOkResponse({ type: [ProjectResponseDto] })
  getProjects(@CurrentUserDecorator() user: CurrentUser, @Param('homeId') homeId: string) {
    return this.projectService.getProjects(BigInt(homeId), user.userId);
  }

  @Get(':projectId')
  @ApiOkResponse({ type: ProjectResponseDto })
  getProject(
    @CurrentUserDecorator() user: CurrentUser,
    @Param('homeId') homeId: string,
    @Param('projectId') projectId: string,
  ) {
    return this.projectService.getProject(BigInt(homeId), BigInt(projectId), user.userId);
  }

  @Post()
  @ApiCreatedResponse({ type: ProjectResponseDto })
  createProject(@CurrentUserDecorator() user: CurrentUser, @Param('homeId') homeId: string, @Body() dto: CreateProjectDto) {
    return this.projectService.createProject(BigInt(homeId), user.userId, dto);
  }

  @Patch(':projectId')
  @ApiOkResponse({ type: ProjectResponseDto })
  updateProject(
    @CurrentUserDecorator() user: CurrentUser,
    @Param('homeId') homeId: string,
    @Param('projectId') projectId: string,
    @Body() dto: UpdateProjectDto,
  ) {
    return this.projectService.updateProject(BigInt(homeId), BigInt(projectId), user.userId, dto);
  }

  @Delete(':projectId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse()
  deleteProject(
    @CurrentUserDecorator() user: CurrentUser,
    @Param('homeId') homeId: string,
    @Param('projectId') projectId: string,
  ) {
    return this.projectService.deleteProject(BigInt(homeId), BigInt(projectId), user.userId);
  }

  @Post(':projectId/materials')
  @ApiCreatedResponse({ type: ProjectMaterialDto })
  addMaterial(
    @CurrentUserDecorator() user: CurrentUser,
    @Param('homeId') homeId: string,
    @Param('projectId') projectId: string,
    @Body() dto: CreateProjectMaterialDto,
  ) {
    return this.projectService.addMaterial(BigInt(homeId), BigInt(projectId), user.userId, dto);
  }

  @Patch(':projectId/materials/:materialId')
  @ApiOkResponse({ type: ProjectMaterialDto })
  updateMaterial(
    @CurrentUserDecorator() user: CurrentUser,
    @Param('homeId') homeId: string,
    @Param('projectId') projectId: string,
    @Param('materialId') materialId: string,
    @Body() dto: UpdateProjectMaterialDto,
  ) {
    return this.projectService.updateMaterial(BigInt(homeId), BigInt(projectId), BigInt(materialId), user.userId, dto);
  }

  @Delete(':projectId/materials/:materialId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse()
  deleteMaterial(
    @CurrentUserDecorator() user: CurrentUser,
    @Param('homeId') homeId: string,
    @Param('projectId') projectId: string,
    @Param('materialId') materialId: string,
  ) {
    return this.projectService.deleteMaterial(BigInt(homeId), BigInt(projectId), BigInt(materialId), user.userId);
  }
}
