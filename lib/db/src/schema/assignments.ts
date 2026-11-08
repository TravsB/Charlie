import { createInsertSchema } from "drizzle-zod";
import {
  index,
  pgEnum,
  pgTable,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { z } from "zod/v4";
import { agentsTable } from "./agents";
import { tasksTable } from "./tasks";

export const assignmentStatusEnum = pgEnum("assignment_status", [
  "assigned",
  "running",
  "completed",
  "failed",
  "cancelled",
]);

export const assignmentsTable = pgTable(
  "assignments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    taskId: uuid("task_id")
      .notNull()
      .references(() => tasksTable.id, { onDelete: "cascade" }),
    agentId: uuid("agent_id")
      .notNull()
      .references(() => agentsTable.id, { onDelete: "restrict" }),
    status: assignmentStatusEnum("status").notNull().default("assigned"),
    assignedAt: timestamp("assigned_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    startedAt: timestamp("started_at", { withTimezone: true }),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
  },
  (table) => [
    index("assignments_task_id_idx").on(table.taskId),
    index("assignments_agent_id_idx").on(table.agentId),
  ],
);

export const insertAssignmentSchema = createInsertSchema(assignmentsTable).omit({
  id: true,
  assignedAt: true,
});
export type InsertAssignment = z.infer<typeof insertAssignmentSchema>;
export type Assignment = typeof assignmentsTable.$inferSelect;
