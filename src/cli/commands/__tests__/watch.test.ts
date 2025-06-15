import { watch } from '../watch';
import { generate } from '../generate';
import { loadConfig } from '../../config-loader';
import { watch as chokidarWatch } from 'chokidar';
import { debounce } from 'lodash';
import { join } from 'path';
import type { WatchOptions } from '../../types';
import type { ElectronFlowConfig } from '../../types';

// モックの設定
jest.mock('../generate');
jest.mock('../../config-loader');
jest.mock('chokidar');
jest.mock('lodash');
jest.mock('ora', () => {
  return jest.fn(() => ({
    start: jest.fn().mockReturnThis(),
    text: '',
    succeed: jest.fn().mockReturnThis(),
    fail: jest.fn().mockReturnThis(),
    info: jest.fn().mockReturnThis(),
  }));
});

describe('watchコマンド', () => {
  const mockGenerate = generate as jest.MockedFunction<typeof generate>;
  const mockLoadConfig = loadConfig as jest.MockedFunction<typeof loadConfig>;
  const mockChokidarWatch = chokidarWatch as jest.MockedFunction<typeof chokidarWatch>;
  const mockDebounce = debounce as jest.MockedFunction<typeof debounce>;
  
  const mockConfig: ElectronFlowConfig = {
    handlersDir: './src/handlers',
    outDir: 'dist/generated',
    contextPath: './src/context.ts',
    errorHandlerPath: './src/error-handler.ts',
  };
  
  const mockWatcher = {
    on: jest.fn().mockReturnThis(),
    close: jest.fn(),
  };
  
  beforeEach(() => {
    jest.clearAllMocks();
    mockLoadConfig.mockResolvedValue(mockConfig);
    mockGenerate.mockResolvedValue();
    mockChokidarWatch.mockReturnValue(mockWatcher as any);
    mockDebounce.mockImplementation((fn) => fn as any);
    
    // プロセスイベントのモック
    jest.spyOn(process, 'on').mockImplementation();
  });
  
  afterEach(() => {
    jest.restoreAllMocks();
  });
  
  describe('正常系', () => {
    it('設定を読み込んで監視を開始する', async () => {
      const options: WatchOptions = {};
      
      // watchは永続化するため、すぐにresolveしないPromiseを返す
      const watchPromise = watch(options);
      
      // 少し待ってから検証
      await new Promise(resolve => setTimeout(resolve, 10));
      
      // 設定の読み込みを確認
      expect(mockLoadConfig).toHaveBeenCalledWith('electron-flow.config.ts');
      
      // 初回生成を確認
      expect(mockGenerate).toHaveBeenCalledWith({ config: undefined });
      
      // chokidarの監視開始を確認
      expect(mockChokidarWatch).toHaveBeenCalledWith(
        expect.arrayContaining([
          join('./src/handlers', '**/*.ts'),
          join('./src/handlers', '**/*.js'),
          './src/context.ts',
          './src/error-handler.ts',
          'electron-flow.config.ts'
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
      
      // イベントリスナーの設定を確認
      expect(mockWatcher.on).toHaveBeenCalledWith('change', expect.any(Function));
      expect(mockWatcher.on).toHaveBeenCalledWith('add', expect.any(Function));
      expect(mockWatcher.on).toHaveBeenCalledWith('unlink', expect.any(Function));
      expect(mockWatcher.on).toHaveBeenCalledWith('error', expect.any(Function));
      
      // プロセス終了ハンドラーの設定を確認
      expect(process.on).toHaveBeenCalledWith('SIGINT', expect.any(Function));
      expect(process.on).toHaveBeenCalledWith('SIGTERM', expect.any(Function));
      
      // デバウンス関数の設定を確認
      expect(mockDebounce).toHaveBeenCalledWith(expect.any(Function), 300);
    });
    
    it('カスタム設定ファイルを使用する', async () => {
      const options: WatchOptions = { config: 'custom.config.ts' };
      
      watch(options);
      
      await new Promise(resolve => setTimeout(resolve, 10));
      
      expect(mockLoadConfig).toHaveBeenCalledWith('custom.config.ts');
      expect(mockGenerate).toHaveBeenCalledWith({ config: 'custom.config.ts' });
    });
    
    it('ファイル変更時にコード再生成を実行する', async () => {
      const options: WatchOptions = {};
      
      watch(options);
      
      await new Promise(resolve => setTimeout(resolve, 10));
      
      // changeイベントのコールバックを取得
      const changeCallback = mockWatcher.on.mock.calls.find(
        call => call[0] === 'change'
      )?.[1];
      
      expect(changeCallback).toBeDefined();
      
      // ファイル変更をシミュレート
      if (changeCallback) {
        await changeCallback('src/handlers/test.ts');
        
        // 再生成が呼ばれることを確認（初回 + 変更時）
        expect(mockGenerate).toHaveBeenCalledTimes(2);
      }
    });
    
    it('ファイル追加時にコード再生成を実行する', async () => {
      const options: WatchOptions = {};
      
      watch(options);
      
      await new Promise(resolve => setTimeout(resolve, 10));
      
      // addイベントのコールバックを取得
      const addCallback = mockWatcher.on.mock.calls.find(
        call => call[0] === 'add'
      )?.[1];
      
      expect(addCallback).toBeDefined();
      
      // ファイル追加をシミュレート
      if (addCallback) {
        await addCallback('src/handlers/new.ts');
        
        // 再生成が呼ばれることを確認（初回 + 追加時）
        expect(mockGenerate).toHaveBeenCalledTimes(2);
      }
    });
    
    it('ファイル削除時にコード再生成を実行する', async () => {
      const options: WatchOptions = {};
      
      watch(options);
      
      await new Promise(resolve => setTimeout(resolve, 10));
      
      // unlinkイベントのコールバックを取得
      const unlinkCallback = mockWatcher.on.mock.calls.find(
        call => call[0] === 'unlink'
      )?.[1];
      
      expect(unlinkCallback).toBeDefined();
      
      // ファイル削除をシミュレート
      if (unlinkCallback) {
        await unlinkCallback('src/handlers/deleted.ts');
        
        // 再生成が呼ばれることを確認（初回 + 削除時）
        expect(mockGenerate).toHaveBeenCalledTimes(2);
      }
    });
  });
  
  describe('異常系', () => {
    it('設定ファイルの読み込みに失敗した場合エラーをスロー', async () => {
      mockLoadConfig.mockRejectedValue(new Error('設定ファイルが見つかりません'));
      
      const options: WatchOptions = {};
      await expect(watch(options)).rejects.toThrow('監視の開始に失敗しました: 設定ファイルが見つかりません');
    });
    
    it('初回生成に失敗した場合エラーをスロー', async () => {
      mockGenerate.mockRejectedValue(new Error('生成エラー'));
      
      const options: WatchOptions = {};
      await expect(watch(options)).rejects.toThrow('監視の開始に失敗しました: 生成エラー');
    });
    
    it('監視中の再生成でエラーが発生してもプロセスは継続する', async () => {
      const options: WatchOptions = {};
      
      // 初回は成功、2回目は失敗させる
      mockGenerate
        .mockResolvedValueOnce()
        .mockRejectedValueOnce(new Error('再生成エラー'));
      
      watch(options);
      
      await new Promise(resolve => setTimeout(resolve, 10));
      
      // changeイベントのコールバックを取得して実行
      const changeCallback = mockWatcher.on.mock.calls.find(
        call => call[0] === 'change'
      )?.[1];
      
      if (changeCallback) {
        // エラーが発生してもプロセスは継続する（例外はスローされない）
        expect(() => changeCallback('src/handlers/test.ts')).not.toThrow();
      }
    });
    
    it('予期しないエラーをElectronFlowErrorとしてラップ', async () => {
      // 非Errorオブジェクトをスロー
      mockLoadConfig.mockRejectedValue('文字列エラー');
      
      const options: WatchOptions = {};
      await expect(watch(options)).rejects.toThrow('監視の開始に失敗しました: 不明なエラー');
    });
  });
});