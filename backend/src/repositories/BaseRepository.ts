import { Knex } from "knex";
import db from "../database/connection";

export abstract class BaseRepository<T> {
  protected db: Knex;
  protected tableName: string;

  constructor(tableName: string) {
    this.db = db;
    this.tableName = tableName;
  }

  async findById(id: string): Promise<T | undefined> {
    const result = await this.db(this.tableName).where({ id }).first();
    return result ? this.mapFromDb(result) : undefined;
  }

  async findAll(limit?: number, offset?: number): Promise<T[]> {
    let query = this.db(this.tableName);

    if (limit) {
      query = query.limit(limit);
    }

    if (offset) {
      query = query.offset(offset);
    }

    const results = await query;
    return results.map(this.mapFromDb);
  }

  async create(data: Partial<T>): Promise<T> {
    const dbData = this.mapToDb(data);
    const [result] = await this.db(this.tableName)
      .insert(dbData)
      .returning("*");
    return this.mapFromDb(result);
  }

  async update(id: string, data: Partial<T>): Promise<T | undefined> {
    const dbData = this.mapToDb(data);
    const [result] = await this.db(this.tableName)
      .where({ id })
      .update(dbData)
      .returning("*");
    return result ? this.mapFromDb(result) : undefined;
  }

  async delete(id: string): Promise<boolean> {
    const deletedCount = await this.db(this.tableName).where({ id }).del();
    return deletedCount > 0;
  }

  async count(): Promise<number> {
    const [{ count }] = await this.db(this.tableName).count("* as count");
    return parseInt(count as string, 10);
  }

  // Abstract methods to be implemented by subclasses
  protected abstract mapFromDb(dbRow: any): T;
  protected abstract mapToDb(entity: Partial<T>): any;
}
