import { RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import { randomUUID } from 'crypto';
import { getPool } from '../db/connection';
import { User, CreateUserDto } from '../types';

interface UserRow extends RowDataPacket {
  id: string;
  name: string;
  email: string;
  created_at: Date;
}

export class UserRepository {
  async findById(id: string): Promise<User | null> {
    const pool = getPool();
    const [rows] = await pool.query<UserRow[]>(
      'SELECT id, name, email, created_at as createdAt FROM users WHERE id = ?',
      [id]
    );

    if (rows.length === 0) {
      return null;
    }

    const row = rows[0]!;
    return {
      id: row.id,
      name: row.name,
      email: row.email,
      createdAt: row.createdAt,
    };
  }

  async findByEmail(email: string): Promise<User | null> {
    const pool = getPool();
    const [rows] = await pool.query<UserRow[]>(
      'SELECT id, name, email, created_at as createdAt FROM users WHERE email = ?',
      [email]
    );

    if (rows.length === 0) {
      return null;
    }

    const row = rows[0]!;
    return {
      id: row.id,
      name: row.name,
      email: row.email,
      createdAt: row.createdAt,
    };
  }

  async findByIds(ids: string[]): Promise<User[]> {
    if (ids.length === 0) return [];
    const pool = getPool();
    const placeholders = ids.map(() => '?').join(',');
    const [rows] = await pool.query<UserRow[]>(
      `SELECT id, name, email, created_at as createdAt FROM users WHERE id IN (${placeholders})`,
      ids
    );

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      email: row.email,
      createdAt: row.createdAt,
    }));
  }

  async create(userDto: CreateUserDto): Promise<User> {
    const pool = getPool();
    const id = userDto.id || randomUUID();
    await pool.query<ResultSetHeader>(
      'INSERT INTO users (id, name, email) VALUES (?, ?, ?)',
      [id, userDto.name, userDto.email]
    );

    const user = await this.findById(id);
    if (!user) {
      throw new Error('Failed to retrieve user after creation');
    }
    return user;
  }

  async getAll(): Promise<User[]> {
    const pool = getPool();
    const [rows] = await pool.query<UserRow[]>(
      'SELECT id, name, email, created_at as createdAt FROM users ORDER BY created_at ASC'
    );

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      email: row.email,
      createdAt: row.createdAt,
    }));
  }
}

export const userRepository = new UserRepository();
