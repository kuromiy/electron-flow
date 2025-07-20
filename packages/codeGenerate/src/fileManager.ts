/**
 * Phase 4: ファイル管理システム
 * 安全なファイル操作、ディレクトリ管理、ファイルスキャン機能を提供
 */

import * as fs from 'fs';
import * as path from 'path';
import type { WriteOptions } from './config.js';

/**
 * ファイル操作結果
 */
export interface FileOperationResult {
  success: boolean;
  filePath: string;
  operation: 'write' | 'backup' | 'scan';
  error?: string;
  size?: number;
}

/**
 * ファイル情報
 */
export interface FileInfo {
  path: string;
  name: string;
  extension: string;
  size: number;
  modifiedTime: Date;
}

/**
 * スキャン結果
 */
export interface ScanResult {
  files: FileInfo[];
  totalFiles: number;
  totalSize: number;
  scanTime: number;
}

/**
 * ファイル管理クラス
 */
export class FileManager {
  private operations: FileOperationResult[] = [];

  /**
   * 生成されたファイルを安全に書き込み
   * @param filePath - ファイルパス
   * @param content - ファイル内容
   * @param options - 書き込みオプション
   */
  async writeGeneratedFile(
    filePath: string, 
    content: string, 
    options: WriteOptions = {}
  ): Promise<void> {
    try {
      const absolutePath = path.resolve(filePath);
      
      // ディレクトリの作成
      await this.ensureDirectory(path.dirname(absolutePath));
      
      // 既存ファイルの確認
      const fileExists = await this.fileExists(absolutePath);
      
      if (options.onlyIfNotExists && fileExists) {
        this.logFileOperation('write', absolutePath, 'スキップ（ファイルが既に存在）');
        return;
      }
      
      // バックアップの作成（オプション）
      if (options.createBackup && fileExists) {
        await this.createBackup(absolutePath);
      }
      
      // アトミック書き込み
      await this.atomicWrite(absolutePath, content);
      
      this.logFileOperation('write', absolutePath, '成功');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logFileOperation('write', filePath, `失敗: ${errorMessage}`);
      throw new Error(`ファイル書き込みエラー (${filePath}): ${errorMessage}`);
    }
  }

  /**
   * 対象ファイルをスキャン
   * @param targetPath - 対象ディレクトリパス
   * @param ignores - 除外パターン
   * @param excludePatterns - 追加の除外パターン
   * @returns ファイルパスの配列
   */
  async scanTargetFiles(
    targetPath: string, 
    ignores: string[] = [],
    excludePatterns: string[] = []
  ): Promise<string[]> {
    const startTime = Date.now();
    
    try {
      const absolutePath = path.resolve(targetPath);
      
      if (!await this.directoryExists(absolutePath)) {
        throw new Error(`ディレクトリが存在しません: ${absolutePath}`);
      }
      
      const files = await this.findTypeScriptFiles(absolutePath, excludePatterns);
      
      // ignoresパターンでフィルタリング
      const filteredFiles = files.filter(file => {
        const fileName = path.basename(file, path.extname(file));
        return !ignores.includes(fileName);
      });
      
      const scanTime = Date.now() - startTime;
      console.log(`ファイルスキャン完了: ${filteredFiles.length}個のファイル (${scanTime}ms)`);
      
      return filteredFiles;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`ファイルスキャンエラー: ${errorMessage}`);
    }
  }

  /**
   * 詳細なファイル情報を取得
   * @param targetPath - 対象ディレクトリパス
   * @param excludePatterns - 除外パターン
   * @returns スキャン結果
   */
  async scanWithDetails(targetPath: string, excludePatterns: string[] = []): Promise<ScanResult> {
    const startTime = Date.now();
    
    try {
      const files = await this.findTypeScriptFiles(targetPath, excludePatterns);
      const fileInfos: FileInfo[] = [];
      let totalSize = 0;
      
      for (const filePath of files) {
        const stats = await fs.promises.stat(filePath);
        const fileInfo: FileInfo = {
          path: filePath,
          name: path.basename(filePath),
          extension: path.extname(filePath),
          size: stats.size,
          modifiedTime: stats.mtime
        };
        fileInfos.push(fileInfo);
        totalSize += stats.size;
      }
      
      const scanTime = Date.now() - startTime;
      
      return {
        files: fileInfos,
        totalFiles: fileInfos.length,
        totalSize,
        scanTime
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`詳細スキャンエラー: ${errorMessage}`);
    }
  }

  /**
   * ディレクトリを確実に作成
   * @param dirPath - ディレクトリパス
   */
  private async ensureDirectory(dirPath: string): Promise<void> {
    try {
      await fs.promises.mkdir(dirPath, { recursive: true });
    } catch (error) {
      // ディレクトリが既に存在する場合は無視
      if ((error as { code?: string }).code !== 'EEXIST') {
        throw error;
      }
    }
  }

  /**
   * アトミック書き込み（一時ファイル→リネーム）
   * @param filePath - ファイルパス
   * @param content - 内容
   */
  private async atomicWrite(filePath: string, content: string): Promise<void> {
    const tempFile = `${filePath}.tmp.${Date.now()}`;
    
    try {
      // 一時ファイルに書き込み
      await fs.promises.writeFile(tempFile, content, 'utf8');
      
      // アトミックにリネーム
      await fs.promises.rename(tempFile, filePath);
    } catch (error) {
      // 一時ファイルの削除（失敗を試行）
      try {
        await fs.promises.unlink(tempFile);
      } catch {
        // 削除失敗は無視
      }
      throw error;
    }
  }

  /**
   * バックアップファイルを作成
   * @param filePath - ファイルパス
   */
  private async createBackup(filePath: string): Promise<void> {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupPath = `${filePath}.backup.${timestamp}`;
      
      await fs.promises.copyFile(filePath, backupPath);
      this.logFileOperation('backup', backupPath, '作成完了');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.warn(`バックアップ作成失敗: ${errorMessage}`);
    }
  }

  /**
   * TypeScriptファイルを再帰的に検索（既存パターンの拡張）
   * @param targetPath - 検索対象ディレクトリ
   * @param excludePatterns - 除外パターン
   * @returns TypeScriptファイルのパス配列
   */
  private async findTypeScriptFiles(targetPath: string, excludePatterns: string[] = []): Promise<string[]> {
    const files: string[] = [];
    const defaultExcludes = ['node_modules', 'dist', 'build', '.git', '**/*.d.ts'];
    const excludes = [...defaultExcludes, ...excludePatterns];

    const isExcluded = (filePath: string): boolean => {
      return excludes.some(pattern => {
        // シンプルなパターンマッチング
        if (pattern.includes('*')) {
          const regex = new RegExp(pattern.replace(/\*\*/g, '.*').replace(/\*/g, '[^/]*'));
          return regex.test(filePath);
        }
        return filePath.includes(pattern);
      });
    };

    const scanDirectory = async (dir: string): Promise<void> => {
      if (!await this.directoryExists(dir) || isExcluded(dir)) {
        return;
      }

      try {
        const entries = await fs.promises.readdir(dir, { withFileTypes: true });

        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);

          if (entry.isDirectory()) {
            await scanDirectory(fullPath);
          } else if (entry.isFile() && fullPath.endsWith('.ts') && !fullPath.endsWith('.d.ts')) {
            if (!isExcluded(fullPath)) {
              files.push(fullPath);
            }
          }
        }
      } catch (error) {
        console.warn(`ディレクトリスキャンエラー (${dir}): ${error}`);
      }
    };

    await scanDirectory(targetPath);
    return files;
  }

  /**
   * ファイルの存在確認
   * @param filePath - ファイルパス
   * @returns ファイルが存在するかどうか
   */
  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.promises.access(filePath, fs.constants.F_OK);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * ディレクトリの存在確認
   * @param dirPath - ディレクトリパス
   * @returns ディレクトリが存在するかどうか
   */
  private async directoryExists(dirPath: string): Promise<boolean> {
    try {
      const stats = await fs.promises.stat(dirPath);
      return stats.isDirectory();
    } catch {
      return false;
    }
  }

  /**
   * ファイル操作をログに記録
   * @param operation - 操作タイプ
   * @param filePath - ファイルパス
   * @param status - ステータス
   */
  private logFileOperation(operation: 'write' | 'backup' | 'scan', filePath: string, status?: string): void {
    const timestamp = new Date().toISOString();
    const message = status ? `${operation}: ${filePath} - ${status}` : `${operation}: ${filePath}`;
    
    if (process.env['NODE_ENV'] === 'development') {
      console.log(`[${timestamp}] ${message}`);
    }

    const operationResult: FileOperationResult = {
      success: !status?.includes('失敗'),
      filePath,
      operation
    };
    
    if (status?.includes('失敗')) {
      operationResult.error = status;
    }
    
    this.operations.push(operationResult);
  }

  /**
   * 操作履歴を取得
   * @returns ファイル操作結果の配列
   */
  public getOperationHistory(): FileOperationResult[] {
    return [...this.operations];
  }

  /**
   * 操作履歴をクリア
   */
  public clearOperationHistory(): void {
    this.operations = [];
  }

  /**
   * 操作統計を取得
   */
  public getOperationStats(): { total: number; success: number; failed: number } {
    const total = this.operations.length;
    const success = this.operations.filter(op => op.success).length;
    const failed = total - success;
    
    return { total, success, failed };
  }
}

/**
 * デフォルトのファイルマネージャーインスタンス
 */
export const fileManager = new FileManager();