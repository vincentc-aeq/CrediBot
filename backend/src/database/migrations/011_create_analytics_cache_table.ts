import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable("analytics_cache", (table) => {
    table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    table.uuid("user_id").references("id").inTable("users").onDelete("CASCADE");
    table
      .enum("analytics_type", [
        "spending",
        "cardPerformance",
        "portfolio",
        "system",
      ])
      .notNullable();
    table
      .enum("timeframe", ["day", "week", "month", "quarter", "year"])
      .notNullable();
    table.timestamp("start_date").notNullable();
    table.timestamp("end_date").notNullable();
    table.jsonb("cache_data").notNullable();
    table.timestamp("expires_at").notNullable();
    table.timestamps(true, true);

    // Indexes
    table.index("user_id");
    table.index("analytics_type");
    table.index("expires_at");
    table.index(["user_id", "analytics_type", "timeframe"]);
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTable("analytics_cache");
}
