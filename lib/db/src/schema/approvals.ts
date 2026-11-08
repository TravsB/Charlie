import { createInsertSchema } from "drizzle-zod";
import {
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { z } from "zod/v4";
import { tasksTable } from "./tasks";
import { usersTable } from "./users";

export const approvalStatusEnum = pgEnum("approval_status", [
  "pending",
  "approved",
  "rejected",
  "cancelled",
]);

export const approvalsTable = pgTable(
  "approvals",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    taskId: uuid("task_id")
      .notNull()
      .references(() => tasksTable.id, { onDelete: "cascade" }),
    requestedBy: uuid("requested_by").references(() => usersTable.id, {
      onDelete: "set null",
    }),
    decidedBy: uuid("decided_by").references(() => usersTable.id, {
      onDelete: "set null",
    }),
    status: approvalStatusEnum("status").notNull().default("pending"),
    reason: text("reason"),
    requestedAt: timestamp("requested_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    decidedAt: timestamp("decided_at", { withTimezone: true }),
  },
  (table) => [index("approvals_task_id_status_idx").on(table.taskId, table.status)],
);

export const insertApprovalSchema = createInsertSchema(approvalsTable).omit({
  id: true,
  requestedAt: true,
});
export type InsertApproval = z.infer<typeof insertApprovalSchema>;
export type Approval = typeof approvalsTable.$inferSelect;
