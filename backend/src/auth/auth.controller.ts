import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtPayload } from './strategies/jwt.strategy';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  @Get('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('keycloak-jwt')
  @ApiOperation({
    summary: 'Get current user profile',
    description: 'Returns the authenticated user profile from the Keycloak JWT token.',
  })
  getProfile(@CurrentUser() user: JwtPayload) {
    return {
      id: user.sub,
      email: user.email,
      username: user.preferred_username,
      firstName: user.given_name,
      lastName: user.family_name,
      roles: user.roles,
      tenantId: user.tenantId,
    };
  }
}
