import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';

/**
 * Decorator to specify which roles are required to access an endpoint.
 * Uses Keycloak realm roles from the JWT token.
 *
 * @example
 * @Roles('admin', 'editor')
 * @Get('protected')
 * getProtectedResource() { ... }
 */
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
