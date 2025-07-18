import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('audit_logs', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('entity_type', 50).notNullable(); // 'credit_card', 'user_card', 'user', etc.
    table.uuid('entity_id').notNullable();
    table.string('action', 50).notNullable(); // 'create', 'update', 'delete', 'view'
    table.uuid('user_id').nullable().references('id').inTable('users').onDelete('SET NULL');
    table.text('old_values').nullable(); // JSON string of old values
    table.text('new_values').nullable(); // JSON string of new values
    table.text('changes').nullable(); // JSON string of changed fields
    table.string('ip_address', 45).nullable();
    table.string('user_agent', 500).nullable();
    table.text('description').nullable();
    table.json('metadata').nullable(); // Additional context information
    table.timestamps(true, true);
    
    table.index(['entity_type', 'entity_id']);
    table.index(['action']);
    table.index(['user_id']);
    table.index(['created_at']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('audit_logs');
}