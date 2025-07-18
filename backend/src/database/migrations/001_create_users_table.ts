import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable("users", (table) => {
    table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    table.string("email").unique().notNullable();
    table.string("password_hash").notNullable();
    table.string("first_name").notNullable();
    table.string("last_name").notNullable();
    table.jsonb("preferences").defaultTo("{}");
    table.boolean("is_active").defaultTo(true);
    table.timestamp("email_verified_at").nullable();
    table.timestamps(true, true);

    // Indexes
    table.index("email");
    table.index("is_active");
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTable("users");
}
