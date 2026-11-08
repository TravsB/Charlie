import { createInsertSchema } from "drizzle-zod";
import {
  index,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { z } from "zod/v4";
import { agentsTable } from "./agents";
import { projectsTable } from "./projects";
import { tasksTable } from "./tasks";

export const messageTypeEnum = pgEnum("message_type", ["direct", "event"]);

export const messagesTable = pgTable(
  "messages",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projectsTable.id, { onDelete: "cascade" }),
    taskId: uuid("task_id").references(() => tasksTable.id, {
      onDelete: "set null",
    }),
    senderAgentId: uuid("sender_agent_id").references(() => agentsTable.id, {
      onDelete: "set null",
    }),
    recipientAgentId: uuid("recipient_agent_id").references(
      () => agentsTable.id,
      { onDelete: "set null" },
    ),
    type: messageTypeEnum("type").notNull(),
    content: text("content").notNull(),
    payload: jsonb("payload").$type<Record<string, unknown>>(),
    idempotencyKey: text("idempotency_key").unique(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("messages_project_id_created_at_idx").on(
      table.projectId,
      table.createdAt,
    ),
  ],
);

export const insertMessageSchema = createInsertSchema(messagesTable).omit({
  id: true,
  createdAt: true,
});
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = typeof messagesTable.$inferSelect;
