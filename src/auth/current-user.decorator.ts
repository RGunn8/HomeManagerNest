import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { CurrentUser } from '../common/current-user';

export const CurrentUserDecorator = createParamDecorator((_: unknown, ctx: ExecutionContext): CurrentUser => {
  const request = ctx.switchToHttp().getRequest<{ user: CurrentUser }>();
  return request.user;
});
