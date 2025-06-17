import { init } from '../init';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import { ElectronFlowError } from '../../error-handler';
import type { InitOptions } from '../../types';

// モックの設定
jest.mock('fs/promises');
jest.mock('fs');
jest.mock('ora', () => {
  return jest.fn(() => ({
    start: jest.fn().mockReturnThis(),
    text: '',
    succeed: jest.fn().mockReturnThis(),
    fail: jest.fn().mockReturnThis(),
  }));
});

describe('initコマンド', () => {
  const mockWriteFile = writeFile as jest.MockedFunction<typeof writeFile>;
  const mockMkdir = mkdir as jest.MockedFunction<typeof mkdir>;
  const mockExistsSync = existsSync as jest.MockedFunction<typeof existsSync>;
  
  beforeEach(() => {
    jest.clearAllMocks();
    mockExistsSync.mockReturnValue(false);
  });
  
  describe('正常系', () => {
    it('新しいプロジェクトを初期化する', async () => {
      const options: InitOptions = {};
      await init(options);
      
      // ディレクトリ作成を確認
      expect(mockMkdir).toHaveBeenCalledWith('src/main/handlers', { recursive: true });
      expect(mockMkdir).toHaveBeenCalledWith('src/generated', { recursive: true });
      expect(mockMkdir).toHaveBeenCalledWith('src/main', { recursive: true });
      expect(mockMkdir).toHaveBeenCalledWith('src/renderer', { recursive: true });
      
      // ファイル作成を確認
      expect(mockWriteFile).toHaveBeenCalledTimes(4);
      
      // 設定ファイルの作成を確認
      const configCall = mockWriteFile.mock.calls.find(
        call => call[0] === 'electron-flow.config.ts'
      );
      expect(configCall).toBeDefined();
      expect(configCall![1]).toContain('ElectronFlowConfig');
      expect(configCall![1]).toContain('handlersDir');
      expect(configCall![1]).toContain('outDir');
      
      // Context型ファイルの作成を確認
      const contextCall = mockWriteFile.mock.calls.find(
        call => call[0] === join('src/main', 'context.ts')
      );
      expect(contextCall).toBeDefined();
      expect(contextCall![1]).toContain('interface Context');
      expect(contextCall![1]).toContain('IpcMainInvokeEvent');
      
      // エラーハンドラーファイルの作成を確認
      const errorHandlerCall = mockWriteFile.mock.calls.find(
        call => call[0] === join('src/main', 'error-handler.ts')
      );
      expect(errorHandlerCall).toBeDefined();
      expect(errorHandlerCall![1]).toContain('handleError');
      expect(errorHandlerCall![1]).toContain('failure');
      
      // サンプルハンドラーファイルの作成を確認
      const sampleHandlerCall = mockWriteFile.mock.calls.find(
        call => call[0] === join('src/main/handlers', 'sample.ts')
      );
      expect(sampleHandlerCall).toBeDefined();
      expect(sampleHandlerCall![1]).toContain('export async function add');
      expect(sampleHandlerCall![1]).toContain('export async function getCurrentTime');
    });
    
    it('forceオプションで既存ファイルを上書きする', async () => {
      mockExistsSync.mockReturnValue(true);
      
      const options: InitOptions = { force: true };
      await init(options);
      
      // 全てのファイルが作成されることを確認
      expect(mockWriteFile).toHaveBeenCalledTimes(4);
    });
    
    it('既存のディレクトリはスキップする', async () => {
      // ディレクトリは存在するがファイルは存在しない
      mockExistsSync.mockImplementation((path) => {
        if (typeof path === 'string' && !path.endsWith('.ts')) {
          return true; // ディレクトリ
        }
        return false; // ファイル
      });
      
      const options: InitOptions = {};
      await init(options);
      
      // ディレクトリ作成がスキップされることを確認
      expect(mockMkdir).not.toHaveBeenCalled();
    });
    
    it('既存のファイルはスキップする（forceなし）', async () => {
      // context.tsとerror-handler.tsが既に存在する
      mockExistsSync.mockImplementation((path) => {
        if (typeof path === 'string' && 
            (path.includes('context.ts') || path.includes('error-handler.ts'))) {
          return true;
        }
        return false;
      });
      
      const options: InitOptions = {};
      await init(options);
      
      // 設定ファイルとサンプルハンドラーのみ作成されることを確認
      expect(mockWriteFile).toHaveBeenCalledTimes(2);
      
      const writtenFiles = mockWriteFile.mock.calls.map(call => call[0]);
      expect(writtenFiles).toContain('electron-flow.config.ts');
      expect(writtenFiles).toContain(join('src/main/handlers', 'sample.ts'));
      expect(writtenFiles).not.toContain(join('src/main', 'context.ts'));
      expect(writtenFiles).not.toContain(join('src/main', 'error-handler.ts'));
    });
  });
  
  describe('異常系', () => {
    it('設定ファイルが既に存在する場合エラーをスロー', async () => {
      mockExistsSync.mockImplementation((path) => {
        return path === 'electron-flow.config.ts';
      });
      
      const options: InitOptions = {};
      await expect(init(options)).rejects.toThrow(ElectronFlowError);
      await expect(init(options)).rejects.toThrow('設定ファイルが既に存在します');
      
      // ファイルが作成されないことを確認
      expect(mockWriteFile).not.toHaveBeenCalled();
    });
    
    it('ディレクトリ作成に失敗した場合エラーをスロー', async () => {
      mockMkdir.mockRejectedValue(new Error('Permission denied'));
      
      const options: InitOptions = {};
      await expect(init(options)).rejects.toThrow('初期化に失敗しました: Permission denied');
    });
    
    it('ファイル書き込みに失敗した場合エラーをスロー', async () => {
      mockWriteFile.mockRejectedValue(new Error('Disk full'));
      
      const options: InitOptions = {};
      await expect(init(options)).rejects.toThrow('初期化に失敗しました: Disk full');
    });
    
    it('予期しないエラーをElectronFlowErrorとしてラップ', async () => {
      // 非Errorオブジェクトをスロー
      mockWriteFile.mockRejectedValue('文字列エラー');
      
      const options: InitOptions = {};
      await expect(init(options)).rejects.toThrow(ElectronFlowError);
      await expect(init(options)).rejects.toThrow('初期化に失敗しました: 不明なエラー');
    });
  });
});