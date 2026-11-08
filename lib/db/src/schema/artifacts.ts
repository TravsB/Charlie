import { createInsertSchema } from "drizzle-zod";
import {
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { z } from "zod/v4";
import { projectsTable } from "./projects";
import { tasksTable } from "./tasks";

export const artifactsTable = pgTable(
  "artifacts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projectsTable.id, { onDelete: "cascade" }),
    taskId: uuid("task_id").references(() => tasksTable.id, {
      onDelete: "set null",
    }),
    title: text("title").notNull(),
    artifactType: text("artifact_type").notNull(),
    storageKey: text("storage_key").notNull().unique(),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("artifacts_project_id_created_at_idx").on(
      table.projectId,
      table.createdAt,
    ),
  ],
);

export const insertArtifactSchema = createInsertSchema(artifactsTable).omit({
  id: true,
  createdAt: true,
});
export type InsertArtifact = z.infer<typeof insertArtifactSchema>;
export type Artifact = typeof artifactsTable.$inferSelect;
