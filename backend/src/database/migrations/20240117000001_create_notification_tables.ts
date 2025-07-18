import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Create notifications table
  await knex.schema.createTable('notifications', (table) => {
    table.string('id').primary();
    table.uuid('userId').notNullable();
    table.string('type').notNullable(); // NotificationType enum
    table.string('title').notNullable();
    table.text('message').notNullable();
    table.json('data').defaultTo('{}');
    table.string('channel').notNullable(); // NotificationChannel enum
    table.string('status').notNullable(); // NotificationStatus enum
    table.string('priority').notNullable(); // NotificationPriority enum
    table.string('triggeredBy').nullable();
    table.timestamp('readAt').nullable();
    table.timestamp('dismissedAt').nullable();
    table.timestamp('expiresAt').nullable();
    table.timestamps(true, true);

    // Indexes
    table.index(['userId', 'created_at']);
    table.index(['userId', 'status']);
    table.index(['userId', 'type']);
    table.index(['status', 'created_at']);
    table.index(['expiresAt']);
    table.index(['triggeredBy']);

    // Foreign key
    table.foreign('userId').references('id').inTable('users').onDelete('CASCADE');
  });

  // Create notification_preferences table
  await knex.schema.createTable('notification_preferences', (table) => {
    table.string('id').primary();
    table.uuid('userId').notNullable().unique();
    table.json('transactionSuggestions').notNullable();
    table.json('portfolioOptimization').notNullable();
    table.json('spendingAlerts').notNullable();
    table.json('rewardMilestones').notNullable();
    table.json('systemNotifications').notNullable();
    table.json('quietHours').notNullable();
    table.timestamps(true, true);

    // Foreign key
    table.foreign('userId').references('id').inTable('users').onDelete('CASCADE');
  });

  // Create notification_history table
  await knex.schema.createTable('notification_history', (table) => {
    table.string('id').primary();
    table.string('notificationId').notNullable();
    table.uuid('userId').notNullable();
    table.string('action').notNullable(); // NotificationAction enum
    table.json('metadata').nullable();
    table.timestamp('timestamp').notNullable().defaultTo(knex.fn.now());

    // Indexes
    table.index(['notificationId', 'timestamp']);
    table.index(['userId', 'action']);
    table.index(['userId', 'timestamp']);
    table.index(['action', 'timestamp']);

    // Foreign keys
    table.foreign('notificationId').references('id').inTable('notifications').onDelete('CASCADE');
    table.foreign('userId').references('id').inTable('users').onDelete('CASCADE');
  });

  // Create notification_queue table
  await knex.schema.createTable('notification_queue', (table) => {
    table.string('id').primary();
    table.string('notificationId').notNullable();
    table.uuid('userId').notNullable();
    table.string('channel').notNullable(); // NotificationChannel enum
    table.string('priority').notNullable(); // NotificationPriority enum
    table.timestamp('scheduledAt').notNullable();
    table.integer('attempts').defaultTo(0);
    table.integer('maxAttempts').defaultTo(3);
    table.timestamp('lastAttemptAt').nullable();
    table.string('status').notNullable(); // 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled'
    table.text('error').nullable();
    table.json('metadata').nullable();
    table.timestamps(true, true);

    // Indexes
    table.index(['status', 'scheduledAt']);
    table.index(['notificationId']);
    table.index(['userId', 'status']);
    table.index(['priority', 'scheduledAt']);
    table.index(['scheduledAt']);

    // Foreign keys
    table.foreign('notificationId').references('id').inTable('notifications').onDelete('CASCADE');
    table.foreign('userId').references('id').inTable('users').onDelete('CASCADE');
  });

  // Create notification_templates table (for future use)
  await knex.schema.createTable('notification_templates', (table) => {
    table.string('id').primary();
    table.string('type').notNullable(); // NotificationType enum
    table.string('name').notNullable();
    table.string('title').notNullable();
    table.text('messageTemplate').notNullable();
    table.json('channelConfigs').notNullable();
    table.json('variables').notNullable();
    table.boolean('isActive').defaultTo(true);
    table.timestamps(true, true);

    // Indexes
    table.index(['type', 'isActive']);
    table.index(['name']);
  });

  // Create notification_metrics table (for aggregated metrics)
  await knex.schema.createTable('notification_metrics', (table) => {
    table.string('id').primary();
    table.uuid('userId').nullable(); // null for system-wide metrics
    table.string('type').nullable(); // NotificationType or null for all types
    table.string('channel').nullable(); // NotificationChannel or null for all channels
    table.date('date').notNullable();
    table.string('period').notNullable(); // 'hourly', 'daily', 'weekly', 'monthly'
    table.integer('sent').defaultTo(0);
    table.integer('delivered').defaultTo(0);
    table.integer('read').defaultTo(0);
    table.integer('clicked').defaultTo(0);
    table.integer('dismissed').defaultTo(0);
    table.integer('failed').defaultTo(0);
    table.decimal('averageDeliveryTime', 10, 2).nullable(); // in milliseconds
    table.decimal('engagementRate', 5, 4).nullable(); // percentage as decimal
    table.timestamps(true, true);

    // Indexes
    table.index(['date', 'period']);
    table.index(['userId', 'date', 'period']);
    table.index(['type', 'date', 'period']);
    table.index(['channel', 'date', 'period']);
    table.unique(['userId', 'type', 'channel', 'date', 'period']);

    // Foreign key
    table.foreign('userId').references('id').inTable('users').onDelete('CASCADE');
  });

  // Create notification_experiments table (for A/B testing)
  await knex.schema.createTable('notification_experiments', (table) => {
    table.string('id').primary();
    table.string('name').notNullable();
    table.text('description').nullable();
    table.string('type').notNullable(); // experiment type
    table.json('variants').notNullable(); // experiment variants
    table.json('targetCriteria').notNullable(); // targeting rules
    table.decimal('trafficSplit', 5, 4).notNullable(); // percentage as decimal
    table.timestamp('startDate').notNullable();
    table.timestamp('endDate').nullable();
    table.string('status').notNullable(); // 'draft', 'running', 'paused', 'completed', 'cancelled'
    table.json('results').nullable();
    table.string('winningVariant').nullable();
    table.decimal('confidence', 5, 4).nullable();
    table.timestamps(true, true);

    // Indexes
    table.index(['status', 'startDate']);
    table.index(['name']);
    table.index(['type', 'status']);
  });

  // Create notification_experiment_participants table
  await knex.schema.createTable('notification_experiment_participants', (table) => {
    table.string('id').primary();
    table.string('experimentId').notNullable();
    table.uuid('userId').notNullable();
    table.string('variant').notNullable();
    table.timestamp('assignedAt').notNullable().defaultTo(knex.fn.now());
    table.boolean('isActive').defaultTo(true);

    // Indexes
    table.index(['experimentId', 'variant']);
    table.index(['userId', 'experimentId']);
    table.unique(['experimentId', 'userId']);

    // Foreign keys
    table.foreign('experimentId').references('id').inTable('notification_experiments').onDelete('CASCADE');
    table.foreign('userId').references('id').inTable('users').onDelete('CASCADE');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('notification_experiment_participants');
  await knex.schema.dropTableIfExists('notification_experiments');
  await knex.schema.dropTableIfExists('notification_metrics');
  await knex.schema.dropTableIfExists('notification_templates');
  await knex.schema.dropTableIfExists('notification_queue');
  await knex.schema.dropTableIfExists('notification_history');
  await knex.schema.dropTableIfExists('notification_preferences');
  await knex.schema.dropTableIfExists('notifications');
}