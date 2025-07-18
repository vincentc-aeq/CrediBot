import { BaseRepository } from "./BaseRepository";
import {
  User,
  CreateUserData,
  UpdateUserData,
  UserWithoutPassword,
} from "../models/User";
import { defaultUserPreferences } from "../models/User";

export class UserRepository extends BaseRepository<User> {
  constructor() {
    super("users");
  }

  async findByEmail(email: string): Promise<User | undefined> {
    const result = await this.db(this.tableName).where({ email }).first();
    return result ? this.mapFromDb(result) : undefined;
  }

  async findByEmailWithoutPassword(
    email: string
  ): Promise<UserWithoutPassword | undefined> {
    const user = await this.findByEmail(email);
    if (!user) return undefined;

    const { passwordHash, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  async createUser(userData: CreateUserData): Promise<User> {
    const userToCreate = {
      email: userData.email,
      passwordHash: userData.password, // This should be hashed before calling this method
      firstName: userData.firstName,
      lastName: userData.lastName,
      preferences: { ...defaultUserPreferences, ...userData.preferences },
      isActive: true,
    };

    return this.create(userToCreate);
  }

  async updateUserPreferences(
    id: string,
    preferences: Partial<User["preferences"]>
  ): Promise<User | undefined> {
    const user = await this.findById(id);
    if (!user) return undefined;

    const updatedPreferences = { ...user.preferences, ...preferences };
    return this.update(id, { preferences: updatedPreferences });
  }

  async findActiveUsers(limit?: number, offset?: number): Promise<User[]> {
    let query = this.db(this.tableName).where({ is_active: true });

    if (limit) query = query.limit(limit);
    if (offset) query = query.offset(offset);

    const results = await query;
    return results.map(this.mapFromDb);
  }

  protected mapFromDb(dbRow: any): User {
    return {
      id: dbRow.id,
      email: dbRow.email,
      passwordHash: dbRow.password_hash,
      firstName: dbRow.first_name,
      lastName: dbRow.last_name,
      preferences: dbRow.preferences || defaultUserPreferences,
      isActive: dbRow.is_active,
      emailVerifiedAt: dbRow.email_verified_at,
      lastLoginAt: dbRow.last_login_at,
      refreshTokenHash: dbRow.refresh_token_hash,
      refreshTokenExpiresAt: dbRow.refresh_token_expires_at,
      createdAt: dbRow.created_at,
      updatedAt: dbRow.updated_at,
    };
  }

  protected mapToDb(entity: Partial<User>): any {
    const dbRow: any = {};

    if (entity.email !== undefined) dbRow.email = entity.email;
    if (entity.passwordHash !== undefined)
      dbRow.password_hash = entity.passwordHash;
    if (entity.firstName !== undefined) dbRow.first_name = entity.firstName;
    if (entity.lastName !== undefined) dbRow.last_name = entity.lastName;
    if (entity.preferences !== undefined)
      dbRow.preferences = entity.preferences;
    if (entity.isActive !== undefined) dbRow.is_active = entity.isActive;
    if (entity.emailVerifiedAt !== undefined)
      dbRow.email_verified_at = entity.emailVerifiedAt;
    if (entity.lastLoginAt !== undefined)
      dbRow.last_login_at = entity.lastLoginAt;
    if (entity.refreshTokenHash !== undefined)
      dbRow.refresh_token_hash = entity.refreshTokenHash;
    if (entity.refreshTokenExpiresAt !== undefined)
      dbRow.refresh_token_expires_at = entity.refreshTokenExpiresAt;

    return dbRow;
  }
}

export const userRepository = new UserRepository();
