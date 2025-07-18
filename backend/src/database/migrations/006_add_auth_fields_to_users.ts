import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  return knex.schema.alterTable("users", (table) => {
    table.timestamp("last_login_at").nullable();
    table.text("refresh_token_hash").nullable();
    table.timestamp("refresh_token_expires_at").nullable();
    
    // Add indexes for performance
    table.index("last_login_at");
    table.index("refresh_token_expires_at");
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.alterTable("users", (table) => {
    table.dropColumn("last_login_at");
    table.dropColumn("refresh_token_hash");
    table.dropColumn("refresh_token_expires_at");
  });
}