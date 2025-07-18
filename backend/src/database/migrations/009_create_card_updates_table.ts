import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('card_updates', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('credit_card_id').notNullable().references('id').inTable('credit_cards').onDelete('CASCADE');
    table.string('update_type', 50).notNullable(); // 'annual_fee', 'reward_structure', 'benefits', 'requirements', 'status'
    table.text('old_value').nullable();
    table.text('new_value').nullable();
    table.text('description').nullable();
    table.uuid('updated_by').nullable().references('id').inTable('users').onDelete('SET NULL');
    table.timestamp('effective_date').nullable();
    table.boolean('is_active').notNullable().defaultTo(true);
    table.timestamps(true, true);
    
    table.index(['credit_card_id']);
    table.index(['update_type']);
    table.index(['effective_date']);
    table.index(['is_active']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('card_updates');
}