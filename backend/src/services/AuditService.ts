import { Request } from 'express';
import { auditLogRepository } from '../repositories/AuditLogRepository';
import { AuditAction, CreateAuditLogData } from '../models/AuditLog';

export class AuditService {
  /**
   * 記錄審計日誌
   */
  async log(data: CreateAuditLogData, req?: Request): Promise<void> {
    try {
      const auditData: CreateAuditLogData = {
        ...data,
        ipAddress: req ? this.getClientIP(req) : undefined,
        userAgent: req ? req.get('User-Agent') : undefined,
      };

      await auditLogRepository.createAuditLog(auditData);
    } catch (error) {
      console.error('Failed to create audit log:', error);
      // 審計日誌失敗不應該影響主要業務流程
    }
  }

  /**
   * 記錄實體創建
   */
  async logCreate(
    entityType: string,
    entityId: string,
    newValues: any,
    userId?: string,
    req?: Request,
    description?: string
  ): Promise<void> {
    await this.log({
      entityType,
      entityId,
      action: AuditAction.CREATE,
      userId,
      newValues,
      description: description || `Created ${entityType}`,
    }, req);
  }

  /**
   * 記錄實體更新
   */
  async logUpdate(
    entityType: string,
    entityId: string,
    oldValues: any,
    newValues: any,
    userId?: string,
    req?: Request,
    description?: string
  ): Promise<void> {
    // 計算變更欄位
    const changes = this.calculateChanges(oldValues, newValues);
    
    await this.log({
      entityType,
      entityId,
      action: AuditAction.UPDATE,
      userId,
      oldValues,
      newValues,
      changes,
      description: description || `Updated ${entityType}`,
    }, req);
  }

  /**
   * 記錄實體刪除
   */
  async logDelete(
    entityType: string,
    entityId: string,
    oldValues: any,
    userId?: string,
    req?: Request,
    description?: string
  ): Promise<void> {
    await this.log({
      entityType,
      entityId,
      action: AuditAction.DELETE,
      userId,
      oldValues,
      description: description || `Deleted ${entityType}`,
    }, req);
  }

  /**
   * 記錄實體查看
   */
  async logView(
    entityType: string,
    entityId: string,
    userId?: string,
    req?: Request,
    description?: string
  ): Promise<void> {
    await this.log({
      entityType,
      entityId,
      action: AuditAction.VIEW,
      userId,
      description: description || `Viewed ${entityType}`,
    }, req);
  }

  /**
   * 記錄用戶登入
   */
  async logLogin(
    userId: string,
    req?: Request,
    success: boolean = true
  ): Promise<void> {
    await this.log({
      entityType: 'user',
      entityId: userId,
      action: AuditAction.LOGIN,
      userId,
      description: success ? 'User logged in' : 'Failed login attempt',
      metadata: { success },
    }, req);
  }

  /**
   * 記錄用戶登出
   */
  async logLogout(
    userId: string,
    req?: Request
  ): Promise<void> {
    await this.log({
      entityType: 'user',
      entityId: userId,
      action: AuditAction.LOGOUT,
      userId,
      description: 'User logged out',
    }, req);
  }

  /**
   * 記錄搜索操作
   */
  async logSearch(
    searchType: string,
    searchParams: any,
    userId?: string,
    req?: Request
  ): Promise<void> {
    await this.log({
      entityType: searchType,
      entityId: 'search',
      action: AuditAction.SEARCH,
      userId,
      metadata: { searchParams },
      description: `Performed search on ${searchType}`,
    }, req);
  }

  /**
   * 記錄資料導出
   */
  async logExport(
    dataType: string,
    exportParams: any,
    userId?: string,
    req?: Request
  ): Promise<void> {
    await this.log({
      entityType: dataType,
      entityId: 'export',
      action: AuditAction.EXPORT,
      userId,
      metadata: { exportParams },
      description: `Exported ${dataType} data`,
    }, req);
  }

  /**
   * 記錄資料導入
   */
  async logImport(
    dataType: string,
    importParams: any,
    userId?: string,
    req?: Request
  ): Promise<void> {
    await this.log({
      entityType: dataType,
      entityId: 'import',
      action: AuditAction.IMPORT,
      userId,
      metadata: { importParams },
      description: `Imported ${dataType} data`,
    }, req);
  }

  /**
   * 批量記錄審計日誌
   */
  async batchLog(logs: CreateAuditLogData[], req?: Request): Promise<void> {
    try {
      const auditLogs = logs.map(data => ({
        ...data,
        ipAddress: req ? this.getClientIP(req) : undefined,
        userAgent: req ? req.get('User-Agent') : undefined,
      }));

      await auditLogRepository.batchCreateLogs(auditLogs);
    } catch (error) {
      console.error('Failed to create batch audit logs:', error);
    }
  }

  /**
   * 獲取實體的審計歷史
   */
  async getEntityHistory(entityType: string, entityId: string) {
    return await auditLogRepository.findByEntity(entityType, entityId);
  }

  /**
   * 獲取用戶的活動歷史
   */
  async getUserActivity(userId: string) {
    return await auditLogRepository.findByUserId(userId);
  }

  /**
   * 獲取審計摘要
   */
  async getAuditSummary(filters?: any) {
    return await auditLogRepository.getAuditSummary(filters);
  }

  /**
   * 清理舊的審計日誌
   */
  async cleanupOldLogs(daysToKeep: number = 90) {
    return await auditLogRepository.cleanupOldLogs(daysToKeep);
  }

  /**
   * 獲取客戶端IP地址
   */
  private getClientIP(req: Request): string {
    return (
      req.ip ||
      req.connection.remoteAddress ||
      req.socket.remoteAddress ||
      (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
      'unknown'
    );
  }

  /**
   * 計算對象變更
   */
  private calculateChanges(oldValues: any, newValues: any): string[] {
    const changes: string[] = [];
    
    if (!oldValues || !newValues) {
      return changes;
    }

    // 檢查所有新值中的欄位
    for (const key in newValues) {
      if (oldValues[key] !== newValues[key]) {
        changes.push(key);
      }
    }

    // 檢查被刪除的欄位
    for (const key in oldValues) {
      if (!(key in newValues)) {
        changes.push(key);
      }
    }

    return changes;
  }
}

export const auditService = new AuditService();