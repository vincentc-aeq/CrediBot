import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable("user_cards", (table) => {
    table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    table.uuid("user_id").references("id").inTable("users").onDelete("CASCADE");
    table
      .uuid("card_id")
      .references("id")
      .inTable("credit_cards")
      .onDelete("CASCADE");
    table.string("nickname").nullable();
    table.timestamp("date_acquired").notNullable();
    table.boolean("is_primary").defaultTo(false);
    table.boolean("is_active").defaultTo(true);
    table.timestamps(true, true);

    // Ensure unique user-card combinations
    table.unique(["user_id", "card_id"]);

    // Indexes
    table.index("user_id");
    table.index("card_id");
    table.index("is_active");
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTable("user_cards");
}
