import { createInsertSchema } from "drizzle-zod";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { z } from "zod/v4";
import { teamsTable } from "./teams";

export const agentRoleEnum = pgEnum("agent_role", [
  "team_leader",
  "researcher",
  "analyst",
  "creator",
  "developer",
  "critic",
]);

export const agentStatusEnum = pgEnum("agent_status", [
  "idle",
  "working",
  "paused",
  "disabled",
]);

export const agentsTable = pgTable(
  "agents",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    teamId: uuid("team_id")
      .notNull()
      .references(() => teamsTable.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    role: agentRoleEnum("role").notNull(),
    instructions: text("instructions").notNull().default(""),
    providerKey: text("provider_key"),
    modelIdentifier: text("model_identifier"),
    capabilities: jsonb("capabilities")
      .$type<string[]>()
      .notNull()
      .default([]),
    tools: jsonb("tools").$type<string[]>().notNull().default([]),
    permissions: jsonb("permissions")
      .$type<Record<string, boolean>>()
      .notNull()
      .default({}),
    status: agentStatusEnum("status").notNull().default("idle"),
    maxRetries: integer("max_retries").notNull().default(2),
    timeoutSeconds: integer("timeout_seconds").notNull().default(180),
    requiresReview: boolean("requires_review").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [index("agents_team_id_idx").on(table.teamId)],
);

export const insertAgentSchema = createInsertSchema(agentsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertAgent = z.infer<typeof insertAgentSchema>;
export type Agent = typeof agentsTable.$inferSelect;
