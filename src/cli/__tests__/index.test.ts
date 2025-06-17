// より詳細な統合テスト
describe('CLI Index', () => {
  let originalArgv: string[];
  
  beforeEach(() => {
    jest.resetModules();
    originalArgv = process.argv;
    // 安全なargvを設定
    process.argv = ['node', 'electron-flow', '--help'];
  });

  afterEach(() => {
    process.argv = originalArgv;
  });

  it('package.jsonが正しく読み込まれる', () => {
    const fs = require('fs');
    const path = require('path');
    
    const packagePath = path.join(__dirname, '../../../package.json');
    const content = fs.readFileSync(packagePath, 'utf-8');
    const packageJson = JSON.parse(content);
    
    expect(packageJson).toHaveProperty('version');
    expect(typeof packageJson.version).toBe('string');
    expect(packageJson.name).toBe('electron-flow');
  });

  it('CLIモジュールが正常に読み込まれる', () => {
    // process.exitをモック
    const originalExit = process.exit;
    process.exit = jest.fn() as any;
    
    expect(() => {
      require('../index');
    }).not.toThrow();
    
    // 元のprocess.exitを復元
    process.exit = originalExit;
  });

  it('エラーハンドラーが正しくインポートされる', () => {
    const errorHandler = require('../error-handler');
    
    expect(errorHandler.wrapAsyncCommand).toBeDefined();
    expect(typeof errorHandler.wrapAsyncCommand).toBe('function');
  });

  it('コマンドモジュールが存在する', () => {
    expect(() => require('../commands/init')).not.toThrow();
    expect(() => require('../commands/generate')).not.toThrow();
    expect(() => require('../commands/watch')).not.toThrow();
    expect(() => require('../commands/dev')).not.toThrow();
  });

  it('必要な依存関係が利用可能', () => {
    expect(() => require('commander')).not.toThrow();
    expect(() => require('fs')).not.toThrow();
    expect(() => require('path')).not.toThrow();
  });

  it('CLIエントリーポイントが実行可能', () => {
    // process.exitをモック
    const originalExit = process.exit;
    process.exit = jest.fn() as any;
    
    // ヘルプコマンドで実行テスト
    process.argv = ['node', 'electron-flow', '--help'];
    
    const { program } = require('commander');
    expect(program).toBeDefined();
    
    // CLIファイルを読み込み
    require('../index');
    
    // プログラムが設定されていることを確認
    expect(program._name).toBe('electron-flow');
    
    // 元のprocess.exitを復元
    process.exit = originalExit;
  });
});