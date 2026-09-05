import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

type Database = PostgresJsDatabase<typeof schema>;

const globalForDb = globalThis as unknown as {
  pg?: ReturnType<typeof postgres>;
  drizzle?: Database;
};

export function getDb(): Database {
  if (globalForDb.drizzle) {
    return globalForDb.drizzle;
  }

  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set");
  }

  const client =
    globalForDb.pg ??
    postgres(url, {
      max: 5,
      idle_timeout: 20,
      connect_timeout: 8,
    });

  const db = drizzle(client, { schema });
  globalForDb.pg = client;
  globalForDb.drizzle = db;
  return db;
}
