// Creates ONE shared Prisma Client for the whole app.
// Import this same instance everywhere instead of "new PrismaClient()"
// in multiple files — multiple instances can exhaust your DB connections.
import "dotenv/config";

import { PrismaClient } from "../generated/prisma/client"; // matches the "output" path in schema.prisma
import { PrismaPg } from "@prisma/adapter-pg";

// Prisma 7 requires a "driver adapter" — this is what actually opens
// the connection to Postgres, separate from the CLI's prisma.config.ts.
const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
  ssl: false, // disable SSL at the adapter level — matches how the CLI connects
});

const prisma = new PrismaClient({ adapter });

export default prisma;