import { Parser } from '../parser';
import { Project } from 'ts-morph';

// ts-morphのモック
jest.mock('ts-morph');

describe('Parser', () => {
  let parser: Parser;
  let mockProject: jest.Mocked<Project>;

  beforeEach(() => {
    mockProject = {
      addSourceFilesAtPaths: jest.fn(),
      getSourceFiles: jest.fn(),
    } as any;

    (Project as jest.MockedClass<typeof Project>).mockImplementation(() => mockProject);
    parser = new Parser();
  });

  describe('parseHandlers', () => {
    it('ハンドラーディレクトリが空の場合、空配列を返す', async () => {
      mockProject.getSourceFiles.mockReturnValue([]);

      const result = await parser.parseHandlers('/test/handlers');

      expect(result).toEqual([]);
      expect(mockProject.addSourceFilesAtPaths).toHaveBeenCalledWith('/test/handlers/**/*.ts');
    });

    it('基本的な関数を解析する', async () => {
      const mockFunction = {
        getName: () => 'testHandler',
        getParameters: () => [],
        getReturnTypeNode: () => null,
        getJsDocs: () => [],
        isAsync: () => false,
        isExported: () => true,
      };

      const mockSourceFile = {
        getFilePath: () => '/test/handlers/test.ts',
        getFunctions: () => [mockFunction],
        getExportedDeclarations: () => new Map(),
      };

      mockProject.getSourceFiles.mockReturnValue([mockSourceFile as any]);

      const result = await parser.parseHandlers('/test/handlers');

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('testHandler');
      expect(result[0].filePath).toBe('/test/handlers/test.ts');
    });

    it('名前のない関数をスキップする', async () => {
      const mockFunction = {
        getName: () => undefined,
        getParameters: () => [],
        getReturnTypeNode: () => null,
        getJsDocs: () => [],
        isAsync: () => false,
        isExported: () => true,
      };

      const mockSourceFile = {
        getFilePath: () => '/test/handlers/test.ts',
        getFunctions: () => [mockFunction],
        getExportedDeclarations: () => new Map(),
      };

      mockProject.getSourceFiles.mockReturnValue([mockSourceFile as any]);

      const result = await parser.parseHandlers('/test/handlers');

      expect(result).toHaveLength(0);
    });

    it('エクスポートされていない関数をスキップする', async () => {
      const mockFunction = {
        getName: () => 'privateHandler',
        getParameters: () => [],
        getReturnTypeNode: () => null,
        getJsDocs: () => [],
        isAsync: () => false,
        isExported: () => false,
      };

      const mockSourceFile = {
        getFilePath: () => '/test/handlers/test.ts',
        getFunctions: () => [mockFunction],
        getExportedDeclarations: () => new Map(),
      };

      mockProject.getSourceFiles.mockReturnValue([mockSourceFile as any]);

      const result = await parser.parseHandlers('/test/handlers');

      expect(result).toHaveLength(0);
    });

    it('JSDocコメントを正しく解析する', async () => {
      const mockJSDoc = {
        getDescription: () => 'テストハンドラーの説明',
      };

      const mockFunction = {
        getName: () => 'documentedHandler',
        getParameters: () => [],
        getReturnTypeNode: () => null,
        getJsDocs: () => [mockJSDoc],
        isAsync: () => false,
        isExported: () => true,
      };

      const mockSourceFile = {
        getFilePath: () => '/test/handlers/test.ts',
        getFunctions: () => [mockFunction],
        getExportedDeclarations: () => new Map(),
      };

      mockProject.getSourceFiles.mockReturnValue([mockSourceFile as any]);

      const result = await parser.parseHandlers('/test/handlers');

      expect(result).toHaveLength(1);
      expect(result[0].documentation).toBe('テストハンドラーの説明');
    });

    it('パラメータ付き関数を解析する', async () => {
      const mockParameter = {
        getName: () => 'param1',
        hasQuestionToken: () => false,
        getTypeNode: () => ({ getText: () => 'string' }),
        getInitializer: () => undefined,
      };

      const mockFunction = {
        getName: () => 'handlerWithParams',
        getParameters: () => [mockParameter],
        getReturnTypeNode: () => ({ getText: () => 'Promise<void>' }),
        getJsDocs: () => [],
        isAsync: () => true,
        isExported: () => true,
      };

      const mockSourceFile = {
        getFilePath: () => '/test/handlers/test.ts',
        getFunctions: () => [mockFunction],
        getExportedDeclarations: () => new Map(),
      };

      mockProject.getSourceFiles.mockReturnValue([mockSourceFile as any]);

      const result = await parser.parseHandlers('/test/handlers');

      expect(result).toHaveLength(1);
      expect(result[0].parameters).toHaveLength(1);
      expect(result[0].parameters[0].name).toBe('param1');
      expect(result[0].parameters[0].type.name).toBe('string');
      expect(result[0].returnType.name).toBe('Promise');
    });

    it('オプショナルパラメータを解析する', async () => {
      const mockParameter = {
        getName: () => 'optionalParam',
        hasQuestionToken: () => true,
        getTypeNode: () => ({ getText: () => 'number' }),
        getInitializer: () => ({ getText: () => '42' }),
      };

      const mockFunction = {
        getName: () => 'handlerWithOptional',
        getParameters: () => [mockParameter],
        getReturnTypeNode: () => null,
        getJsDocs: () => [],
        isAsync: () => false,
        isExported: () => true,
      };

      const mockSourceFile = {
        getFilePath: () => '/test/handlers/test.ts',
        getFunctions: () => [mockFunction],
        getExportedDeclarations: () => new Map(),
      };

      mockProject.getSourceFiles.mockReturnValue([mockSourceFile as any]);

      const result = await parser.parseHandlers('/test/handlers');

      expect(result).toHaveLength(1);
      expect(result[0].parameters[0].optional).toBe(true);
      expect(result[0].parameters[0].defaultValue).toBe('42');
    });

    it('エラー時にElectronFlowErrorをスローする', async () => {
      mockProject.addSourceFilesAtPaths.mockImplementation(() => {
        throw new Error('ファイル読み込みエラー');
      });

      await expect(parser.parseHandlers('/test/handlers'))
        .rejects.toThrow('ハンドラーの解析に失敗しました');
    });

    it('型ノードなしのパラメータを処理する', async () => {
      const mockParameter = {
        getName: () => 'untypedParam',
        hasQuestionToken: () => false,
        getTypeNode: () => null,
        getInitializer: () => undefined,
      };

      const mockFunction = {
        getName: () => 'handlerWithUntypedParam',
        getParameters: () => [mockParameter],
        getReturnTypeNode: () => null,
        getJsDocs: () => [],
        isAsync: () => false,
        isExported: () => true,
      };

      const mockSourceFile = {
        getFilePath: () => '/test/handlers/test.ts',
        getFunctions: () => [mockFunction],
        getExportedDeclarations: () => new Map(),
      };

      mockProject.getSourceFiles.mockReturnValue([mockSourceFile as any]);

      const result = await parser.parseHandlers('/test/handlers');

      expect(result).toHaveLength(1);
      expect(result[0].parameters[0].type.kind).toBe('unknown');
    });
  });
});