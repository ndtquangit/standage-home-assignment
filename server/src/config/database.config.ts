import { registerAs } from '@nestjs/config';

export default registerAs('database', () => ({
  host: process.env.DATABASE_HOST || 'localhost',
  port: parseInt(process.env.DATABASE_PORT ?? '5432', 10),
  username: process.env.DATABASE_USERNAME || 'chatapp',
  password: process.env.DATABASE_PASSWORD || 'chatapp_password',
  database: process.env.DATABASE_NAME || 'chatapp',
}));
