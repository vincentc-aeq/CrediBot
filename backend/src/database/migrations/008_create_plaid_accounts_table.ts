import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('plaid_accounts', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.uuid('plaid_item_id').notNullable().references('id').inTable('plaid_items').onDelete('CASCADE');
    table.string('account_id', 100).notNullable().unique();
    table.string('name', 255).notNullable();
    table.string('official_name', 255).nullable();
    table.string('type', 50).notNullable();
    table.string('subtype', 50).nullable();
    table.string('mask', 10).nullable();
    table.decimal('balance_available', 15, 2).nullable();
    table.decimal('balance_current', 15, 2).nullable();
    table.decimal('balance_limit', 15, 2).nullable();
    table.string('iso_currency_code', 3).nullable();
    table.boolean('is_active').notNullable().defaultTo(true);
    table.timestamp('last_synced_at').nullable();
    table.timestamps(true, true);
    
    table.index(['user_id']);
    table.index(['plaid_item_id']);
    table.index(['account_id']);
    table.index(['type']);
    table.index(['is_active']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('plaid_accounts');
}