import path from 'node:path';
import dotenv from 'dotenv';

// Runs inside every test worker. Real environment variables win over backend/.env.
dotenv.config({ path: path.resolve(__dirname, '../../.env'), quiet: true });
