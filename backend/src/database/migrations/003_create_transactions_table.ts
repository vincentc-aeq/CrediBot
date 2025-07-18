import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable("transactions", (table) => {
    table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    table.uuid("user_id").references("id").inTable("users").onDelete("CASCADE");
    table.decimal("amount", 12, 2).notNullable();
    table
      .enum("category", [
        "groceries",
        "dining",
        "travel",
        "gas",
        "shopping",
        "utilities",
        "entertainment",
        "healthcare",
        "other",
      ])
      .notNullable();
    table.string("merchant").notNullable();
    table.string("description").nullable();
    table.timestamp("transaction_date").notNullable();
    table.uuid("card_used").references("id").inTable("credit_cards").nullable();
    table.string("plaid_transaction_id").unique().nullable();
    table.jsonb("metadata").defaultTo("{}");
    table.timestamps(true, true);

    // Indexes
    table.index("user_id");
    table.index("category");
    table.index("transaction_date");
    table.index("plaid_transaction_id");
    table.index(["user_id", "transaction_date"]);
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTable("transactions");
}
