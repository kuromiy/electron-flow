import { dev } from '../dev';
import { generate } from '../generate';
import { loadConfig } from '../../config-loader';
import { watch as chokidarWatch } from 'chokidar';
import { debounce } from 'lodash';
import { spawn } from 'child_process';
import { join } from 'path';
import type { DevOptions } from '../../types';
import type { ElectronFlowConfig } from '../../types';
import { ElectronFlowError } from '../../error-handler';

// モックの設定
jest.mock('../generate');
jest.mock('../../config-loader');
jest.mock('chokidar');
jest.mock('lodash');
jest.mock('child_process');
jest.mock('ora', () => {
  return jest.fn(() => ({
    start: jest.fn().mockReturnThis(),
    text: '',
    succeed: jest.fn().mockReturnThis(),
    fail: jest.fn().mockReturnThis(),
    info: jest.fn().mockReturnThis(),
  }));
});

describe('devコマンド', () => {
  const mockGenerate = generate as jest.MockedFunction<typeof generate>;
  const mockLoadConfig = loadConfig as jest.MockedFunction<typeof loadConfig>;
  const mockChokidarWatch = chokidarWatch as jest.MockedFunction<typeof chokidarWatch>;
  const mockDebounce = debounce as jest.MockedFunction<typeof debounce>;
  const mockSpawn = spawn as jest.MockedFunction<typeof spawn>;
  
  const mockConfig: ElectronFlowConfig = {
    handlersDir: './src/handlers',
    outDir: 'dist/generated',
    contextPath: './src/context.ts',
    errorHandlerPath: './src/error-handler.ts',
    dev: {
      electronEntry: './dist/main.js',
      watchPaths: ['./src/custom/**/*.ts']
    }
  };
  
  const mockWatcher = {
    on: jest.fn().mockReturnThis(),
    close: jest.fn(),
  };
  
  // Electronプロセスの正常な起動をシミュレート
  const mockElectronProcess = {
    stdout: {
      on: jest.fn((event, callback) => {
        if (event === 'data') {
          // 即座に起動完了をシミュレート
          setImmediate(() => callback(Buffer.from('Electron started')));
        }
      }),
    },
    stderr: {
      on: jest.fn(),
    },
    on: jest.fn(),
    kill: jest.fn(),
  };
  
  beforeEach(() => {
    jest.clearAllMocks();
    mockLoadConfig.mockResolvedValue(mockConfig);
    mockGenerate.mockResolvedValue();
    mockChokidarWatch.mockReturnValue(mockWatcher as any);
    mockDebounce.mockImplementation((fn) => fn as any);
    mockSpawn.mockReturnValue(mockElectronProcess as any);
    
    // プロセスイベントのモック
    jest.spyOn(process, 'on').mockImplementation();
  });
  
  afterEach(() => {
    jest.restoreAllMocks();
  });
  
  describe('正常系', () => {
    it('設定を読み込んで初期化処理を実行する', async () => {
      const options: DevOptions = {};
      
      // devは永続化するため、短時間後に検証
      const devPromise = dev(options);
      
      // 非同期処理の完了を待つ
      await new Promise(resolve => setImmediate(resolve));
      await new Promise(resolve => setImmediate(resolve));
      
      // 設定の読み込みを確認
      expect(mockLoadConfig).toHaveBeenCalledWith('electron-flow.config.ts');
      
      // 初回生成を確認
      expect(mockGenerate).toHaveBeenCalledWith({ config: undefined });
      
      // ファイル監視の開始を確認
      expect(mockChokidarWatch).toHaveBeenCalledWith(
        expect.arrayContaining([
          join('./src/handlers', '**/*.ts'),
          join('./src/handlers', '**/*.js'),
          './src/context.ts',
          './src/error-handler.ts',
          'electron-flow.config.ts',
          './src/custom/**/*.ts'
        ]),
        expect.objectContaining({
          ignored: expect.arrayContaining([
            '**/node_modules/**',
            '**/.git/**',
            '**/dist/**',
            'dist/generated/**'
          ]),
          ignoreInitial: true,
          persistent: true
        })
      );
      
      // プロセス終了ハンドラーの設定を確認
      expect(process.on).toHaveBeenCalledWith('SIGINT', expect.any(Function));
      expect(process.on).toHaveBeenCalledWith('SIGTERM', expect.any(Function));
      
      // デバウンス関数の設定を確認
      expect(mockDebounce).toHaveBeenCalledWith(expect.any(Function), 500);
    });
    
    it('カスタム設定ファイルを使用する', async () => {
      const options: DevOptions = { config: 'custom.config.ts' };
      
      dev(options);
      
      await new Promise(resolve => setImmediate(resolve));
      await new Promise(resolve => setImmediate(resolve));
      
      expect(mockLoadConfig).toHaveBeenCalledWith('custom.config.ts');
      expect(mockGenerate).toHaveBeenCalledWith({ config: 'custom.config.ts' });
    });
    
    it('デフォルトのElectronエントリーポイントを使用する', async () => {
      const configWithoutDev = {
        ...mockConfig,
        dev: undefined
      };
      mockLoadConfig.mockResolvedValue(configWithoutDev);
      
      const options: DevOptions = {};
      
      dev(options);
      
      await new Promise(resolve => setImmediate(resolve));
      await new Promise(resolve => setImmediate(resolve));
      
      // デフォルトのエントリーポイントでspawnが呼ばれることを確認
      expect(mockSpawn).toHaveBeenCalledWith('npx', ['electron', './dist/main.js'], {
        stdio: ['inherit', 'pipe', 'pipe'],
        shell: true
      });
    });
  });
  
  describe('異常系', () => {
    it('設定ファイルの読み込みに失敗した場合エラーをスロー', async () => {
      mockLoadConfig.mockRejectedValue(new Error('設定ファイルが見つかりません'));
      
      const options: DevOptions = {};
      await expect(dev(options)).rejects.toThrow('開発サーバーの開始に失敗しました: 設定ファイルが見つかりません');
    });
    
    it('初回生成に失敗した場合エラーをスロー', async () => {
      mockGenerate.mockRejectedValue(new Error('生成エラー'));
      
      const options: DevOptions = {};
      await expect(dev(options)).rejects.toThrow('開発サーバーの開始に失敗しました: 生成エラー');
    });
    
    it('Electronプロセスの起動に失敗した場合エラーをスロー', async () => {
      const failingProcess = {
        stdout: { on: jest.fn() },
        stderr: { on: jest.fn() },
        on: jest.fn((event, callback) => {
          if (event === 'error') {
            setImmediate(() => callback(new Error('Electron not found')));
          }
        }),
        kill: jest.fn(),
      };
      
      mockSpawn.mockReturnValue(failingProcess as any);
      
      const options: DevOptions = {};
      await expect(dev(options)).rejects.toThrow('開発サーバーの開始に失敗しました: Electronの起動に失敗: Electron not found');
    });
    
    it('予期しないエラーをElectronFlowErrorとしてラップ', async () => {
      // 非Errorオブジェクトをスロー
      mockLoadConfig.mockRejectedValue('文字列エラー');
      
      const options: DevOptions = {};
      await expect(dev(options)).rejects.toThrow(ElectronFlowError);
      await expect(dev(options)).rejects.toThrow('開発サーバーの開始に失敗しました: 不明なエラー');
    });
  });
});