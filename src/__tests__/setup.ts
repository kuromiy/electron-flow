// Jest用のテストセットアップファイル
import { jest } from '@jest/globals';

// electronモジュールをモック
jest.mock('electron', () => ({
  ipcMain: {
    handle: jest.fn(),
    removeHandler: jest.fn(),
  },
  contextBridge: {
    exposeInMainWorld: jest.fn(),
  },
  ipcRenderer: {
    invoke: jest.fn(),
  },
  app: {
    getPath: jest.fn(() => '/mock/app/path'),
    getVersion: jest.fn(() => '1.0.0'),
  },
}));

// ts-morphをモック
jest.mock('ts-morph', () => {
  const actualTsMorph = jest.requireActual('ts-morph');
  return {
    ...actualTsMorph,
    Project: jest.fn().mockImplementation(() => ({
      addSourceFilesAtPaths: jest.fn(),
      getSourceFiles: jest.fn(() => []),
      createSourceFile: jest.fn(),
      saveSync: jest.fn(),
    })),
  };
});

// 必要に応じてファイルシステム操作をモック
jest.mock('fs/promises', () => ({
  readFile: jest.fn(),
  writeFile: jest.fn(),
  mkdir: jest.fn(),
  access: jest.fn(),
  stat: jest.fn(),
  readdir: jest.fn(),
}));

// chokidarをモック
jest.mock('chokidar', () => ({
  watch: jest.fn(() => ({
    on: jest.fn(),
    close: jest.fn(),
  })),
}));

// child_processをモック
jest.mock('child_process', () => ({
  spawn: jest.fn(),
  exec: jest.fn(),
  execSync: jest.fn(),
}));

// グローバルテストユーティリティ
declare global {
  var mockConsole: () => void;
}

global.mockConsole = () => {
  // テストヘルパー用のプレースホルダー関数
  // 個々のテストで必要に応じてconsoleをモックする
};

// テスト間でモックをクリア
afterEach(() => {
  jest.clearAllMocks();
});