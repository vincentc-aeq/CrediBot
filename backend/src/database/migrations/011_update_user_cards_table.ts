import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  return knex.schema.alterTable("user_cards", (table) => {
    // Rename nickname to card_nickname for consistency
    table.renameColumn("nickname", "card_nickname");
    
    // Rename date_acquired to date_obtained for consistency
    table.renameColumn("date_acquired", "date_obtained");
    
    // Add missing columns that are used in the repository
    table.decimal("credit_limit", 12, 2).nullable();
    table.decimal("current_balance", 12, 2).defaultTo(0);
    table.integer("statement_date").nullable(); // Day of month (1-31)
    table.integer("due_date").nullable(); // Day of month (1-31)
    table.text("notes").nullable();
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.alterTable("user_cards", (table) => {
    // Remove added columns
    table.dropColumn("credit_limit");
    table.dropColumn("current_balance");
    table.dropColumn("statement_date");
    table.dropColumn("due_date");
    table.dropColumn("notes");
    
    // Rename columns back
    table.renameColumn("card_nickname", "nickname");
    table.renameColumn("date_obtained", "date_acquired");
  });
}