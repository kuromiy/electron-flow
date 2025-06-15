/**
 * electron-flowの設定
 */
export interface ElectronFlowConfig {
  /**
   * ハンドラー関数を含むディレクトリ
   */
  handlersDir: string;

  /**
   * 生成されたコードの出力ディレクトリ
   */
  outDir: string;

  /**
   * Context型定義へのパス
   */
  contextPath: string;

  /**
   * エラーハンドラー関数へのパス
   */
  errorHandlerPath: string;

  /**
   * 開発サーバーの設定
   */
  dev?: {
    /**
     * Electronメインプロセスのエントリーポイント
     */
    electronEntry?: string;

    /**
     * プリロードスクリプトのエントリーポイント
     */
    preloadEntry?: string;

    /**
     * Vite設定ファイルへのパス
     */
    viteConfig?: string;

    /**
     * 変更を監視する追加パス
     */
    watchPaths?: string[];
  };

  /**
   * コード生成オプション
   */
  generation?: {
    /**
     * API構造: 'file'はファイル名でグループ化、'flat'はフラット構造を作成
     * @default 'file'
     */
    apiStructure?: 'file' | 'flat';

    /**
     * 生成されたコードをprettierでフォーマットするかどうか
     * @default true
     */
    prettier?: boolean;

    /**
     * prettier設定ファイルへのパス
     * @default '.prettierrc'
     */
    prettierConfig?: string;
  };
}

/**
 * CLIコマンドオプション
 */
export interface BaseOptions {
  config?: string;
}

export interface InitOptions {
  force?: boolean;
}

export interface GenerateOptions extends BaseOptions {
  dryRun?: boolean;
}

export interface WatchOptions extends BaseOptions {}

export interface DevOptions extends BaseOptions {}