import { createInsertSchema } from "drizzle-zod";
import { sql } from "drizzle-orm";
import {
  check,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { z } from "zod/v4";
import { tasksTable } from "./tasks";

export const taskDependenciesTable = pgTable(
  "task_dependencies",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    taskId: uuid("task_id")
      .notNull()
      .references(() => tasksTable.id, { onDelete: "cascade" }),
    dependsOnTaskId: uuid("depends_on_task_id")
      .notNull()
      .references(() => tasksTable.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("task_dependencies_pair_idx").on(
      table.taskId,
      table.dependsOnTaskId,
    ),
    check(
      "task_dependencies_no_self_reference",
      sql`${table.taskId} <> ${table.dependsOnTaskId}`,
    ),
  ],
);

export const insertTaskDependencySchema = createInsertSchema(
  taskDependenciesTable,
).omit({ id: true, createdAt: true });
export type InsertTaskDependency = z.infer<typeof insertTaskDependencySchema>;
export type TaskDependency = typeof taskDependenciesTable.$inferSelect;
