import SQLite from 'react-native-sqlite-storage';
import { Project, VideoClip } from '../../shared/types';

SQLite.enablePromise(true);

export class DatabaseService {
  private static db: SQLite.SQLiteDatabase | null = null;

  static async initialize(): Promise<void> {
    try {
      this.db = await SQLite.openDatabase({
        name: 'motionweave.db',
        location: 'default',
      });

      await this.createTables();
      console.log('Database initialized successfully');
    } catch (error) {
      console.error('Failed to initialize database:', error);
      throw error;
    }
  }

  private static async createTables(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const createProjectsTable = `
      CREATE TABLE IF NOT EXISTS projects (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        thumbnail_path TEXT,
        duration REAL,
        layout_config TEXT,
        is_exported INTEGER DEFAULT 0,
        export_path TEXT,
        settings TEXT
      );
    `;

    const createVideoClipsTable = `
      CREATE TABLE IF NOT EXISTS video_clips (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        local_uri TEXT NOT NULL,
        duration REAL NOT NULL,
        start_time REAL DEFAULT 0,
        end_time REAL,
        position TEXT,
        transform_config TEXT,
        filters TEXT,
        volume REAL DEFAULT 1.0,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
      );
    `;

    const createPreferencesTable = `
      CREATE TABLE IF NOT EXISTS user_preferences (
        key TEXT PRIMARY KEY,
        value TEXT
      );
    `;

    await this.db.executeSql(createProjectsTable);
    await this.db.executeSql(createVideoClipsTable);
    await this.db.executeSql(createPreferencesTable);
  }

  // Project CRUD Operations
  static async saveProject(project: Project): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const query = `
      INSERT OR REPLACE INTO projects 
      (id, name, created_at, updated_at, thumbnail_path, duration, layout_config, is_exported, export_path, settings)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
      project.id,
      project.name,
      project.createdAt,
      project.updatedAt,
      project.thumbnailPath,
      project.duration,
      JSON.stringify(project.layout),
      project.outputPath ? 1 : 0,
      project.outputPath || null,
      JSON.stringify(project.settings),
    ];

    await this.db.executeSql(query, params);

    // Save video clips
    for (const clip of project.videos) {
      await this.saveVideoClip(project.id, clip);
    }
  }

  static async getProject(id: string): Promise<Project | null> {
    if (!this.db) throw new Error('Database not initialized');

    const query = 'SELECT * FROM projects WHERE id = ?';
    const [result] = await this.db.executeSql(query, [id]);

    if (result.rows.length === 0) return null;

    const row = result.rows.item(0);
    const videos = await this.getVideoClips(id);

    return {
      id: row.id,
      name: row.name,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      thumbnailPath: row.thumbnail_path,
      duration: row.duration,
      layout: JSON.parse(row.layout_config),
      videos,
      outputPath: row.export_path,
      settings: JSON.parse(row.settings),
    };
  }

  static async getAllProjects(): Promise<Project[]> {
    if (!this.db) throw new Error('Database not initialized');

    const query = 'SELECT * FROM projects ORDER BY updated_at DESC';
    const [result] = await this.db.executeSql(query);

    const projects: Project[] = [];

    for (let i = 0; i < result.rows.length; i++) {
      const row = result.rows.item(i);
      const videos = await this.getVideoClips(row.id);

      projects.push({
        id: row.id,
        name: row.name,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        thumbnailPath: row.thumbnail_path,
        duration: row.duration,
        layout: JSON.parse(row.layout_config),
        videos,
        outputPath: row.export_path,
        settings: JSON.parse(row.settings),
      });
    }

    return projects;
  }

  static async deleteProject(id: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    await this.db.executeSql('DELETE FROM video_clips WHERE project_id = ?', [
      id,
    ]);
    await this.db.executeSql('DELETE FROM projects WHERE id = ?', [id]);
  }

  // Video Clip Operations
  private static async saveVideoClip(
    projectId: string,
    clip: VideoClip,
  ): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const query = `
      INSERT OR REPLACE INTO video_clips
      (id, project_id, local_uri, duration, start_time, end_time, position, transform_config, filters, volume)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
      clip.id,
      projectId,
      clip.localUri,
      clip.duration,
      clip.startTime,
      clip.endTime,
      JSON.stringify(clip.position),
      JSON.stringify(clip.transform),
      JSON.stringify(clip.filters),
      clip.volume,
    ];

    await this.db.executeSql(query, params);
  }

  private static async getVideoClips(projectId: string): Promise<VideoClip[]> {
    if (!this.db) throw new Error('Database not initialized');

    const query = 'SELECT * FROM video_clips WHERE project_id = ?';
    const [result] = await this.db.executeSql(query, [projectId]);

    const clips: VideoClip[] = [];

    for (let i = 0; i < result.rows.length; i++) {
      const row = result.rows.item(i);
      clips.push({
        id: row.id,
        localUri: row.local_uri,
        duration: row.duration,
        startTime: row.start_time,
        endTime: row.end_time,
        position: JSON.parse(row.position),
        transform: JSON.parse(row.transform_config),
        filters: JSON.parse(row.filters),
        volume: row.volume,
      });
    }

    return clips;
  }

  // Preferences
  static async setPreference(key: string, value: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const query =
      'INSERT OR REPLACE INTO user_preferences (key, value) VALUES (?, ?)';
    await this.db.executeSql(query, [key, value]);
  }

  static async getPreference(key: string): Promise<string | null> {
    if (!this.db) throw new Error('Database not initialized');

    const query = 'SELECT value FROM user_preferences WHERE key = ?';
    const [result] = await this.db.executeSql(query, [key]);

    if (result.rows.length === 0) return null;
    return result.rows.item(0).value;
  }

  static async close(): Promise<void> {
    if (this.db) {
      await this.db.close();
      this.db = null;
    }
  }
}
