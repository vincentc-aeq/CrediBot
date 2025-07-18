import { Knex } from 'knex';
import database from '../database/connection';
import { BaseRepository } from './BaseRepository';
import { 
  AuditLog, 
  CreateAuditLogData, 
  AuditLogFilters,
  AuditLogWithUser,
  AuditLogSummary,
  AuditAction
} from '../models/AuditLog';

export class AuditLogRepository extends BaseRepository<AuditLog> {
  constructor() {
    super('audit_logs');
  }

  /**
   * 創建審計日誌記錄
   */
  async createAuditLog(data: CreateAuditLogData): Promise<AuditLog> {
    const [auditLog] = await this.db(this.tableName)
      .insert({
        entity_type: data.entityType,
        entity_id: data.entityId,
        action: data.action,
        user_id: data.userId,
        old_values: data.oldValues ? JSON.stringify(data.oldValues) : null,
        new_values: data.newValues ? JSON.stringify(data.newValues) : null,
        changes: data.changes ? JSON.stringify(data.changes) : null,
        ip_address: data.ipAddress,
        user_agent: data.userAgent,
        description: data.description,
        metadata: data.metadata ? JSON.stringify(data.metadata) : null,
      })
      .returning('*');

    return this.mapFromDb(auditLog);
  }

  /**
   * 根據實體查找審計日誌
   */
  async findByEntity(entityType: string, entityId: string): Promise<AuditLog[]> {
    const logs = await this.db(this.tableName)
      .where({ entity_type: entityType, entity_id: entityId })
      .orderBy('created_at', 'desc');

    return logs.map(this.mapFromDb);
  }

  /**
   * 根據條件搜索審計日誌
   */
  async findByFilters(filters: AuditLogFilters): Promise<AuditLog[]> {
    let query = this.db(this.tableName);

    if (filters.entityType) {
      query = query.where({ entity_type: filters.entityType });
    }

    if (filters.entityId) {
      query = query.where({ entity_id: filters.entityId });
    }

    if (filters.action) {
      query = query.where({ action: filters.action });
    }

    if (filters.userId) {
      query = query.where({ user_id: filters.userId });
    }

    if (filters.startDate) {
      query = query.where('created_at', '>=', filters.startDate);
    }

    if (filters.endDate) {
      query = query.where('created_at', '<=', filters.endDate);
    }

    if (filters.ipAddress) {
      query = query.where({ ip_address: filters.ipAddress });
    }

    const logs = await query.orderBy('created_at', 'desc');
    return logs.map(this.mapFromDb);
  }

  /**
   * 獲取包含用戶信息的審計日誌
   */
  async findWithUserInfo(filters: AuditLogFilters = {}): Promise<AuditLogWithUser[]> {
    let query = this.db(this.tableName)
      .leftJoin('users', 'audit_logs.user_id', '=', 'users.id')
      .select(
        'audit_logs.*',
        'users.email as user_email',
        'users.first_name as user_name'
      );

    if (filters.entityType) {
      query = query.where('audit_logs.entity_type', filters.entityType);
    }

    if (filters.entityId) {
      query = query.where('audit_logs.entity_id', filters.entityId);
    }

    if (filters.action) {
      query = query.where('audit_logs.action', filters.action);
    }

    if (filters.userId) {
      query = query.where('audit_logs.user_id', filters.userId);
    }

    if (filters.startDate) {
      query = query.where('audit_logs.created_at', '>=', filters.startDate);
    }

    if (filters.endDate) {
      query = query.where('audit_logs.created_at', '<=', filters.endDate);
    }

    if (filters.ipAddress) {
      query = query.where('audit_logs.ip_address', filters.ipAddress);
    }

    const logs = await query.orderBy('audit_logs.created_at', 'desc');
    return logs.map(this.mapToAuditLogWithUser);
  }

  /**
   * 獲取審計日誌摘要
   */
  async getAuditSummary(filters: AuditLogFilters = {}): Promise<AuditLogSummary> {
    let baseQuery = this.db(this.tableName);

    if (filters.startDate) {
      baseQuery = baseQuery.where('created_at', '>=', filters.startDate);
    }

    if (filters.endDate) {
      baseQuery = baseQuery.where('created_at', '<=', filters.endDate);
    }

    if (filters.entityType) {
      baseQuery = baseQuery.where({ entity_type: filters.entityType });
    }

    // 總日誌數
    const [totalResult] = await baseQuery.clone().count('* as count');
    const totalLogs = parseInt(totalResult.count as string);

    // 按動作統計
    const actionStats = await baseQuery.clone()
      .groupBy('action')
      .select('action', this.db.raw('COUNT(*) as count'));

    const actionCounts = actionStats.reduce((acc, stat) => {
      acc[stat.action as AuditAction] = parseInt(stat.count);
      return acc;
    }, {} as Record<AuditAction, number>);

    // 按實體類型統計
    const entityStats = await baseQuery.clone()
      .groupBy('entity_type')
      .select('entity_type', this.db.raw('COUNT(*) as count'));

    const entityCounts = entityStats.reduce((acc, stat) => {
      acc[stat.entity_type] = parseInt(stat.count);
      return acc;
    }, {} as Record<string, number>);

    // 按用戶統計
    const userStats = await baseQuery.clone()
      .join('users', 'audit_logs.user_id', '=', 'users.id')
      .groupBy('audit_logs.user_id', 'users.email')
      .select(
        'audit_logs.user_id',
        'users.email as user_email',
        this.db.raw('COUNT(*) as action_count'),
        this.db.raw('MAX(audit_logs.created_at) as last_action')
      );

    const userStatsList = userStats.map((stat: any) => ({
      userId: stat.user_id,
      userEmail: stat.user_email,
      actionCount: parseInt(stat.action_count),
      lastAction: stat.last_action,
    }));

    // 最近日誌
    const recentLogs = await this.findWithUserInfo({
      ...filters,
    });

    return {
      totalLogs,
      actionStats: actionCounts,
      entityStats: entityCounts,
      userStats: userStatsList,
      recentLogs: recentLogs.slice(0, 20), // 最近20筆
    };
  }

  /**
   * 根據用戶ID查找審計日誌
   */
  async findByUserId(userId: string): Promise<AuditLog[]> {
    const logs = await this.db(this.tableName)
      .where({ user_id: userId })
      .orderBy('created_at', 'desc');

    return logs.map(this.mapFromDb);
  }

  /**
   * 獲取特定時間範圍內的活動統計
   */
  async getActivityStats(startDate: Date, endDate: Date): Promise<{
    dailyStats: Array<{
      date: string;
      count: number;
    }>;
    hourlyStats: Array<{
      hour: number;
      count: number;
    }>;
    actionStats: Array<{
      action: AuditAction;
      count: number;
    }>;
  }> {
    // 按日期統計
    const dailyStats = await this.db(this.tableName)
      .whereBetween('created_at', [startDate, endDate])
      .groupBy(this.db.raw('DATE(created_at)'))
      .select(
        this.db.raw('DATE(created_at) as date'),
        this.db.raw('COUNT(*) as count')
      );

    // 按小時統計
    const hourlyStats = await this.db(this.tableName)
      .whereBetween('created_at', [startDate, endDate])
      .groupBy(this.db.raw('EXTRACT(HOUR FROM created_at)'))
      .select(
        this.db.raw('EXTRACT(HOUR FROM created_at) as hour'),
        this.db.raw('COUNT(*) as count')
      );

    // 按動作統計
    const actionStats = await this.db(this.tableName)
      .whereBetween('created_at', [startDate, endDate])
      .groupBy('action')
      .select('action', this.db.raw('COUNT(*) as count'));

    return {
      dailyStats: dailyStats.map((stat: any) => ({
        date: stat.date,
        count: parseInt(stat.count),
      })),
      hourlyStats: hourlyStats.map((stat: any) => ({
        hour: parseInt(stat.hour),
        count: parseInt(stat.count),
      })),
      actionStats: actionStats.map((stat: any) => ({
        action: stat.action as AuditAction,
        count: parseInt(stat.count),
      })),
    };
  }

  /**
   * 清理舊的審計日誌
   */
  async cleanupOldLogs(daysToKeep: number = 90): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const deletedCount = await this.db(this.tableName)
      .where('created_at', '<', cutoffDate)
      .delete();

    return deletedCount;
  }

  /**
   * 批量創建審計日誌
   */
  async batchCreateLogs(logs: CreateAuditLogData[]): Promise<AuditLog[]> {
    const insertData = logs.map(data => ({
      entity_type: data.entityType,
      entity_id: data.entityId,
      action: data.action,
      user_id: data.userId,
      old_values: data.oldValues ? JSON.stringify(data.oldValues) : null,
      new_values: data.newValues ? JSON.stringify(data.newValues) : null,
      changes: data.changes ? JSON.stringify(data.changes) : null,
      ip_address: data.ipAddress,
      user_agent: data.userAgent,
      description: data.description,
      metadata: data.metadata ? JSON.stringify(data.metadata) : null,
    }));

    const result = await this.db(this.tableName)
      .insert(insertData)
      .returning('*');

    return result.map(this.mapFromDb);
  }

  /**
   * 映射資料庫記錄到 AuditLog 模型
   */
  protected mapFromDb(auditLog: any): AuditLog {
    return {
      id: auditLog.id,
      entityType: auditLog.entity_type,
      entityId: auditLog.entity_id,
      action: auditLog.action,
      userId: auditLog.user_id,
      oldValues: auditLog.old_values ? JSON.parse(auditLog.old_values) : null,
      newValues: auditLog.new_values ? JSON.parse(auditLog.new_values) : null,
      changes: auditLog.changes ? JSON.parse(auditLog.changes) : null,
      ipAddress: auditLog.ip_address,
      userAgent: auditLog.user_agent,
      description: auditLog.description,
      metadata: auditLog.metadata ? JSON.parse(auditLog.metadata) : null,
      createdAt: auditLog.created_at,
      updatedAt: auditLog.updated_at,
    };
  }

  /**
   * 映射 AuditLog 模型到資料庫記錄
   */
  protected mapToDb(auditLog: Partial<AuditLog>): any {
    const dbData: any = {};
    
    if (auditLog.entityType !== undefined) {
      dbData.entity_type = auditLog.entityType;
    }
    if (auditLog.entityId !== undefined) {
      dbData.entity_id = auditLog.entityId;
    }
    if (auditLog.action !== undefined) {
      dbData.action = auditLog.action;
    }
    if (auditLog.userId !== undefined) {
      dbData.user_id = auditLog.userId;
    }
    if (auditLog.oldValues !== undefined) {
      dbData.old_values = auditLog.oldValues ? JSON.stringify(auditLog.oldValues) : null;
    }
    if (auditLog.newValues !== undefined) {
      dbData.new_values = auditLog.newValues ? JSON.stringify(auditLog.newValues) : null;
    }
    if (auditLog.changes !== undefined) {
      dbData.changes = auditLog.changes ? JSON.stringify(auditLog.changes) : null;
    }
    if (auditLog.ipAddress !== undefined) {
      dbData.ip_address = auditLog.ipAddress;
    }
    if (auditLog.userAgent !== undefined) {
      dbData.user_agent = auditLog.userAgent;
    }
    if (auditLog.description !== undefined) {
      dbData.description = auditLog.description;
    }
    if (auditLog.metadata !== undefined) {
      dbData.metadata = auditLog.metadata ? JSON.stringify(auditLog.metadata) : null;
    }
    
    return dbData;
  }

  /**
   * 映射到 AuditLogWithUser
   */
  private mapToAuditLogWithUser(row: any): AuditLogWithUser {
    return {
      id: row.id,
      entityType: row.entity_type,
      entityId: row.entity_id,
      action: row.action,
      userId: row.user_id,
      oldValues: row.old_values ? JSON.parse(row.old_values) : null,
      newValues: row.new_values ? JSON.parse(row.new_values) : null,
      changes: row.changes ? JSON.parse(row.changes) : null,
      ipAddress: row.ip_address,
      userAgent: row.user_agent,
      description: row.description,
      metadata: row.metadata ? JSON.parse(row.metadata) : null,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      userEmail: row.user_email,
      userName: row.user_name,
    };
  }
}

export const auditLogRepository = new AuditLogRepository();