import { generate } from '../generate';
import { loadConfig } from '../../config-loader';
import { Parser, Generator } from '../../../generator';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import type { GenerateOptions } from '../../types';
import type { ElectronFlowConfig } from '../../types';

// モックの設定
jest.mock('../../config-loader');
jest.mock('../../../generator');
jest.mock('fs/promises');
jest.mock('fs');
jest.mock('ora', () => {
  return jest.fn(() => ({
    start: jest.fn().mockReturnThis(),
    text: '',
    succeed: jest.fn().mockReturnThis(),
    fail: jest.fn().mockReturnThis(),
    warn: jest.fn().mockReturnThis(),
  }));
});

describe('generateコマンド', () => {
  const mockLoadConfig = loadConfig as jest.MockedFunction<typeof loadConfig>;
  const mockWriteFile = writeFile as jest.MockedFunction<typeof writeFile>;
  const mockMkdir = mkdir as jest.MockedFunction<typeof mkdir>;
  const mockExistsSync = existsSync as jest.MockedFunction<typeof existsSync>;
  
  const mockConfig: ElectronFlowConfig = {
    handlersDir: './src/handlers',
    outDir: 'dist/generated',
    contextPath: './src/context.ts',
    errorHandlerPath: './src/error-handler.ts',
  };
  
  const mockHandlers = [
    {
      name: 'testHandler',
      parameters: [
        { name: 'param1', type: 'string', optional: false }
      ],
      returnType: 'Promise<Result<string>>',
      filePath: 'test.ts',
      documentation: 'テストハンドラー'
    }
  ];
  
  beforeEach(() => {
    jest.clearAllMocks();
    mockLoadConfig.mockResolvedValue(mockConfig);
    mockExistsSync.mockReturnValue(false);
  });
  
  describe('正常系', () => {
    it('ハンドラーからIPCコードを生成する', async () => {
      // Parser モックの設定
      const mockParseHandlers = jest.fn().mockResolvedValue(mockHandlers);
      (Parser as jest.MockedClass<typeof Parser>).mockImplementation(() => ({
        parseHandlers: mockParseHandlers,
      } as any));
      
      // Generator モックの設定
      const mockGenerateCode = jest.fn()
        .mockResolvedValueOnce({ code: 'main code', imports: [] })
        .mockResolvedValueOnce({ code: 'preload code', imports: [] })
        .mockResolvedValueOnce({ code: 'renderer code', imports: [] });
      
      (Generator as jest.MockedClass<typeof Generator>).mockImplementation(() => ({
        generateCode: mockGenerateCode,
      } as any));
      
      const options: GenerateOptions = {};
      await generate(options);
      
      // 設定の読み込みを確認
      expect(mockLoadConfig).toHaveBeenCalledWith('electron-flow.config.ts');
      
      // ハンドラーの解析を確認
      expect(mockParseHandlers).toHaveBeenCalledWith('./src/handlers');
      
      // コード生成を確認
      expect(mockGenerateCode).toHaveBeenCalledTimes(3);
      expect(mockGenerateCode).toHaveBeenCalledWith(mockHandlers, 'main', mockConfig);
      expect(mockGenerateCode).toHaveBeenCalledWith(mockHandlers, 'preload', mockConfig);
      expect(mockGenerateCode).toHaveBeenCalledWith(mockHandlers, 'renderer', mockConfig);
      
      // ディレクトリ作成を確認
      expect(mockMkdir).toHaveBeenCalledWith('dist/generated', { recursive: true });
      
      // ファイル書き込みを確認
      expect(mockWriteFile).toHaveBeenCalledTimes(3);
      expect(mockWriteFile).toHaveBeenCalledWith(join('dist/generated', 'ipc-main.ts'), 'main code', 'utf-8');
      expect(mockWriteFile).toHaveBeenCalledWith(join('dist/generated', 'ipc-preload.ts'), 'preload code', 'utf-8');
      expect(mockWriteFile).toHaveBeenCalledWith(join('dist/generated', 'ipc-renderer.ts'), 'renderer code', 'utf-8');
    });
    
    it('カスタム設定ファイルを使用する', async () => {
      const mockParseHandlers = jest.fn().mockResolvedValue(mockHandlers);
      (Parser as jest.MockedClass<typeof Parser>).mockImplementation(() => ({
        parseHandlers: mockParseHandlers,
      } as any));
      
      const mockGenerateCode = jest.fn()
        .mockResolvedValue({ code: 'test code', imports: [] });
      
      (Generator as jest.MockedClass<typeof Generator>).mockImplementation(() => ({
        generateCode: mockGenerateCode,
      } as any));
      
      const options: GenerateOptions = { config: 'custom.config.ts' };
      await generate(options);
      
      expect(mockLoadConfig).toHaveBeenCalledWith('custom.config.ts');
    });
    
    it('ドライランモードでファイルを書き込まない', async () => {
      const mockParseHandlers = jest.fn().mockResolvedValue(mockHandlers);
      (Parser as jest.MockedClass<typeof Parser>).mockImplementation(() => ({
        parseHandlers: mockParseHandlers,
      } as any));
      
      const mockGenerateCode = jest.fn()
        .mockResolvedValue({ code: 'test code', imports: [] });
      
      (Generator as jest.MockedClass<typeof Generator>).mockImplementation(() => ({
        generateCode: mockGenerateCode,
      } as any));
      
      const options: GenerateOptions = { dryRun: true };
      await generate(options);
      
      // ファイルが書き込まれないことを確認
      expect(mockWriteFile).not.toHaveBeenCalled();
      expect(mockMkdir).not.toHaveBeenCalled();
    });
    
    it('ハンドラーが見つからない場合は警告を表示', async () => {
      const mockParseHandlers = jest.fn().mockResolvedValue([]);
      (Parser as jest.MockedClass<typeof Parser>).mockImplementation(() => ({
        parseHandlers: mockParseHandlers,
      } as any));
      
      const options: GenerateOptions = {};
      await generate(options);
      
      // コード生成が呼ばれないことを確認
      expect(Generator).not.toHaveBeenCalled();
      expect(mockWriteFile).not.toHaveBeenCalled();
    });
    
    it('出力ディレクトリが既に存在する場合はスキップ', async () => {
      mockExistsSync.mockReturnValue(true);
      
      const mockParseHandlers = jest.fn().mockResolvedValue(mockHandlers);
      (Parser as jest.MockedClass<typeof Parser>).mockImplementation(() => ({
        parseHandlers: mockParseHandlers,
      } as any));
      
      const mockGenerateCode = jest.fn()
        .mockResolvedValue({ code: 'test code', imports: [] });
      
      (Generator as jest.MockedClass<typeof Generator>).mockImplementation(() => ({
        generateCode: mockGenerateCode,
      } as any));
      
      const options: GenerateOptions = {};
      await generate(options);
      
      // ディレクトリ作成がスキップされることを確認
      expect(mockMkdir).not.toHaveBeenCalled();
    });
  });
  
  describe('異常系', () => {
    it('設定ファイルの読み込みに失敗した場合エラーをスロー', async () => {
      mockLoadConfig.mockRejectedValue(new Error('設定ファイルが見つかりません'));
      
      const options: GenerateOptions = {};
      await expect(generate(options)).rejects.toThrow('コード生成に失敗しました: 設定ファイルが見つかりません');
    });
    
    it('ハンドラーの解析に失敗した場合エラーをスロー', async () => {
      const mockParseHandlers = jest.fn().mockRejectedValue(new Error('解析エラー'));
      (Parser as jest.MockedClass<typeof Parser>).mockImplementation(() => ({
        parseHandlers: mockParseHandlers,
      } as any));
      
      const options: GenerateOptions = {};
      await expect(generate(options)).rejects.toThrow('コード生成に失敗しました: 解析エラー');
    });
    
    it('コード生成に失敗した場合エラーをスロー', async () => {
      const mockParseHandlers = jest.fn().mockResolvedValue(mockHandlers);
      (Parser as jest.MockedClass<typeof Parser>).mockImplementation(() => ({
        parseHandlers: mockParseHandlers,
      } as any));
      
      const mockGenerateCode = jest.fn().mockRejectedValue(new Error('生成エラー'));
      (Generator as jest.MockedClass<typeof Generator>).mockImplementation(() => ({
        generateCode: mockGenerateCode,
      } as any));
      
      const options: GenerateOptions = {};
      await expect(generate(options)).rejects.toThrow('コード生成に失敗しました: 生成エラー');
    });
    
    it('ファイル書き込みに失敗した場合エラーをスロー', async () => {
      const mockParseHandlers = jest.fn().mockResolvedValue(mockHandlers);
      (Parser as jest.MockedClass<typeof Parser>).mockImplementation(() => ({
        parseHandlers: mockParseHandlers,
      } as any));
      
      const mockGenerateCode = jest.fn()
        .mockResolvedValue({ code: 'test code', imports: [] });
      
      (Generator as jest.MockedClass<typeof Generator>).mockImplementation(() => ({
        generateCode: mockGenerateCode,
      } as any));
      
      mockWriteFile.mockRejectedValue(new Error('書き込みエラー'));
      
      const options: GenerateOptions = {};
      await expect(generate(options)).rejects.toThrow('コード生成に失敗しました: 書き込みエラー');
    });
  });
});