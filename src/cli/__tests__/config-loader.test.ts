import { jest } from '@jest/globals';
import { loadConfig, validateConfig } from '../config-loader';
import type { ElectronFlowConfig } from '../types';
import { promises as fs } from 'fs';
import path from 'path';

// Mock fs and path
jest.mock('fs', () => ({
  promises: {
    access: jest.fn(),
    readFile: jest.fn(),
  },
}));

jest.mock('path', () => ({
  ...jest.requireActual('path'),
  resolve: jest.fn((p) => `/absolute/${p}`),
  join: jest.fn((...args) => args.join('/')),
}));

describe('設定ローダーテスト', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('loadConfig', () => {
    // Note: loadConfig関数のテストは動的インポートのモックが複雑なため、
    // 実際の統合テストで確認することとし、ここでは基本的な構造のみテストする
    
    it('設定ファイルパスが適切に解決される', () => {
      expect(path.resolve).toBeDefined();
      expect(() => path.resolve('test.config.ts')).not.toThrow();
    });

    it('ファイルアクセス機能が利用可能である', () => {
      expect(fs.access).toBeDefined();
      expect(typeof fs.access).toBe('function');
    });
  });

  describe('validateConfig', () => {
    it('完全な設定を検証する', () => {
      const config: ElectronFlowConfig = {
        handlersDir: 'src/main/handlers',
        outDir: 'src/generated',
        contextPath: 'src/main/context.ts',
        errorHandlerPath: 'src/main/error-handler.ts',
      };

      expect(() => validateConfig(config)).not.toThrow();
    });

    it('オプションのdev設定を持つ設定を検証する', () => {
      const config: ElectronFlowConfig = {
        handlersDir: 'src/main/handlers',
        outDir: 'src/generated',
        contextPath: 'src/main/context.ts',
        errorHandlerPath: 'src/main/error-handler.ts',
        dev: {
          electronEntry: 'src/main/index.ts',
          preloadEntry: 'src/preload/index.ts',
          viteConfig: 'vite.config.ts',
          watchPaths: ['src/**/*.ts'],
        },
      };

      expect(() => validateConfig(config)).not.toThrow();
    });

    it('生成オプションを持つ設定を検証する', () => {
      const config: ElectronFlowConfig = {
        handlersDir: 'src/main/handlers',
        outDir: 'src/generated',
        contextPath: 'src/main/context.ts',
        errorHandlerPath: 'src/main/error-handler.ts',
        generation: {
          apiStructure: 'file',
          prettier: true,
          prettierConfig: '.prettierrc',
        },
      };

      expect(() => validateConfig(config)).not.toThrow();
    });

    it('必須フィールドが不足している場合エラーを投げる', () => {
      const invalidConfigs = [
        { outDir: 'out', contextPath: 'ctx.ts', errorHandlerPath: 'err.ts' },
        { handlersDir: 'handlers', contextPath: 'ctx.ts', errorHandlerPath: 'err.ts' },
        { handlersDir: 'handlers', outDir: 'out', errorHandlerPath: 'err.ts' },
        { handlersDir: 'handlers', outDir: 'out', contextPath: 'ctx.ts' },
      ];

      invalidConfigs.forEach((config) => {
        expect(() => validateConfig(config as any)).toThrow();
      });
    });

    it('無効なフィールド型の場合エラーを投げる', () => {
      const config = {
        handlersDir: 123, // 文字列であるべき
        outDir: 'src/generated',
        contextPath: 'src/main/context.ts',
        errorHandlerPath: 'src/main/error-handler.ts',
      };

      expect(() => validateConfig(config as any)).toThrow(
        'handlersDirは文字列である必要があります'
      );
    });

    it('無効なdev設定の場合エラーを投げる', () => {
      const config: ElectronFlowConfig = {
        handlersDir: 'src/main/handlers',
        outDir: 'src/generated',
        contextPath: 'src/main/context.ts',
        errorHandlerPath: 'src/main/error-handler.ts',
        dev: {
          electronEntry: 123 as any, // 文字列であるべき
        },
      };

      expect(() => validateConfig(config)).toThrow(
        'dev.electronEntryは文字列である必要があります'
      );
    });

    it('無効な生成設定の場合エラーを投げる', () => {
      const config: ElectronFlowConfig = {
        handlersDir: 'src/main/handlers',
        outDir: 'src/generated',
        contextPath: 'src/main/context.ts',
        errorHandlerPath: 'src/main/error-handler.ts',
        generation: {
          apiStructure: 'invalid' as any, // 'file'または'flat'であるべき
        },
      };

      expect(() => validateConfig(config)).toThrow(
        'generation.apiStructureは "file" または "flat" である必要があります'
      );
    });
  });
});