import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { migrate } from 'drizzle-orm/neon-http/migrator';
import '../config.js';
import { env } from '../config.js';

const sql = neon(env.DATABASE_URL);
const db  = drizzle(sql);

console.log('Running migrations…');
await migrate(db, { migrationsFolder: './drizzle' });
console.log('Migrations complete.');
process.exit(0);
