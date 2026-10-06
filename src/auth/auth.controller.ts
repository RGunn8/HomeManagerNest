import { Body, Controller, Delete, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiNoContentResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/current-user';
import { CurrentUserDecorator } from './current-user.decorator';
import { JwtAuthGuard } from './jwt-auth.guard';
import { AuthService } from './auth.service';
import { AuthResponseDto, LoginDto, SignupDto } from './dto';

@ApiTags('auth')
@Controller('api/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('signup')
  @ApiCreatedResponse({ type: AuthResponseDto })
  signup(@Body() dto: SignupDto): Promise<AuthResponseDto> {
    return this.authService.signup(dto);
  }

  @Post('login')
  @ApiCreatedResponse({ type: AuthResponseDto })
  login(@Body() dto: LoginDto): Promise<AuthResponseDto> {
    return this.authService.login(dto);
  }

  @Post('demo-login')
  @ApiCreatedResponse({ type: AuthResponseDto })
  demoLogin(): Promise<AuthResponseDto> {
    return this.authService.demoLogin();
  }

  @Delete('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse({ description: 'Deletes the account. Owned homes pass to their longest-standing member, or are deleted if there is none.' })
  deleteAccount(@CurrentUserDecorator() user: CurrentUser): Promise<void> {
    return this.authService.deleteAccount(user.userId);
  }
}
