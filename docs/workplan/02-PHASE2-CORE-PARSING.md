# Phase 2: コア解析エンジン

## 1. フェーズ概要

### 目標
TypeScript APIファイルを解析してメタデータを抽出し、Zodスキーマ情報を解析する核となる機能を実装する。これらの解析機能は後続フェーズでのコード生成の基盤となる。

### 期間
**2週間** (10営業日)

### 主要成果物
- **parse.ts**: TypeScript AST解析エンジン
- **zod.ts**: Zodスキーマ解析エンジン
- **types.ts**: 解析結果の型定義
- 解析結果の検証機能

## 2. 詳細タスクリスト

### 2.1 Week 1: TypeScript AST解析エンジン (parse.ts)

#### タスク 2.1: TypeScript Compiler API調査 (Day 1)
**所要時間**: 6時間

- **TypeScript Compiler APIの基本概念調査**
  - Program、SourceFile、Node、Symbol、Type の理解
  - 実際のAPIファイルでのAST構造確認
  - 関数宣言、パラメータ、戻り値の解析方法調査

- **プロトタイプ作成**
```typescript
// 調査用プロトタイプ
function exploreAST(filePath: string): void {
  const program = ts.createProgram([filePath], {});
  const sourceFile = program.getSourceFile(filePath);
  
  function visit(node: ts.Node) {
    console.log(ts.SyntaxKind[node.kind], node.getText());
    ts.forEachChild(node, visit);
  }
  
  if (sourceFile) visit(sourceFile);
}
```

**完了基準**: TypeScript APIの基本的な解析パターンを理解し、プロトタイプが動作する

#### タスク 2.2: 関数情報抽出機能実装 (Day 2-3)
**所要時間**: 12時間

**実装対象**:
```typescript
interface FunctionInfo {
  name: string;                 // 関数名
  parameters: ParameterInfo[];  // パラメータ情報
  returnType: TypeInfo;         // 戻り値型
  isAsync: boolean;            // 非同期関数かどうか
  isExported: boolean;         // エクスポートされているか
  filePath: string;            // ソースファイルパス
  importPath: string;          // インポート用パス
  jsDocComment?: string;       // JSDocコメント
}

interface ParameterInfo {
  name: string;
  type: TypeInfo;
  isOptional: boolean;
  defaultValue?: string;
  position: number;
}

interface TypeInfo {
  text: string;                // 型の文字列表現
  kind: string;               // TypeScript型の種類
  isArray: boolean;           // 配列型かどうか
  isPromise: boolean;         // Promise型かどうか
  genericArgs?: TypeInfo[];   // ジェネリック引数
}
```

**実装詳細**:
1. **関数宣言の検出と基本情報抽出**
```typescript
class FunctionExtractor {
  extractFunction(node: ts.FunctionDeclaration): FunctionInfo {
    return {
      name: node.name?.getText() || '',
      parameters: this.extractParameters(node.parameters),
      returnType: this.extractReturnType(node.type),
      isAsync: this.hasAsyncModifier(node),
      isExported: this.hasExportModifier(node),
      filePath: this.currentFilePath,
      importPath: this.generateImportPath(),
      jsDocComment: this.extractJSDoc(node)
    };
  }
}
```

2. **パラメータ解析**
```typescript
private extractParameters(params: ts.NodeArray<ts.ParameterDeclaration>): ParameterInfo[] {
  return params.map((param, index) => ({
    name: param.name.getText(),
    type: this.extractTypeInfo(param.type),
    isOptional: !!param.questionToken,
    defaultValue: param.initializer?.getText(),
    position: index
  }));
}
```

**完了基準**: 基本的な関数宣言から正確な情報を抽出できる

#### タスク 2.3: 型情報解析機能実装 (Day 4)
**所要時間**: 6時間

**型解析の実装**:
```typescript
class TypeAnalyzer {
  extractTypeInfo(typeNode: ts.TypeNode | undefined): TypeInfo {
    if (!typeNode) return { text: 'any', kind: 'any', isArray: false, isPromise: false };
    
    const typeText = typeNode.getText();
    const kind = this.determineTypeKind(typeNode);
    
    return {
      text: typeText,
      kind: kind,
      isArray: this.isArrayType(typeNode),
      isPromise: this.isPromiseType(typeNode),
      genericArgs: this.extractGenericArgs(typeNode)
    };
  }
  
  private isPromiseType(typeNode: ts.TypeNode): boolean {
    return typeNode.getText().startsWith('Promise<');
  }
  
  private isArrayType(typeNode: ts.TypeNode): boolean {
    return typeNode.getText().endsWith('[]') || 
           typeNode.getText().startsWith('Array<');
  }
}
```

**完了基準**: 複雑な型（Promise、Array、Generic）の解析が正確に動作する

#### タスク 2.4: エクスポート解析とパッケージ構造解析 (Day 5)
**所要時間**: 6時間

**実装対象**:
```typescript
interface PackageInfo {
  packageName: string;          // パッケージ名（ファイル名から生成）
  filePath: string;            // ファイルパス
  functions: FunctionInfo[];   // 関数情報リスト
  imports: ImportInfo[];       // インポート情報
  exports: ExportInfo[];       // エクスポート情報
}

interface ImportInfo {
  moduleName: string;          // インポート元モジュール
  importedNames: string[];     // インポートされた名前
  isDefaultImport: boolean;    // デフォルトインポートか
  alias?: string;             // エイリアス
}
```

**実装内容**:
1. **ディレクトリ走査とファイル収集**
2. **インポート文の解析**
3. **エクスポート文の解析**
4. **パッケージ情報の統合**

**完了基準**: 複数ファイルからパッケージ構造を正確に構築できる

### 2.2 Week 2: Zodスキーマ解析エンジン (zod.ts)

#### タスク 2.5: Zodスキーマ検出機能実装 (Day 6)
**所要時間**: 6時間

**実装対象**:
```typescript
interface ZodObjectInfo {
  name: string;                // スキーマ名
  filePath: string;           // ファイルパス
  schema: ZodSchemaStructure;  // スキーマ構造
  exportType: string;         // エクスポートタイプ（const, export const など）
  inferredTypeName?: string;   // z.infer<typeof schema>の型名
}

interface ZodSchemaStructure {
  type: 'object' | 'array' | 'union' | 'primitive';
  properties?: Record<string, ZodFieldInfo>;
  items?: ZodSchemaStructure;
  options?: ZodSchemaStructure[];
  primitive?: 'string' | 'number' | 'boolean' | 'date';
}

interface ZodFieldInfo {
  type: string;               // Zodタイプ（z.string()など）
  optional: boolean;          // .optional()が付いているか
  nullable: boolean;          // .nullable()が付いているか
  validations: ValidationRule[]; // バリデーションルール
  defaultValue?: any;         // .default()の値
}
```

**実装アプローチ**:
1. **Zodオブジェクトパターンの検出**
```typescript
class ZodSchemaDetector {
  detectZodSchemas(sourceFile: ts.SourceFile): ZodObjectInfo[] {
    const schemas: ZodObjectInfo[] = [];
    
    function visit(node: ts.Node) {
      if (this.isZodObjectDeclaration(node)) {
        schemas.push(this.extractZodSchema(node));
      }
      ts.forEachChild(node, visit);
    }
    
    visit(sourceFile);
    return schemas;
  }
  
  private isZodObjectDeclaration(node: ts.Node): boolean {
    // z.object() パターンの検出
    return node.kind === ts.SyntaxKind.CallExpression &&
           this.hasZodObjectCall(node as ts.CallExpression);
  }
}
```

**完了基準**: 基本的なz.object()定義を検出できる

#### タスク 2.6: Zodフィールド解析実装 (Day 7-8)
**所要時間**: 12時間

**詳細実装**:
```typescript
class ZodFieldAnalyzer {
  analyzeField(property: ts.PropertyAssignment): ZodFieldInfo {
    const fieldName = property.name.getText();
    const valueExpression = property.initializer;
    
    return {
      type: this.extractZodType(valueExpression),
      optional: this.hasOptionalChain(valueExpression),
      nullable: this.hasNullableChain(valueExpression),
      validations: this.extractValidations(valueExpression),
      defaultValue: this.extractDefaultValue(valueExpression)
    };
  }
  
  private extractZodType(expr: ts.Expression): string {
    // z.string(), z.number() などの解析
    if (ts.isCallExpression(expr)) {
      return this.analyzeZodCallChain(expr);
    }
    return 'unknown';
  }
  
  private analyzeZodCallChain(call: ts.CallExpression): string {
    // z.string().min(1).max(100) のようなチェーン解析
    let current = call;
    const chain: string[] = [];
    
    while (current) {
      if (ts.isPropertyAccessExpression(current.expression)) {
        chain.unshift(current.expression.name.getText());
        if (ts.isCallExpression(current.expression.expression)) {
          current = current.expression.expression;
        } else {
          break;
        }
      } else {
        break;
      }
    }
    
    return chain.join('.');
  }
}
```

**完了基準**: Zodフィールドのタイプとバリデーションチェーンを正確に解析できる

#### タスク 2.7: バリデーション情報抽出 (Day 9)
**所要時間**: 6時間

**実装対象**:
```typescript
interface ValidationRule {
  type: 'min' | 'max' | 'email' | 'url' | 'regex' | 'custom';
  value?: any;                // バリデーション値
  message?: string;           // カスタムエラーメッセージ
}

class ValidationExtractor {
  extractValidations(expression: ts.Expression): ValidationRule[] {
    const validations: ValidationRule[] = [];
    
    // .min(5), .max(100), .email() などの解析
    if (ts.isCallExpression(expression)) {
      this.analyzeValidationChain(expression, validations);
    }
    
    return validations;
  }
  
  private analyzeValidationChain(call: ts.CallExpression, validations: ValidationRule[]): void {
    // チェーンされたバリデーションメソッドの解析
    if (ts.isPropertyAccessExpression(call.expression)) {
      const methodName = call.expression.name.getText();
      const args = call.arguments;
      
      validations.push({
        type: this.mapValidationType(methodName),
        value: args.length > 0 ? this.extractArgumentValue(args[0]) : undefined,
        message: args.length > 1 ? this.extractArgumentValue(args[1]) : undefined
      });
      
      // 再帰的にチェーンを解析
      if (ts.isCallExpression(call.expression.expression)) {
        this.analyzeValidationChain(call.expression.expression, validations);
      }
    }
  }
}
```

**完了基準**: 主要なZodバリデーション（min, max, email等）を抽出できる

#### タスク 2.8: 統合検証とデバッグ (Day 10)
**所要時間**: 6時間

**実際のファイルでの検証**:
```typescript
// 検証用のサンプルファイルを作成し、手動で動作確認
// - 関数情報の抽出が正確に行われるかチェック
// - Zodスキーマの解析が期待通りに動作するかチェック
// - コンソール出力で結果を目視確認
```

**完了基準**: 実際のAPIファイルで正確な解析が行え、期待する結果が得られる

## 3. 技術要件

### 3.1 使用ライブラリ
- **TypeScript Compiler API**: AST解析の中核
- **Node.js fs/path**: ファイルシステム操作

### 3.2 パフォーマンス要件
- **解析速度**: 100ファイル以下で5秒以内
- **メモリ使用量**: 200MB以内
- **正確性**: 99%以上の解析精度

### 3.3 対応するTypeScriptパターン
```typescript
// 対応する関数パターン
export function syncFunction(param: string): string { }
export async function asyncFunction(param: string): Promise<string> { }
export const arrowFunction = (param: string) => string;
export const asyncArrowFunction = async (param: string): Promise<string> => { };

// 対応するZodパターン
export const schema = z.object({ });
const schema = z.object({ });
export { schema };
export const schema: z.ZodSchema = z.object({ });
```

## 4. 品質基準

### 4.1 コード品質
- TypeScript strict mode対応
- ESLintルール100%準拠
- 適切なエラーハンドリング
- 詳細なJSDocコメント

### 4.2 検証品質
- **エラーケース**: 全パターンで適切な処理
- **実際のファイルでの検証**: 5種類以上のパターンで確認
- **手動検証**: 期待される結果との詳細比較

### 4.3 パフォーマンス品質
- **メモリリーク**: 検出されないこと
- **大量ファイル処理**: 100ファイルで性能劣化なし

## 5. リスク管理

### 5.1 技術的リスク

**リスク**: TypeScript Compiler APIの複雑性
- **影響度**: 高
- **対策**: 段階的実装、プロトタイプ先行開発
- **検出**: 定期的な動作確認

**リスク**: Zodスキーマの動的解析限界
- **影響度**: 中
- **対策**: 対応範囲の明確化、段階的拡張
- **検出**: 実際のプロジェクトでの動作確認

**リスク**: 解析精度の問題
- **影響度**: 高
- **対策**: 包括的な検証ケース作成
- **検出**: 継続的な精度測定

### 5.2 スケジュールリスク

**リスク**: TypeScript APIの学習コスト
- **影響度**: 中
- **対策**: 事前調査の充実、エキスパートへの相談
- **検出**: 進捗の日次確認

## 6. 完了基準

### 6.1 必須基準
- [ ] TypeScript関数の基本情報を正確に抽出
- [ ] Zodスキーマの構造を正確に解析
- [ ] 複数ファイルからのパッケージ構造構築
- [ ] 実際のAPIファイルでの動作確認
- [ ] エラーケースの適切な処理

### 6.2 推奨基準
- [ ] 複雑な型（Generic、Union等）の解析対応
- [ ] JSDocコメントの解析
- [ ] インポート/エクスポートの完全解析
- [ ] パフォーマンス要件のクリア

## 7. 次フェーズへの引き継ぎ

### 7.1 Phase 3への準備
- 解析結果データ構造の最終確認
- コード生成で使用する情報の洗い出し
- テンプレートエンジンの技術調査開始

### 7.2 成果物の確認
- **parse.ts**: 完全に動作するAST解析エンジン
- **zod.ts**: 完全に動作するZodスキーマ解析エンジン
- **types.ts**: 解析結果の型定義
- **検証データ**: 包括的な検証ケース

### 7.3 移行判定基準
- すべての完了基準をクリア
- Phase 3で必要な解析データが確実に取得可能
- パフォーマンス要件を満たす
- 実際のプロジェクトファイルでの検証完了