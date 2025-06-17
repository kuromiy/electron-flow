import { jest } from '@jest/globals';
import { ElectronFlowError, handleCLIError, wrapAsyncCommand } from '../error-handler';

describe('エラーハンドラーテスト', () => {
  let originalConsole: typeof console;

  beforeEach(() => {
    jest.clearAllMocks();
    // コンソールメソッドをモック
    originalConsole = { ...console };
    console.error = jest.fn();
    console.log = jest.fn();
    console.warn = jest.fn();
    console.info = jest.fn();
  });

  afterEach(() => {
    // コンソールメソッドを復元
    console.error = originalConsole.error;
    console.log = originalConsole.log;
    console.warn = originalConsole.warn;
    console.info = originalConsole.info;
  });

  describe('ElectronFlowError', () => {
    it('メッセージとコードでエラーを作成できる', () => {
      const error = new ElectronFlowError('テストエラー', 'TEST_ERROR');
      
      expect(error.message).toBe('テストエラー');
      expect(error.code).toBe('TEST_ERROR');
      expect(error.name).toBe('ElectronFlowError');
    });

    it('メッセージのみでエラーを作成できる', () => {
      const error = new ElectronFlowError('テストエラー');
      
      expect(error.message).toBe('テストエラー');
      expect(error.code).toBeUndefined();
    });
  });

  describe('handleCLIError', () => {
    it('コード付きElectronFlowErrorを処理する', () => {
      const error = new ElectronFlowError('設定エラー', 'CONFIG_ERROR');
      const exitCode = handleCLIError(error);
      
      expect(console.error).toHaveBeenCalledWith('エラー [CONFIG_ERROR]: 設定エラー');
      expect(exitCode).toBe(1);
    });

    it('コードなしElectronFlowErrorを処理する', () => {
      const error = new ElectronFlowError('一般的なエラー');
      const exitCode = handleCLIError(error);
      
      expect(console.error).toHaveBeenCalledWith('エラー: 一般的なエラー');
      expect(exitCode).toBe(1);
    });

    it('一般的なErrorを処理する', () => {
      const error = new Error('一般的なエラー');
      const exitCode = handleCLIError(error);
      
      expect(console.error).toHaveBeenCalledWith('エラー: 一般的なエラー');
      expect(exitCode).toBe(1);
    });

    it('非Errorオブジェクトを処理する', () => {
      const error = '文字列エラー';
      const exitCode = handleCLIError(error);
      
      expect(console.error).toHaveBeenCalledWith('不明なエラー: 文字列エラー');
      expect(exitCode).toBe(1);
    });

    it('null/undefinedエラーを処理する', () => {
      const exitCode1 = handleCLIError(null);
      const exitCode2 = handleCLIError(undefined);
      
      expect(console.error).toHaveBeenCalledWith('不明なエラーが発生しました');
      expect(exitCode1).toBe(1);
      expect(exitCode2).toBe(1);
    });
  });

  describe('wrapAsyncCommand', () => {
    it('成功したコマンドを実行する', async () => {
      const mockCommand = jest.fn().mockResolvedValue(undefined);
      const wrappedCommand = wrapAsyncCommand(mockCommand);
      
      await wrappedCommand({ test: 'option' });
      
      expect(mockCommand).toHaveBeenCalledWith({ test: 'option' });
    });

    it('ElectronFlowErrorを処理して終了する', async () => {
      const mockExit = jest.spyOn(process, 'exit').mockImplementation((() => {}) as any);
      const error = new ElectronFlowError('テストエラー', 'TEST_ERROR');
      const mockCommand = jest.fn().mockRejectedValue(error);
      const wrappedCommand = wrapAsyncCommand(mockCommand);
      
      await wrappedCommand({ test: 'option' });
      
      expect(console.error).toHaveBeenCalledWith('エラー [TEST_ERROR]: テストエラー');
      expect(mockExit).toHaveBeenCalledWith(1);
      
      mockExit.mockRestore();
    });

    it('一般的なエラーを処理して終了する', async () => {
      const mockExit = jest.spyOn(process, 'exit').mockImplementation((() => {}) as any);
      const error = new Error('一般的なエラー');
      const mockCommand = jest.fn().mockRejectedValue(error);
      const wrappedCommand = wrapAsyncCommand(mockCommand);
      
      await wrappedCommand({ test: 'option' });
      
      expect(console.error).toHaveBeenCalledWith('エラー: 一般的なエラー');
      expect(mockExit).toHaveBeenCalledWith(1);
      
      mockExit.mockRestore();
    });

    it('予期しないエラーを処理して終了する', async () => {
      const mockExit = jest.spyOn(process, 'exit').mockImplementation((() => {}) as any);
      const error = '文字列エラー';
      const mockCommand = jest.fn().mockRejectedValue(error);
      const wrappedCommand = wrapAsyncCommand(mockCommand);
      
      await wrappedCommand({ test: 'option' });
      
      expect(console.error).toHaveBeenCalledWith('不明なエラー: 文字列エラー');
      expect(mockExit).toHaveBeenCalledWith(1);
      
      mockExit.mockRestore();
    });
  });
});