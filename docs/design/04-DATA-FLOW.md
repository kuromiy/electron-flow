# データフロー設計書

## 1. データフロー概要

electron-flowにおけるデータフローは、大きく2つのフェーズに分かれます：

1. **ビルドフェーズ** - TypeScriptコードの解析から生成まで
2. **ランタイムフェーズ** - 生成されたコードによるIPC通信

## 2. ビルドフェーズのデータフロー

### 2.1 全体フロー図

```mermaid
graph TD
    subgraph "入力"
        A[TypeScript APIファイル]
        B[electron-flow.config.ts]
        C[Context型定義]
    end
    
    subgraph "解析フェーズ"
        D[ファイルシステム読み込み]
        E[AST解析]
        F[型情報抽出]
        G[Zodスキーマ解析]
    end
    
    subgraph "変換フェーズ"
        H[メタデータ生成]
        I[コードテンプレート適用]
        J[型定義マージ]
    end
    
    subgraph "出力フェーズ"
        K[プリロードスクリプト]
        L[IPCハンドラー]
        M[型定義ファイル]
    end
    
    A --> D
    B --> D
    C --> D
    D --> E
    E --> F
    E --> G
    F --> H
    G --> H
    H --> I
    I --> J
    J --> K
    J --> L
    J --> M
```

### 2.2 詳細データ構造

#### 2.2.1 入力データ構造

```typescript
// ファイル読み込み結果
interface FileContent {
    path: string;
    content: string;
    hash: string;
    lastModified: Date;
}

// 設定データ
interface ConfigData {
    option: AutoCodeOption;
    resolvedPaths: {
        targetPath: string;
        preloadPath: string;
        registerPath: string;
        rendererPath: string;
        contextPath?: string;
    };
}
```

#### 2.2.2 解析フェーズのデータ

```typescript
// AST解析結果
interface ParseResult {
    sourceFile: ts.SourceFile;
    functions: FunctionInfo[];
    imports: ImportInfo[];
    exports: ExportInfo[];
}

// 関数情報
interface FunctionInfo {
    name: string;
    parameters: ParameterInfo[];
    returnType: TypeInfo;
    isAsync: boolean;
    decorators?: DecoratorInfo[];
    jsDoc?: JSDocInfo;
}

// パラメータ情報
interface ParameterInfo {
    name: string;
    type: TypeInfo;
    isOptional: boolean;
    defaultValue?: string;
    position: number;
}

// 型情報
interface TypeInfo {
    text: string;
    kind: ts.TypeFlags;
    isArray: boolean;
    isPromise: boolean;
    genericArgs?: TypeInfo[];
}
```

#### 2.2.3 Zodスキーマ解析データ

```typescript
// Zodオブジェクト情報
interface ZodObjectInfo {
    name: string;
    path: string;
    schema: ZodSchema;
    dependencies: string[];
}

// Zodスキーマ構造
interface ZodSchema {
    type: 'object' | 'array' | 'union' | 'primitive';
    properties?: Record<string, ZodField>;
    items?: ZodSchema;
    options?: ZodSchema[];
}

// Zodフィールド情報
interface ZodField {
    type: string;
    optional: boolean;
    nullable: boolean;
    defaultValue?: any;
    validators: Validator[];
}
```

#### 2.2.4 変換フェーズのデータ

```typescript
// 統合メタデータ
interface Metadata {
    packages: PackageMetadata[];
    schemas: SchemaMetadata[];
    dependencies: DependencyGraph;
}

// パッケージメタデータ
interface PackageMetadata {
    name: string;
    path: string;
    functions: EnrichedFunctionInfo[];
    imports: ResolvedImport[];
}

// 拡張関数情報
interface EnrichedFunctionInfo extends FunctionInfo {
    ipcChannelName: string;
    validationSchema?: string;
    contextRequired: boolean;
}

// 依存グラフ
interface DependencyGraph {
    nodes: Map<string, DependencyNode>;
    edges: DependencyEdge[];
}
```

### 2.3 コード生成プロセス

```mermaid
sequenceDiagram
    participant Config as 設定
    participant Scanner as ファイルスキャナー
    participant Parser as パーサー
    participant Analyzer as アナライザー
    participant Generator as ジェネレーター
    participant Writer as ファイルライター
    
    Config->>Scanner: targetPath
    Scanner->>Scanner: ファイル探索
    Scanner->>Parser: ファイルリスト
    
    loop 各ファイル
        Parser->>Parser: AST生成
        Parser->>Parser: 関数抽出
        Parser->>Analyzer: ParseResult
    end
    
    Analyzer->>Analyzer: 型解析
    Analyzer->>Analyzer: Zodスキーマ検出
    Analyzer->>Generator: Metadata
    
    Generator->>Generator: テンプレート適用
    Generator->>Generator: コード生成
    Generator->>Writer: 生成コード
    
    Writer->>Writer: ファイル書き込み
```

## 3. ファイル監視モードのデータフロー

### 3.1 イベント駆動フロー

```mermaid
stateDiagram-v2
    [*] --> 監視中: 開始
    
    監視中 --> 変更検知: ファイル変更
    変更検知 --> ロック確認: イベント発生
    
    ロック確認 --> ビルド中: ロック取得成功
    ロック確認 --> キュー追加: ロック取得失敗
    
    ビルド中 --> 差分解析: ビルド開始
    差分解析 --> 部分生成: 変更箇所特定
    部分生成 --> ファイル更新: コード生成
    ファイル更新 --> ロック解除: 完了
    
    ロック解除 --> キュー確認: 次の処理
    キュー確認 --> ビルド中: キューあり
    キュー確認 --> 監視中: キューなし
    
    キュー追加 --> キュー確認: 待機
```

### 3.2 差分ビルドのデータ構造

```typescript
// ファイル変更イベント
interface FileChangeEvent {
    type: 'add' | 'change' | 'unlink';
    path: string;
    timestamp: Date;
}

// ビルドキュー
interface BuildQueue {
    events: FileChangeEvent[];
    processing: boolean;
    lastBuildTime: Date;
}

// 差分解析結果
interface DiffAnalysis {
    added: string[];
    modified: string[];
    removed: string[];
    affected: string[];  // 依存関係で影響を受けるファイル
}

// キャッシュデータ
interface CacheData {
    fileHash: Map<string, string>;
    parseResults: Map<string, ParseResult>;
    metadata: Map<string, Metadata>;
}
```

## 4. ランタイムフェーズのデータフロー

### 4.1 IPC通信フロー

```mermaid
graph LR
    subgraph "レンダラープロセス"
        A[React Component]
        B[API呼び出し]
        C[window.electronAPI]
        D[ipcRenderer.invoke]
    end
    
    subgraph "メインプロセス"
        E[ipcMain.handle]
        F[自動生成ハンドラー]
        G[Context生成]
        H[API関数実行]
        I[エラーハンドリング]
        J[Result生成]
    end
    
    A --> B
    B --> C
    C --> D
    D -.IPC.-> E
    E --> F
    F --> G
    G --> H
    H --> I
    I --> J
    J -.IPC.-> D
    D --> B
    B --> A
```

### 4.2 リクエスト/レスポンスデータ

```typescript
// IPCリクエスト
interface IPCRequest {
    channel: string;
    args: any[];
    timestamp: number;
    requestId?: string;
}

// IPCレスポンス
interface IPCResponse<T> {
    success: boolean;
    data?: T;
    error?: ErrorDetails;
    timestamp: number;
    requestId?: string;
}

// Context生成データ
interface ContextData {
    event: IpcMainInvokeEvent;
    baseContext: Omit<Context, 'event'>;
    metadata: {
        channel: string;
        timestamp: number;
        processInfo: ProcessInfo;
    };
}
```

## 5. エラー伝播フロー

### 5.1 エラー処理チェーン

```mermaid
graph TD
    A[API関数でエラー発生] --> B{エラータイプ判定}
    
    B -->|検証エラー| C[ValidationError]
    B -->|ビジネスエラー| D[BusinessError]
    B -->|システムエラー| E[SystemError]
    
    C --> F[カスタムエラーハンドラー]
    D --> F
    E --> F
    
    F --> G{ハンドリング成功?}
    
    G -->|成功| H[エラーレスポンス生成]
    G -->|失敗| I[デフォルトハンドラー]
    
    I --> H
    H --> J[Result型でラップ]
    J --> K[IPCレスポンス]
    K --> L[レンダラーに返却]
```

### 5.2 エラーデータ構造

```typescript
// エラー情報の伝播
interface ErrorFlow {
    originalError: Error;
    processedError: ProcessedError;
    response: ErrorResponse;
}

// 処理済みエラー
interface ProcessedError {
    message: string;
    type: string;
    code?: string;
    statusCode?: number;
    details?: any;
    stack?: string;  // 開発環境のみ
}

// エラーレスポンス
interface ErrorResponse {
    success: false;
    error: {
        message: string;
        type: string;
        details?: any;
    };
}
```

## 6. 型情報の伝播

### 6.1 型定義の生成フロー

```mermaid
graph TD
    A[TypeScript型情報] --> B[型抽出]
    B --> C[型正規化]
    C --> D[インポート解決]
    D --> E[型定義生成]
    
    F[Zodスキーマ] --> G[スキーマ解析]
    G --> H[型推論]
    H --> I[型定義変換]
    I --> E
    
    E --> J[型定義マージ]
    J --> K[型定義ファイル出力]
```

### 6.2 型変換ルール

```typescript
// 型変換マッピング
interface TypeMapping {
    // TypeScript型 -> 生成型
    primitives: {
        'string': 'string';
        'number': 'number';
        'boolean': 'boolean';
        'Date': 'Date';
        'Buffer': 'Buffer';
    };
    
    // 複合型の変換
    complex: {
        'Promise<T>': 'Promise<Result<T>>';
        'Array<T>': 'T[]';
        'Record<K, V>': '{ [key: K]: V }';
    };
}

// 型変換プロセス
interface TypeTransformation {
    input: TypeInfo;
    normalized: NormalizedType;
    output: GeneratedType;
}
```

## 7. 設定データの適用フロー

### 7.1 設定の解決プロセス

```mermaid
graph TD
    A[設定ファイル読み込み] --> B[デフォルト値適用]
    B --> C[パス解決]
    C --> D[検証]
    D --> E{検証成功?}
    
    E -->|成功| F[設定オブジェクト生成]
    E -->|失敗| G[エラー表示]
    
    F --> H[各モジュールに配布]
    H --> I[Scanner設定]
    H --> J[Parser設定]
    H --> K[Generator設定]
```

### 7.2 設定の適用データ

```typescript
// 設定解決結果
interface ResolvedConfig {
    original: AutoCodeOption;
    resolved: {
        paths: ResolvedPaths;
        options: ResolvedOptions;
        errorHandler?: ResolvedErrorHandler;
    };
    validation: ValidationResult;
}

// 解決済みパス
interface ResolvedPaths {
    targetPath: string;
    preloadPath: string;
    registerPath: string;
    rendererPath: string;
    contextPath: string;
    workingDir: string;
}

// 解決済みオプション
interface ResolvedOptions {
    ignores: RegExp[];
    concurrency: number;
    cache: boolean;
    debug: boolean;
    logLevel: LogLevel;
}
```

## 8. パフォーマンス最適化のデータフロー

### 8.1 キャッシュ機構

```typescript
// キャッシュシステム
interface CacheSystem {
    // ファイルキャッシュ
    fileCache: Map<string, FileCacheEntry>;
    
    // 解析結果キャッシュ
    parseCache: Map<string, ParseCacheEntry>;
    
    // 生成コードキャッシュ
    generatedCache: Map<string, GeneratedCacheEntry>;
}

// キャッシュエントリ
interface FileCacheEntry {
    path: string;
    content: string;
    hash: string;
    timestamp: Date;
    dependencies: string[];
}

interface ParseCacheEntry {
    fileHash: string;
    result: ParseResult;
    timestamp: Date;
}

interface GeneratedCacheEntry {
    inputHash: string;
    code: string;
    timestamp: Date;
}
```

### 8.2 並列処理フロー

```mermaid
graph TD
    A[ファイルリスト] --> B[バッチ分割]
    B --> C[ワーカープール]
    
    C --> D[Worker 1]
    C --> E[Worker 2]
    C --> F[Worker 3]
    C --> G[Worker N]
    
    D --> H[結果集約]
    E --> H
    F --> H
    G --> H
    
    H --> I[マージ処理]
    I --> J[最終結果]
```

## 9. デバッグ情報の収集

### 9.1 トレースデータ

```typescript
// トレース情報
interface TraceData {
    id: string;
    phase: 'scan' | 'parse' | 'analyze' | 'generate' | 'write';
    startTime: number;
    endTime?: number;
    data: any;
    children: TraceData[];
}

// パフォーマンスメトリクス
interface PerformanceMetrics {
    totalTime: number;
    phases: {
        scan: number;
        parse: number;
        analyze: number;
        generate: number;
        write: number;
    };
    fileCount: number;
    functionCount: number;
}
```

## 10. データ整合性の保証

### 10.1 トランザクション管理

```typescript
// ビルドトランザクション
interface BuildTransaction {
    id: string;
    startTime: Date;
    state: 'pending' | 'running' | 'completed' | 'failed';
    
    // ロールバック情報
    rollback: {
        files: Array<{
            path: string;
            originalContent?: string;
        }>;
    };
    
    // コミット
    commit(): Promise<void>;
    
    // ロールバック
    rollback(): Promise<void>;
}
```