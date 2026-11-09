import { createInsertSchema } from "drizzle-zod";
import {
  index,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { z } from "zod/v4";
import { projectsTable } from "./projects";

export const providerConnectionStatusEnum = pgEnum(
  "provider_connection_status",
  ["pending", "ready", "invalid"],
);

export const providerConnectionsTable = pgTable(
  "provider_connections",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projectsTable.id, { onDelete: "cascade" }),
    providerKey: text("provider_key").notNull(),
    modelIdentifier: text("model_identifier").notNull(),
    secretRef: text("secret_ref").notNull(),
    status: providerConnectionStatusEnum("status").notNull().default("pending"),
    capabilities: jsonb("capabilities")
      .$type<string[]>()
      .notNull()
      .default([]),
    validatedAt: timestamp("validated_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex("provider_connections_project_provider_unique").on(
      table.projectId,
      table.providerKey,
    ),
    index("provider_connections_provider_key_idx").on(table.providerKey),
  ],
);

export const insertProviderConnectionSchema = createInsertSchema(
  providerConnectionsTable,
).omit({
  id: true,
  secretRef: true,
  status: true,
  capabilities: true,
  validatedAt: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertProviderConnection = z.infer<
  typeof insertProviderConnectionSchema
>;
export type ProviderConnection = typeof providerConnectionsTable.$inferSelect;
