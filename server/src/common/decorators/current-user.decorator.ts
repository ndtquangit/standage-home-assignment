import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';
import { User } from '../../modules/users/entities/user.entity';

interface RequestWithUser extends Request {
  user: User;
}

/**
 * Parameter decorator that extracts the authenticated user from the request.
 *
 * @remarks
 * This decorator must be used with JwtAuthGuard to ensure the user is attached to the request.
 * Using this decorator without JwtAuthGuard will result in undefined user.
 *
 * @example
 * ```typescript
 * @Get('profile')
 * @UseGuards(JwtAuthGuard)
 * getProfile(@CurrentUser() user: User) {
 *   return user;
 * }
 * ```
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): User => {
    const request = ctx.switchToHttp().getRequest<RequestWithUser>();
    return request.user;
  },
);
