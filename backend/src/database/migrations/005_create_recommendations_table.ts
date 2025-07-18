import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable("recommendations", (table) => {
    table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    table.uuid("user_id").references("id").inTable("users").onDelete("CASCADE");
    table
      .uuid("card_id")
      .references("id")
      .inTable("credit_cards")
      .onDelete("CASCADE");
    table
      .enum("recommendation_type", ["homepage", "transaction", "optimization"])
      .notNullable();
    table.decimal("score", 5, 4).notNullable(); // 0.0000 to 1.0000
    table.text("reasoning").nullable();
    table.decimal("projected_benefit", 10, 2).nullable();
    table
      .uuid("transaction_id")
      .references("id")
      .inTable("transactions")
      .nullable();
    table.jsonb("context").defaultTo("{}");
    table.boolean("was_clicked").defaultTo(false);
    table.boolean("was_dismissed").defaultTo(false);
    table.timestamp("clicked_at").nullable();
    table.timestamp("dismissed_at").nullable();
    table.timestamps(true, true);

    // Indexes
    table.index("user_id");
    table.index("card_id");
    table.index("recommendation_type");
    table.index("created_at");
    table.index(["user_id", "recommendation_type"]);
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTable("recommendations");
}
