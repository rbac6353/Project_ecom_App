import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Custom decorator to extract the current user from the request
 * Usage: @CurrentUser() user: User
 *
 * Can also extract specific properties:
 * @CurrentUser('id') userId: number
 * @CurrentUser('email') email: string
 */
export const CurrentUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;

    // If no user, return undefined
    if (!user) {
      return undefined;
    }

    // If data (property name) is provided, return that specific property
    return data ? user[data] : user;
  },
);
