import { Generator } from '../generator';
import type { ParsedHandler } from '../types';

describe('Generator', () => {
  let generator: Generator;
  
  beforeEach(() => {
    generator = new Generator();
  });

  const createMockHandler = (overrides: Partial<ParsedHandler> = {}): ParsedHandler => ({
    name: 'testHandler',
    parameters: [],
    returnType: { name: 'string', kind: 'primitive' },
    filePath: '/test/handlers/test.ts',
    documentation: 'テストハンドラー',
    ...overrides,
  });

  describe('generateCode', () => {
    it('サポートされていないターゲットでエラーをスローする', () => {
      const handlers = [createMockHandler()];
      
      expect(() => {
        generator.generateCode(handlers, 'invalid' as any);
      }).toThrow('サポートされていないターゲット');
    });
  });

  describe('メインプロセス生成', () => {
    it('基本的なハンドラーのコードを生成する', () => {
      const handlers = [createMockHandler()];
      
      const result = generator.generateCode(handlers, 'main');
      
      expect(result.target).toBe('main');
      expect(result.code).toContain('ipcMain.handle');
      expect(result.code).toContain('testHandler');
      expect(result.code).toContain('success(result)');
      expect(result.code).toContain('handleError');
      expect(result.imports).toContain("import { ipcMain, IpcMainInvokeEvent } from 'electron';");
      expect(result.imports).toContain("import { success, failure, handleError } from 'electron-flow/runtime';");
    });

    it('パラメータ付きハンドラーのコードを生成する', () => {
      const handlers = [createMockHandler({
        parameters: [
          {
            name: 'data',
            type: { name: 'string', kind: 'primitive' },
            optional: false,
          },
        ],
      })];
      
      const result = generator.generateCode(handlers, 'main');
      
      expect(result.code).toContain('await testHandler({ ...ctx, event }, args)');
      expect(result.code).toContain('args.data === undefined');
    });

    it('オプショナルパラメータのバリデーションを生成しない', () => {
      const handlers = [createMockHandler({
        parameters: [
          {
            name: 'optionalData',
            type: { name: 'string', kind: 'primitive' },
            optional: true,
          },
        ],
      })];
      
      const result = generator.generateCode(handlers, 'main');
      
      expect(result.code).not.toContain('optionalData === undefined');
    });

    it('複数のハンドラーのコードを生成する', () => {
      const handlers = [
        createMockHandler({ name: 'handler1' }),
        createMockHandler({ name: 'handler2' }),
      ];
      
      const result = generator.generateCode(handlers, 'main');
      
      expect(result.code).toContain('handler1');
      expect(result.code).toContain('handler2');
      expect(result.imports.some(imp => imp.includes('handler1'))).toBe(true);
      expect(result.imports.some(imp => imp.includes('handler2'))).toBe(true);
    });
  });

  describe('プリロード生成', () => {
    it('基本的なAPIメソッドを生成する', () => {
      const handlers = [createMockHandler()];
      
      const result = generator.generateCode(handlers, 'preload');
      
      expect(result.target).toBe('preload');
      expect(result.code).toContain('const electronFlowApi');
      expect(result.code).toContain('testHandler:');
      expect(result.code).toContain('ipcRenderer.invoke');
      expect(result.code).toContain('contextBridge.exposeInMainWorld');
      expect(result.imports).toContain("import { contextBridge, ipcRenderer } from 'electron';");
      expect(result.imports).toContain("import type { Result } from 'electron-flow/runtime';");
    });

    it('パラメータ付きメソッドを生成する', () => {
      const handlers = [createMockHandler({
        parameters: [
          {
            name: 'data',
            type: { name: 'string', kind: 'primitive' },
            optional: false,
          },
        ],
      })];
      
      const result = generator.generateCode(handlers, 'preload');
      
      expect(result.code).toContain('args: { data: string }');
      expect(result.code).toContain("ipcRenderer.invoke('testHandler', args)");
    });

    it('パラメータなしメソッドを生成する', () => {
      const handlers = [createMockHandler()];
      
      const result = generator.generateCode(handlers, 'preload');
      
      expect(result.code).toContain('(): Promise<');
      expect(result.code).toContain("ipcRenderer.invoke('testHandler', undefined)");
    });

    it('型定義を生成する', () => {
      const handlers = [createMockHandler({
        parameters: [
          {
            name: 'data',
            type: { name: 'string', kind: 'primitive' },
            optional: false,
          },
        ],
      })];
      
      const result = generator.generateCode(handlers, 'preload');
      
      expect(result.types.some(type => type.includes('TestHandlerArgs = { data: string }'))).toBe(true);
      expect(result.types.some(type => type.includes('TestHandlerResult = Result<string>'))).toBe(true);
    });
  });

  describe('レンダラー生成', () => {
    it('基本的なレンダラーコードを生成する', () => {
      const handlers = [createMockHandler()];
      
      const result = generator.generateCode(handlers, 'renderer');
      
      expect(result.target).toBe('renderer');
      expect(result.code).toContain('declare global');
      expect(result.code).toContain('interface Window');
      expect(result.code).toContain('electronFlow: ElectronFlowApi');
      expect(result.code).toContain('export const electronFlow = window.electronFlow');
      expect(result.imports).toContain("import type { ElectronFlowApi } from './preload';");
    });
  });

  describe('型変換', () => {
    it('Promise型を正しく変換する', () => {
      const handlers = [createMockHandler({
        returnType: {
          name: 'Promise',
          kind: 'promise',
          typeArguments: [{ name: 'string', kind: 'primitive' }],
        },
      })];
      
      const result = generator.generateCode(handlers, 'preload');
      
      expect(result.types[0]).toContain('Result<string>');
    });

    it('配列型を正しく変換する', () => {
      const handlers = [createMockHandler({
        parameters: [
          {
            name: 'items',
            type: {
              name: 'Array',
              kind: 'array',
              elementType: { name: 'string', kind: 'primitive' },
            },
            optional: false,
          },
        ],
      })];
      
      const result = generator.generateCode(handlers, 'preload');
      
      expect(result.code).toContain('items: string[]');
    });

    it('ユニオン型を正しく変換する', () => {
      const handlers = [createMockHandler({
        parameters: [
          {
            name: 'value',
            type: {
              name: 'string | number',
              kind: 'union',
              unionTypes: [
                { name: 'string', kind: 'primitive' },
                { name: 'number', kind: 'primitive' },
              ],
            },
            optional: false,
          },
        ],
      })];
      
      const result = generator.generateCode(handlers, 'preload');
      
      expect(result.code).toContain('value: string | number');
    });

    it('オプショナルパラメータを正しく変換する', () => {
      const handlers = [createMockHandler({
        parameters: [
          {
            name: 'optionalParam',
            type: { name: 'string', kind: 'primitive' },
            optional: true,
          },
        ],
      })];
      
      const result = generator.generateCode(handlers, 'preload');
      
      expect(result.code).toContain('optionalParam?: string');
    });
  });

  describe('JSDocドキュメント', () => {
    it('ハンドラーのドキュメントをコメントとして追加する', () => {
      const handlers = [createMockHandler({
        documentation: 'ユーザーデータを取得する',
      })];
      
      const result = generator.generateCode(handlers, 'main');
      
      expect(result.code).toContain('// ユーザーデータを取得する');
    });

    it('ドキュメントがない場合はデフォルトコメントを追加する', () => {
      const handlers = [createMockHandler({
        documentation: undefined,
      })];
      
      const result = generator.generateCode(handlers, 'main');
      
      expect(result.code).toContain('// testHandlerハンドラー');
    });
  });
});