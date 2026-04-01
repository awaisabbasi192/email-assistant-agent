import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import lock from 'proper-lockfile';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, '../data');

// Ensure data directory exists
await fs.mkdir(DATA_DIR, { recursive: true });

class StorageService {
  /**
   * Read JSON file with thread-safe locking
   */
  static async read(filename) {
    const filepath = path.join(DATA_DIR, filename);

    try {
      const data = await fs.readFile(filepath, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      if (error.code === 'ENOENT') {
        // File doesn't exist, return default structure
        return this._getDefaultStructure(filename);
      }
      throw new Error(`Failed to read ${filename}: ${error.message}`);
    }
  }

  /**
   * Write JSON file with thread-safe locking
   */
  static async write(filename, data) {
    const filepath = path.join(DATA_DIR, filename);
    let release;

    try {
      // Acquire lock
      release = await lock(filepath, {
        realpath: false,
        retries: {
          retries: 5,
          minTimeout: 100
        }
      }).catch(async (error) => {
        // File doesn't exist yet, create empty lock
        if (error.code === 'ENOENT') {
          await fs.writeFile(filepath, JSON.stringify(this._getDefaultStructure(filename), null, 2));
          return await lock(filepath, { realpath: false });
        }
        throw error;
      });

      // Write file
      await fs.writeFile(filepath, JSON.stringify(data, null, 2));

      // Release lock
      await release();
    } catch (error) {
      if (release) await release().catch(() => {});
      throw new Error(`Failed to write ${filename}: ${error.message}`);
    }
  }

  /**
   * Append a record to an array in JSON file
   */
  static async append(filename, record) {
    const data = await this.read(filename);

    // Find the appropriate array property
    const arrayKey = this._getArrayKey(filename);
    if (!data[arrayKey]) {
      data[arrayKey] = [];
    }

    data[arrayKey].push(record);
    await this.write(filename, data);
  }

  /**
   * Update records in file matching query
   */
  static async update(filename, query, updates) {
    const data = await this.read(filename);
    const arrayKey = this._getArrayKey(filename);

    if (!Array.isArray(data[arrayKey])) {
      throw new Error(`${filename} does not contain a ${arrayKey} array`);
    }

    let updated = false;
    data[arrayKey] = data[arrayKey].map(item => {
      if (this._matches(item, query)) {
        updated = true;
        return { ...item, ...updates };
      }
      return item;
    });

    if (updated) {
      await this.write(filename, data);
    }

    return updated;
  }

  /**
   * Find records matching query
   */
  static async find(filename, query) {
    const data = await this.read(filename);
    const arrayKey = this._getArrayKey(filename);

    if (!Array.isArray(data[arrayKey])) {
      return [];
    }

    return data[arrayKey].filter(item => this._matches(item, query));
  }

  /**
   * Find single record matching query
   */
  static async findOne(filename, query) {
    const results = await this.find(filename, query);
    return results[0] || null;
  }

  /**
   * Delete records matching query
   */
  static async delete(filename, query) {
    const data = await this.read(filename);
    const arrayKey = this._getArrayKey(filename);

    if (!Array.isArray(data[arrayKey])) {
      return false;
    }

    const originalLength = data[arrayKey].length;
    data[arrayKey] = data[arrayKey].filter(item => !this._matches(item, query));

    if (data[arrayKey].length !== originalLength) {
      await this.write(filename, data);
      return true;
    }

    return false;
  }

  /**
   * Clear all records in an array
   */
  static async clear(filename) {
    const data = this._getDefaultStructure(filename);
    await this.write(filename, data);
  }

  /**
   * Get file size and info
   */
  static async getFileInfo(filename) {
    const filepath = path.join(DATA_DIR, filename);
    try {
      const stats = await fs.stat(filepath);
      return {
        size: stats.size,
        modified: stats.mtime,
        created: stats.birthtime
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Create backup of file
   */
  static async createBackup(filename) {
    const filepath = path.join(DATA_DIR, filename);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(DATA_DIR, `backup_${timestamp}_${filename}`);

    try {
      await fs.copyFile(filepath, backupPath);
      return backupPath;
    } catch (error) {
      throw new Error(`Failed to create backup: ${error.message}`);
    }
  }

  /**
   * Private helper: Check if object matches query
   */
  static _matches(obj, query) {
    for (const [key, value] of Object.entries(query)) {
      if (obj[key] !== value) {
        return false;
      }
    }
    return true;
  }

  /**
   * Private helper: Get array key for each file type
   */
  static _getArrayKey(filename) {
    const keyMap = {
      'users.json': 'users',
      'gmail_tokens.json': 'tokens',
      'activity_logs.json': 'logs',
      'api_usage.json': 'usage',
      'sessions.json': 'sessions',
      'admin_config.json': 'admins'
    };
    return keyMap[filename] || 'records';
  }

  /**
   * Private helper: Get default structure for file
   */
  static _getDefaultStructure(filename) {
    const structures = {
      'users.json': { users: [] },
      'gmail_tokens.json': { tokens: [] },
      'activity_logs.json': { logs: [] },
      'api_usage.json': { usage: [], globalRateLimits: { geminiLastMinute: [] } },
      'sessions.json': { sessions: [] },
      'admin_config.json': { admins: [], settings: { signupEnabled: true, maintenanceMode: false } }
    };
    return structures[filename] || { records: [] };
  }
}

export default StorageService;
