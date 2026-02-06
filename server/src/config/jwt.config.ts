import { registerAs } from '@nestjs/config';

/**
 * JWT Configuration
 *
 * SECURITY: JWT_SECRET is required and must be set via environment variable.
 * In development, a default is used for convenience.
 * In production, the application will fail to start without a proper secret.
 */
export default registerAs('jwt', () => {
  const isProduction = process.env.NODE_ENV === 'production';
  const secret = process.env.JWT_SECRET;

  // Fail fast in production if JWT_SECRET is not set
  if (isProduction && !secret) {
    throw new Error(
      'SECURITY ERROR: JWT_SECRET environment variable is required in production. ' +
        'Generate a secure random string (min 32 characters) and set it via environment variable.',
    );
  }

  return {
    // In development, use a default for convenience (NOT for production!)
    secret: secret || 'dev-only-secret-do-not-use-in-production',
    expiresIn: process.env.JWT_EXPIRATION || '7d',
  };
});
