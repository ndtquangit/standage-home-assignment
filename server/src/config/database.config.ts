import { registerAs } from '@nestjs/config';

/**
 * Database Configuration
 *
 * SECURITY: In production, all database credentials must be set via environment variables.
 * Default values are only provided for local development convenience.
 */
export default registerAs('database', () => {
  const isProduction = process.env.NODE_ENV === 'production';

  // Fail fast in production if required env vars are missing
  if (isProduction) {
    const required = ['DATABASE_HOST', 'DATABASE_USERNAME', 'DATABASE_PASSWORD', 'DATABASE_NAME'];
    const missing = required.filter((key) => !process.env[key]);

    if (missing.length > 0) {
      throw new Error(
        `SECURITY ERROR: Missing required database environment variables in production: ${missing.join(', ')}. ` +
        'Set these via environment variables or secrets management.',
      );
    }
  }

  return {
    // Development defaults (NOT for production!)
    host: process.env.DATABASE_HOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT ?? '5432', 10),
    username: process.env.DATABASE_USERNAME || 'chatapp',
    password: process.env.DATABASE_PASSWORD || 'chatapp_password',
    database: process.env.DATABASE_NAME || 'chatapp',
  };
});
