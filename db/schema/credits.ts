import { integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const creditAccounts = pgTable("credit_accounts", {
  userId: text("user_id").primaryKey(),
  available: integer("available").notNull(),
  held: integer("held").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});
