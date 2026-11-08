import { createInsertSchema } from "drizzle-zod";
import {
  index,
  integer,
  numeric,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { z } from "zod/v4";
import { agentsTable } from "./agents";
import { executionsTable } from "./executions";

export const usageRecordsTable = pgTable(
  "usage_records",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    executionId: uuid("execution_id")
      .notNull()
      .references(() => executionsTable.id, { onDelete: "cascade" }),
    agentId: uuid("agent_id").references(() => agentsTable.id, {
      onDelete: "set null",
    }),
    providerName: text("provider_name"),
    modelIdentifier: text("model_identifier"),
    inputTokens: integer("input_tokens").notNull().default(0),
    outputTokens: integer("output_tokens").notNull().default(0),
    estimatedCost: numeric("estimated_cost", { precision: 14, scale: 8 })
      .notNull()
      .default("0"),
    currency: text("currency").notNull().default("USD"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("usage_records_execution_id_idx").on(table.executionId)],
);

export const insertUsageRecordSchema = createInsertSchema(
  usageRecordsTable,
).omit({ id: true, createdAt: true });
export type InsertUsageRecord = z.infer<typeof insertUsageRecordSchema>;
export type UsageRecord = typeof usageRecordsTable.$inferSelect;
