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

    it('エクスポートされた関数を解析する', async () => {
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

    it('パラメータ付きの関数を正しく解析する', async () => {
      const mockParameter = {
        getName: () => 'data',
        hasQuestionToken: () => false,
        getTypeNode: () => ({ getText: () => 'string' }),
        getInitializer: () => null,
      };

      const mockFunction = {
        getName: () => 'testHandler',
        getParameters: () => [mockParameter],
        getReturnTypeNode: () => ({ getText: () => 'Promise<string>' }),
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
      expect(result[0].parameters[0].name).toBe('data');
      expect(result[0].parameters[0].type.name).toBe('string');
      expect(result[0].returnType.name).toBe('Promise');
    });

    it('JSDocコメントを正しく抽出する', async () => {
      const mockJSDoc = {
        getDescription: () => 'テストハンドラーの説明',
      };

      const mockFunction = {
        getName: () => 'testHandler',
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

      expect(result[0].documentation).toBe('テストハンドラーの説明');
    });

    it('エラーが発生した場合、ElectronFlowErrorをスローする', async () => {
      mockProject.addSourceFilesAtPaths.mockImplementation(() => {
        throw new Error('ファイル読み込みエラー');
      });

      await expect(parser.parseHandlers('/invalid/path')).rejects.toThrow(
        'ハンドラーの解析に失敗しました'
      );
    });
  });

  describe('型解析', () => {
    it('プリミティブ型を正しく識別する', async () => {
      const primitiveTypes = ['string', 'number', 'boolean', 'void'];
      
      for (const type of primitiveTypes) {
        const mockFunction = {
          getName: () => 'testHandler',
          getParameters: () => [],
          getReturnTypeNode: () => ({ getText: () => type }),
          getJsDocs: () => [],
          isAsync: () => false,
          isExported: () => true,
        };

        const mockSourceFile = {
          getFilePath: () => '/test/handlers/test.ts',
          getExportedDeclarations: () => new Map(),
          getExportAssignments: () => [],
          getFunctions: () => [mockFunction],
        };

        mockProject.getSourceFiles.mockReturnValue([mockSourceFile as any]);

        const result = await parser.parseHandlers('/test/handlers');
        expect(result[0].returnType.kind).toBe('primitive');
        expect(result[0].returnType.name).toBe(type);
      }
    });

    it('Promise型を正しく識別する', async () => {
      const mockFunction = {
        getName: () => 'testHandler',
        getParameters: () => [],
        getReturnTypeNode: () => ({ getText: () => 'Promise<string>' }),
        getJsDocs: () => [],
        isAsync: () => false,
        isExported: () => true,
      };

      const mockSourceFile = {
        getFilePath: () => '/test/handlers/test.ts',
        getExportedDeclarations: () => new Map(),
        getExportAssignments: () => [],
        getFunctions: () => [mockFunction],
      };

      mockProject.getSourceFiles.mockReturnValue([mockSourceFile as any]);

      const result = await parser.parseHandlers('/test/handlers');
      expect(result[0].returnType.kind).toBe('promise');
      expect(result[0].returnType.name).toBe('Promise');
      expect(result[0].returnType.typeArguments).toHaveLength(1);
      expect(result[0].returnType.typeArguments![0].name).toBe('string');
    });

    it('配列型を正しく識別する', async () => {
      const mockFunction = {
        getName: () => 'testHandler',
        getParameters: () => [],
        getReturnTypeNode: () => ({ getText: () => 'string[]' }),
        getJsDocs: () => [],
        isAsync: () => false,
        isExported: () => true,
      };

      const mockSourceFile = {
        getFilePath: () => '/test/handlers/test.ts',
        getExportedDeclarations: () => new Map(),
        getExportAssignments: () => [],
        getFunctions: () => [mockFunction],
      };

      mockProject.getSourceFiles.mockReturnValue([mockSourceFile as any]);

      const result = await parser.parseHandlers('/test/handlers');
      expect(result[0].returnType.kind).toBe('array');
      expect(result[0].returnType.name).toBe('Array');
      expect(result[0].returnType.elementType?.name).toBe('string');
    });

    it('ユニオン型を正しく識別する', async () => {
      const mockFunction = {
        getName: () => 'testHandler',
        getParameters: () => [],
        getReturnTypeNode: () => ({ getText: () => 'string | number' }),
        getJsDocs: () => [],
        isAsync: () => false,
        isExported: () => true,
      };

      const mockSourceFile = {
        getFilePath: () => '/test/handlers/test.ts',
        getExportedDeclarations: () => new Map(),
        getExportAssignments: () => [],
        getFunctions: () => [mockFunction],
      };

      mockProject.getSourceFiles.mockReturnValue([mockSourceFile as any]);

      const result = await parser.parseHandlers('/test/handlers');
      expect(result[0].returnType.kind).toBe('union');
      expect(result[0].returnType.unionTypes).toHaveLength(2);
    });

    it('async関数の戻り値をPromise型として推論する', async () => {
      const mockFunction = {
        getName: () => 'testHandler',
        getParameters: () => [],
        getReturnTypeNode: () => null,
        getJsDocs: () => [],
        isAsync: () => true,
        isExported: () => true,
      };

      const mockSourceFile = {
        getFilePath: () => '/test/handlers/test.ts',
        getExportedDeclarations: () => new Map(),
        getExportAssignments: () => [],
        getFunctions: () => [mockFunction],
      };

      mockProject.getSourceFiles.mockReturnValue([mockSourceFile as any]);

      const result = await parser.parseHandlers('/test/handlers');
      expect(result[0].returnType.kind).toBe('promise');
      expect(result[0].returnType.name).toBe('Promise');
    });

    it('オプショナルパラメータを正しく識別する', async () => {
      const mockParameter = {
        getName: () => 'optionalParam',
        hasQuestionToken: () => true,
        getTypeNode: () => ({ getText: () => 'string' }),
        getInitializer: () => null,
      };

      const mockFunction = {
        getName: () => 'testHandler',
        getParameters: () => [mockParameter],
        getReturnTypeNode: () => null,
        getJsDocs: () => [],
        isAsync: () => false,
        isExported: () => true,
      };

      const mockSourceFile = {
        getFilePath: () => '/test/handlers/test.ts',
        getExportedDeclarations: () => new Map(),
        getExportAssignments: () => [],
        getFunctions: () => [mockFunction],
      };

      mockProject.getSourceFiles.mockReturnValue([mockSourceFile as any]);

      const result = await parser.parseHandlers('/test/handlers');
      expect(result[0].parameters[0].optional).toBe(true);
    });
  });
});