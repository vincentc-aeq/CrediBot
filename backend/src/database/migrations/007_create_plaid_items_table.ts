import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('plaid_items', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.string('item_id', 100).notNullable().unique();
    table.text('access_token').notNullable();
    table.string('institution_id', 100).notNullable();
    table.string('institution_name', 255).notNullable();
    table.json('available_products').notNullable();
    table.json('billed_products').notNullable();
    table.json('error').nullable();
    table.timestamps(true, true);
    
    table.index(['user_id']);
    table.index(['item_id']);
    table.index(['institution_id']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('plaid_items');
}