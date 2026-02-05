import SQLite from 'react-native-sqlite-storage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import RNFS from 'react-native-fs';
import { Project, MediaClip } from '../../shared/types';

SQLite.enablePromise(true);

const FALLBACK_PROJECTS_KEY = 'motionweave.projects.v1';

export class DatabaseService {
  private static db: SQLite.SQLiteDatabase | null = null;

  private static async getFallbackProjects(): Promise<Project[]> {
    try {
      const raw = await AsyncStorage.getItem(FALLBACK_PROJECTS_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed as Project[];
    } catch (error) {
      console.warn('Failed to read fallback projects:', error);
      return [];
    }
  }

  private static async setFallbackProjects(projects: Project[]): Promise<void> {
    try {
      await AsyncStorage.setItem(
        FALLBACK_PROJECTS_KEY,
        JSON.stringify(projects),
      );
    } catch (error) {
      console.warn('Failed to write fallback projects:', error);
    }
  }

  private static async upsertFallbackProject(project: Project): Promise<void> {
    const existing = await this.getFallbackProjects();
    const merged = [
      project,
      ...existing.filter(p => p && p.id !== project.id),
    ].sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
    await this.setFallbackProjects(merged);
  }

  private static async deleteFallbackProject(id: string): Promise<void> {
    const existing = await this.getFallbackProjects();
    const next = existing.filter(p => p && p.id !== id);
    await this.setFallbackProjects(next);
  }

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

    // Migration: Drop old video_clips table if it exists
    try {
      await this.db.executeSql('DROP TABLE IF EXISTS video_clips;');
      console.log('✓ Migrated: dropped old video_clips table');
    } catch {
      // Table might not exist, that's fine
    }

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

    const createMediaClipsTable = `
      CREATE TABLE IF NOT EXISTS media_clips (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        local_uri TEXT NOT NULL,
        thumbnail_uri TEXT,
        type TEXT DEFAULT 'video',
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
    await this.db.executeSql(createMediaClipsTable);
    await this.db.executeSql(createPreferencesTable);
    console.log('✓ Database tables created');
  }

  // Project CRUD Operations
  static async saveProject(project: Project): Promise<void> {
    if (!this.db) {
      await this.upsertFallbackProject(project);
      return;
    }

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

    try {
      await this.db.executeSql(query, params);

      // Sync media clips (delete removed, then upsert current)
      await this.db.executeSql('DELETE FROM media_clips WHERE project_id = ?', [
        project.id,
      ]);

      // Save media clips
      for (const clip of project.videos) {
        await this.saveMediaClip(project.id, clip);
      }
    } catch (error) {
      console.warn('SQLite saveProject failed, falling back:', error);
    } finally {
      this.upsertFallbackProject(project).catch(error =>
        console.warn('Failed to mirror project to fallback storage:', error),
      );
    }
  }

  static async getProject(id: string): Promise<Project | null> {
    if (!this.db) {
      const projects = await this.getFallbackProjects();
      return projects.find(p => p && p.id === id) || null;
    }

    try {
      const query = 'SELECT * FROM projects WHERE id = ?';
      const [result] = await this.db.executeSql(query, [id]);

      if (result.rows.length === 0) return null;

      const row = result.rows.item(0);
      const videos = await this.getMediaClips(id);

      return {
        id: row.id,
        name: row.name,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        thumbnailPath: row.thumbnail_path,
        duration: row.duration,
        layout: this.safeJsonParse(row.layout_config, {
          type: 'grid',
          rows: 2,
          cols: 2,
          spacing: 8,
          borderRadius: 12,
          aspectRatio: '1:1',
        }),
        videos,
        outputPath: row.export_path,
        settings: this.safeJsonParse(row.settings, {
          resolution: '1080p',
          frameRate: 30,
          quality: 'high',
          format: 'mp4',
        }),
      };
    } catch (error) {
      console.warn('SQLite getProject failed, using fallback:', error);
      const projects = await this.getFallbackProjects();
      return projects.find(p => p && p.id === id) || null;
    }
  }

  private static safeJsonParse(jsonString: string | null, defaultValue: any): any {
    try {
      return jsonString ? JSON.parse(jsonString) : defaultValue;
    } catch {
      return defaultValue;
    }
  }

  static async getAllProjects(): Promise<Project[]> {
    const fallbackProjects = await this.getFallbackProjects();
    const fallbackSorted = [...fallbackProjects].sort(
      (a, b) => (b.updatedAt || 0) - (a.updatedAt || 0),
    );

    if (!this.db) return fallbackSorted;

    try {
      const query = 'SELECT * FROM projects ORDER BY updated_at DESC';
      const [result] = await this.db.executeSql(query);

      const projects: Project[] = [];

      for (let i = 0; i < result.rows.length; i++) {
        const row = result.rows.item(i);
        const videos = await this.getMediaClips(row.id);

        projects.push({
          id: row.id,
          name: row.name,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
          thumbnailPath: row.thumbnail_path,
          duration: row.duration,
          layout: this.safeJsonParse(row.layout_config, {
            type: 'grid',
            rows: 2,
            cols: 2,
            spacing: 8,
            borderRadius: 12,
            aspectRatio: '1:1',
          }),
          videos,
          outputPath: row.export_path,
          settings: this.safeJsonParse(row.settings, {
            resolution: '1080p',
            frameRate: 30,
            quality: 'high',
            format: 'mp4',
          }),
        });
      }

      const byId = new Map<string, Project>();
      for (const p of [...fallbackSorted, ...projects]) {
        if (!p || !p.id) continue;
        const existing = byId.get(p.id);
        if (!existing || (p.updatedAt || 0) > (existing.updatedAt || 0)) {
          byId.set(p.id, p);
        }
      }

      return [...byId.values()].sort(
        (a, b) => (b.updatedAt || 0) - (a.updatedAt || 0),
      );
    } catch (error) {
      console.warn('SQLite getAllProjects failed, using fallback:', error);
      return fallbackSorted;
    }
  }

  static async deleteProject(id: string): Promise<void> {
    if (!this.db) {
      await this.deleteFallbackProject(id);
      return;
    }

    try {
      await this.db.executeSql('DELETE FROM media_clips WHERE project_id = ?', [
        id,
      ]);
      await this.db.executeSql('DELETE FROM projects WHERE id = ?', [id]);
    } catch (error) {
      console.warn('SQLite deleteProject failed, updating fallback:', error);
    } finally {
      this.deleteFallbackProject(id).catch(error =>
        console.warn('Failed to delete project from fallback storage:', error),
      );
    }
  }

  // Media Clip Operations
  private static async saveMediaClip(
    projectId: string,
    clip: MediaClip,
  ): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const query = `
      INSERT OR REPLACE INTO media_clips
      (id, project_id, local_uri, thumbnail_uri, type, duration, start_time, end_time, position, transform_config, filters, volume)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
      clip.id,
      projectId,
      clip.localUri,
      clip.thumbnailUri || null,
      clip.type,
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

  private static async getMediaClips(projectId: string): Promise<MediaClip[]> {
    if (!this.db) throw new Error('Database not initialized');

    const query = 'SELECT * FROM media_clips WHERE project_id = ?';
    const [result] = await this.db.executeSql(query, [projectId]);

    const clips: MediaClip[] = [];
    const mediaDir = `${RNFS.DocumentDirectoryPath}/MotionWeave/videos`;

    for (let i = 0; i < result.rows.length; i++) {
      const row = result.rows.item(i);
      const duration = typeof row.duration === 'number' ? row.duration : 0;

      let localUri: string = row.local_uri;
      let thumbnailUri: string | undefined = row.thumbnail_uri || undefined;

      // Migrate legacy iOS Photo Library URIs (ph://, assets-library://) to local files
      // so that react-native-video can play them reliably.
      if (
        Platform.OS === 'ios' &&
        typeof localUri === 'string' &&
        (localUri.startsWith('ph://') || localUri.startsWith('assets-library://'))
      ) {
        try {
          const destPath = `${mediaDir}/${row.id}.${row.type === 'image' ? 'jpg' : 'mp4'}`;
          const exists = await RNFS.exists(destPath);
          if (!exists) {
            const dirExists = await RNFS.exists(mediaDir);
            if (!dirExists) {
              await RNFS.mkdir(mediaDir, { NSURLIsExcludedFromBackupKey: true });
            }

            if (row.type === 'image') {
              await RNFS.copyAssetsFileIOS(localUri, destPath, 0, 0, 1, 1, 'contain');
            } else {
              await RNFS.copyAssetsVideoIOS(localUri, destPath);
            }
          }

          const migratedUri = `file://${destPath}`;
          localUri = migratedUri;
          thumbnailUri = migratedUri;

          await this.db.executeSql(
            'UPDATE media_clips SET local_uri = ?, thumbnail_uri = ? WHERE id = ?',
            [localUri, thumbnailUri || null, row.id],
          );
        } catch (error) {
          console.warn('Failed to migrate iOS media URI:', error);
        }
      }

      clips.push({
        id: row.id,
        localUri,
        thumbnailUri,
        type: row.type || 'video',
        duration,
        startTime: typeof row.start_time === 'number' ? row.start_time : 0,
        endTime: typeof row.end_time === 'number' ? row.end_time : duration,
        position: this.safeJsonParse(row.position, { row: 0, col: 0 }),
        transform: this.safeJsonParse(row.transform_config, {
          scale: 1,
          translateX: 0,
          translateY: 0,
          rotation: 0,
        }),
        filters: this.safeJsonParse(row.filters, []),
        volume: typeof row.volume === 'number' ? row.volume : 1.0,
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
