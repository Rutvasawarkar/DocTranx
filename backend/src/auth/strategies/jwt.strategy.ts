import { Injectable, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { passportJwtSecret } from 'jwks-rsa';
import { ConfigService } from '@nestjs/config';

export interface JwtPayload {
  sub: string;
  email?: string;
  preferred_username?: string;
  given_name?: string;
  family_name?: string;
  realm_access?: {
    roles: string[];
  };
  resource_access?: Record<string, { roles: string[] }>;
  tenant_id?: string;
  // Extracted/normalized fields
  roles: string[];
  tenantId: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor(private configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      audience: configService.get<string>('KEYCLOAK_CLIENT_ID', 'backend-service'),
      issuer: configService.get<string>(
        'JWT_ISSUER',
        'http://localhost:8080/realms/document-platform',
      ),
      algorithms: ['RS256'],
      secretOrKeyProvider: passportJwtSecret({
        cache: true,
        rateLimit: true,
        jwksRequestsPerMinute: 10,
        jwksUri: configService.get<string>(
          'KEYCLOAK_JWKS_URI',
          'http://localhost:8080/realms/document-platform/protocol/openid-connect/certs',
        ),
      }),
    });

    this.logger.log('JWT Strategy initialized with Keycloak JWKS');
  }

  /**
   * Called after JWT is verified. Extracts and normalizes user data
   * from the Keycloak token payload.
   */
  async validate(payload: Record<string, unknown>): Promise<JwtPayload> {
    const realmAccess = payload.realm_access as { roles: string[] } | undefined;
    const roles = realmAccess?.roles || [];

    return {
      sub: payload.sub as string,
      email: payload.email as string | undefined,
      preferred_username: payload.preferred_username as string | undefined,
      given_name: payload.given_name as string | undefined,
      family_name: payload.family_name as string | undefined,
      realm_access: realmAccess,
      resource_access: payload.resource_access as Record<string, { roles: string[] }> | undefined,
      tenant_id: payload.tenant_id as string | undefined,
      // Normalized fields for easy access
      roles,
      tenantId: (payload.tenant_id as string) || 'default',
    };
  }
}
