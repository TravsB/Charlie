import { createInsertSchema } from "drizzle-zod";
import {
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { z } from "zod/v4";
import { tasksTable } from "./tasks";

export const executionStatusEnum = pgEnum("execution_status", [
  "queued",
  "running",
  "succeeded",
  "failed",
  "cancelled",
]);

export const executionsTable = pgTable(
  "executions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    taskId: uuid("task_id")
      .notNull()
      .references(() => tasksTable.id, { onDelete: "cascade" }),
    attempt: integer("attempt").notNull().default(1),
    idempotencyKey: text("idempotency_key").notNull(),
    status: executionStatusEnum("status").notNull().default("queued"),
    startedAt: timestamp("started_at", { withTimezone: true }),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
    errorSummary: text("error_summary"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("executions_task_id_idx").on(table.taskId),
    uniqueIndex("executions_idempotency_key_idx").on(table.idempotencyKey),
  ],
);

export const insertExecutionSchema = createInsertSchema(executionsTable).omit({
  id: true,
  createdAt: true,
});
export type InsertExecution = z.infer<typeof insertExecutionSchema>;
export type Execution = typeof executionsTable.$inferSelect;
