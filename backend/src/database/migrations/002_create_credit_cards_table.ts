import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable("credit_cards", (table) => {
    table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    table.string("name").notNullable();
    table.string("issuer").notNullable();
    table
      .enum("card_type", [
        "cashback",
        "travel",
        "business",
        "student",
        "secured",
      ])
      .notNullable();
    table.decimal("annual_fee", 10, 2).defaultTo(0);
    table.jsonb("reward_structure").notNullable().defaultTo("[]");
    table.jsonb("benefits").defaultTo("[]");
    table.jsonb("requirements").defaultTo("{}");
    table.text("description").nullable();
    table.string("image_url").nullable();
    table.string("apply_url").nullable();
    table.boolean("is_active").defaultTo(true);
    table.timestamps(true, true);

    // Indexes
    table.index("card_type");
    table.index("issuer");
    table.index("is_active");
    table.index("annual_fee");
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTable("credit_cards");
}
