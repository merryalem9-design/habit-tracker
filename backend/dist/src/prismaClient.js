"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// Creates ONE shared Prisma Client for the whole app.
// Import this same instance everywhere instead of "new PrismaClient()"
// in multiple files — multiple instances can exhaust your DB connections.
require("dotenv/config");
const client_1 = require("../generated/prisma/client"); // matches the "output" path in schema.prisma
const adapter_pg_1 = require("@prisma/adapter-pg");
// Prisma 7 requires a "driver adapter" — this is what actually opens
// the connection to Postgres, separate from the CLI's prisma.config.ts.
const adapter = new adapter_pg_1.PrismaPg({
    connectionString: process.env.DATABASE_URL,
    ssl: false, // disable SSL at the adapter level — matches how the CLI connects
});
const prisma = new client_1.PrismaClient({ adapter });
exports.default = prisma;
