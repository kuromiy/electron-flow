import type { TypeInfo } from './types';

/**
 * 自動型推論システム
 */
export class TypeInference {
  /**
   * 値から型を推論する
   */
  inferTypeFromValue(value: any): TypeInfo {
    const jsType = typeof value;

    switch (jsType) {
      case 'string':
        return this.createPrimitiveType('string');
      case 'number':
        return this.createPrimitiveType('number');
      case 'boolean':
        return this.createPrimitiveType('boolean');
      case 'undefined':
        return this.createPrimitiveType('undefined');
      case 'object':
        return this.inferObjectType(value);
      default:
        return this.createUnknownType();
    }
  }

  /**
   * オブジェクトの型を推論する
   */
  private inferObjectType(value: any): TypeInfo {
    if (value === null) {
      return this.createPrimitiveType('null');
    }

    if (Array.isArray(value)) {
      return this.inferArrayType(value);
    }

    if (value instanceof Promise) {
      return this.createPromiseType(this.createUnknownType());
    }

    // 通常のオブジェクト
    return this.inferPlainObjectType(value);
  }

  /**
   * 配列の型を推論する
   */
  private inferArrayType(value: any[]): TypeInfo {
    if (value.length === 0) {
      return {
        name: 'Array',
        kind: 'array',
        elementType: this.createUnknownType(),
      };
    }

    // 最初の要素から型を推論
    const elementType = this.inferTypeFromValue(value[0]);

    return {
      name: 'Array',
      kind: 'array',
      elementType,
    };
  }

  /**
   * プレーンオブジェクトの型を推論する
   */
  private inferPlainObjectType(value: Record<string, any>): TypeInfo {
    const properties = Object.entries(value).map(([key, val]) => ({
      name: key,
      type: this.inferTypeFromValue(val),
      optional: false,
    }));

    return {
      name: 'object',
      kind: 'object',
      properties,
    };
  }

  /**
   * 複数の型からユニオン型を作成する
   */
  createUnionType(types: TypeInfo[]): TypeInfo {
    if (types.length === 0) {
      return this.createUnknownType();
    }

    if (types.length === 1) {
      return types[0];
    }

    // 重複する型を除去
    const uniqueTypes = this.deduplicateTypes(types);

    if (uniqueTypes.length === 1) {
      return uniqueTypes[0];
    }

    const name = uniqueTypes.map(t => t.name).join(' | ');

    return {
      name,
      kind: 'union',
      unionTypes: uniqueTypes,
    };
  }

  /**
   * Promise型を作成する
   */
  createPromiseType(innerType: TypeInfo): TypeInfo {
    return {
      name: 'Promise',
      kind: 'promise',
      typeArguments: [innerType],
    };
  }

  /**
   * Result型を作成する
   */
  createResultType(innerType: TypeInfo): TypeInfo {
    return {
      name: 'Result',
      kind: 'result',
      typeArguments: [innerType],
    };
  }

  /**
   * プリミティブ型を作成する
   */
  private createPrimitiveType(name: string): TypeInfo {
    return {
      name,
      kind: 'primitive',
    };
  }

  /**
   * 不明な型を作成する
   */
  private createUnknownType(): TypeInfo {
    return {
      name: 'unknown',
      kind: 'unknown',
    };
  }

  /**
   * 型の重複を除去する
   */
  private deduplicateTypes(types: TypeInfo[]): TypeInfo[] {
    const seen = new Set<string>();
    const result: TypeInfo[] = [];

    for (const type of types) {
      const key = this.getTypeKey(type);
      if (!seen.has(key)) {
        seen.add(key);
        result.push(type);
      }
    }

    return result;
  }

  /**
   * 型のキーを取得する（重複除去用）
   */
  private getTypeKey(type: TypeInfo): string {
    return `${type.kind}:${type.name}`;
  }

  /**
   * 型が互換性があるかチェックする
   */
  isCompatible(sourceType: TypeInfo, targetType: TypeInfo): boolean {
    // 同じ型
    if (sourceType.kind === targetType.kind && sourceType.name === targetType.name) {
      return true;
    }

    // any/unknown は全てと互換性がある
    if (sourceType.kind === 'unknown' || targetType.kind === 'unknown') {
      return true;
    }

    // ユニオン型の場合
    if (targetType.kind === 'union') {
      return targetType.unionTypes?.some(unionType => 
        this.isCompatible(sourceType, unionType)
      ) || false;
    }

    if (sourceType.kind === 'union') {
      return sourceType.unionTypes?.every(unionType => 
        this.isCompatible(unionType, targetType)
      ) || false;
    }

    // 配列型の場合
    if (sourceType.kind === 'array' && targetType.kind === 'array') {
      if (!sourceType.elementType || !targetType.elementType) {
        return true; // 要素型が不明な場合は互換性ありとする
      }
      return this.isCompatible(sourceType.elementType, targetType.elementType);
    }

    // Promise型の場合
    if (sourceType.kind === 'promise' && targetType.kind === 'promise') {
      const sourceArg = sourceType.typeArguments?.[0];
      const targetArg = targetType.typeArguments?.[0];
      if (!sourceArg || !targetArg) {
        return true;
      }
      return this.isCompatible(sourceArg, targetArg);
    }

    return false;
  }

  /**
   * より具体的な型を選択する
   */
  selectMoreSpecificType(type1: TypeInfo, type2: TypeInfo): TypeInfo {
    // unknown より具体的な型を選択
    if (type1.kind === 'unknown') return type2;
    if (type2.kind === 'unknown') return type1;

    // プリミティブ型を優先
    if (type1.kind === 'primitive' && type2.kind !== 'primitive') {
      return type1;
    }
    if (type2.kind === 'primitive' && type1.kind !== 'primitive') {
      return type2;
    }

    // デフォルトは最初の型
    return type1;
  }
}