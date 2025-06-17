import { TypeInference } from '../type-inference';

describe('TypeInference', () => {
  let typeInference: TypeInference;

  beforeEach(() => {
    typeInference = new TypeInference();
  });

  describe('inferTypeFromValue', () => {
    it('string型を正しく推論する', () => {
      const result = typeInference.inferTypeFromValue('test');
      
      expect(result.name).toBe('string');
      expect(result.kind).toBe('primitive');
    });

    it('number型を正しく推論する', () => {
      const result = typeInference.inferTypeFromValue(42);
      
      expect(result.name).toBe('number');
      expect(result.kind).toBe('primitive');
    });

    it('boolean型を正しく推論する', () => {
      const result = typeInference.inferTypeFromValue(true);
      
      expect(result.name).toBe('boolean');
      expect(result.kind).toBe('primitive');
    });

    it('undefined型を正しく推論する', () => {
      const result = typeInference.inferTypeFromValue(undefined);
      
      expect(result.name).toBe('undefined');
      expect(result.kind).toBe('primitive');
    });

    it('null型を正しく推論する', () => {
      const result = typeInference.inferTypeFromValue(null);
      
      expect(result.name).toBe('null');
      expect(result.kind).toBe('primitive');
    });

    it('配列型を正しく推論する', () => {
      const result = typeInference.inferTypeFromValue(['a', 'b', 'c']);
      
      expect(result.name).toBe('Array');
      expect(result.kind).toBe('array');
      expect(result.elementType?.name).toBe('string');
      expect(result.elementType?.kind).toBe('primitive');
    });

    it('空配列の型を推論する', () => {
      const result = typeInference.inferTypeFromValue([]);
      
      expect(result.name).toBe('Array');
      expect(result.kind).toBe('array');
      expect(result.elementType?.kind).toBe('unknown');
    });

    it('オブジェクト型を正しく推論する', () => {
      const result = typeInference.inferTypeFromValue({
        name: 'test',
        age: 25,
        active: true,
      });
      
      expect(result.name).toBe('object');
      expect(result.kind).toBe('object');
      expect(result.properties).toHaveLength(3);
      expect(result.properties![0].name).toBe('name');
      expect(result.properties![0].type.name).toBe('string');
      expect(result.properties![1].name).toBe('age');
      expect(result.properties![1].type.name).toBe('number');
      expect(result.properties![2].name).toBe('active');
      expect(result.properties![2].type.name).toBe('boolean');
    });

    it('Promise型を正しく推論する', () => {
      const promise = Promise.resolve('test');
      const result = typeInference.inferTypeFromValue(promise);
      
      expect(result.name).toBe('Promise');
      expect(result.kind).toBe('promise');
      expect(result.typeArguments?.[0].kind).toBe('unknown');
    });

    it('不明な型を推論する', () => {
      const symbol = Symbol('test');
      const result = typeInference.inferTypeFromValue(symbol);
      
      expect(result.name).toBe('unknown');
      expect(result.kind).toBe('unknown');
    });
  });

  describe('createUnionType', () => {
    it('空配列から不明な型を作成する', () => {
      const result = typeInference.createUnionType([]);
      
      expect(result.kind).toBe('unknown');
    });

    it('単一の型から同じ型を返す', () => {
      const stringType = { name: 'string', kind: 'primitive' as const };
      const result = typeInference.createUnionType([stringType]);
      
      expect(result).toEqual(stringType);
    });

    it('複数の型からユニオン型を作成する', () => {
      const types = [
        { name: 'string', kind: 'primitive' as const },
        { name: 'number', kind: 'primitive' as const },
      ];
      const result = typeInference.createUnionType(types);
      
      expect(result.kind).toBe('union');
      expect(result.name).toBe('string | number');
      expect(result.unionTypes).toHaveLength(2);
    });

    it('重複する型を除去してユニオン型を作成する', () => {
      const types = [
        { name: 'string', kind: 'primitive' as const },
        { name: 'string', kind: 'primitive' as const },
        { name: 'number', kind: 'primitive' as const },
      ];
      const result = typeInference.createUnionType(types);
      
      expect(result.unionTypes).toHaveLength(2);
    });

    it('重複除去後に単一の型になった場合、その型を返す', () => {
      const types = [
        { name: 'string', kind: 'primitive' as const },
        { name: 'string', kind: 'primitive' as const },
      ];
      const result = typeInference.createUnionType(types);
      
      expect(result.kind).toBe('primitive');
      expect(result.name).toBe('string');
    });
  });

  describe('createPromiseType', () => {
    it('Promise型を正しく作成する', () => {
      const innerType = { name: 'string', kind: 'primitive' as const };
      const result = typeInference.createPromiseType(innerType);
      
      expect(result.name).toBe('Promise');
      expect(result.kind).toBe('promise');
      expect(result.typeArguments).toHaveLength(1);
      expect(result.typeArguments![0]).toEqual(innerType);
    });
  });

  describe('createResultType', () => {
    it('Result型を正しく作成する', () => {
      const innerType = { name: 'string', kind: 'primitive' as const };
      const result = typeInference.createResultType(innerType);
      
      expect(result.name).toBe('Result');
      expect(result.kind).toBe('result');
      expect(result.typeArguments).toHaveLength(1);
      expect(result.typeArguments![0]).toEqual(innerType);
    });
  });

  describe('isCompatible', () => {
    it('同じ型は互換性がある', () => {
      const type1 = { name: 'string', kind: 'primitive' as const };
      const type2 = { name: 'string', kind: 'primitive' as const };
      
      expect(typeInference.isCompatible(type1, type2)).toBe(true);
    });

    it('unknownは全ての型と互換性がある', () => {
      const unknownType = { name: 'unknown', kind: 'unknown' as const };
      const stringType = { name: 'string', kind: 'primitive' as const };
      
      expect(typeInference.isCompatible(unknownType, stringType)).toBe(true);
      expect(typeInference.isCompatible(stringType, unknownType)).toBe(true);
    });

    it('ユニオン型のターゲットと互換性をチェックする', () => {
      const stringType = { name: 'string', kind: 'primitive' as const };
      const unionType = {
        name: 'string | number',
        kind: 'union' as const,
        unionTypes: [
          { name: 'string', kind: 'primitive' as const },
          { name: 'number', kind: 'primitive' as const },
        ],
      };
      
      expect(typeInference.isCompatible(stringType, unionType)).toBe(true);
    });

    it('配列型の要素型の互換性をチェックする', () => {
      const array1 = {
        name: 'Array',
        kind: 'array' as const,
        elementType: { name: 'string', kind: 'primitive' as const },
      };
      const array2 = {
        name: 'Array',
        kind: 'array' as const,
        elementType: { name: 'string', kind: 'primitive' as const },
      };
      
      expect(typeInference.isCompatible(array1, array2)).toBe(true);
    });

    it('Promise型の引数の互換性をチェックする', () => {
      const promise1 = {
        name: 'Promise',
        kind: 'promise' as const,
        typeArguments: [{ name: 'string', kind: 'primitive' as const }],
      };
      const promise2 = {
        name: 'Promise',
        kind: 'promise' as const,
        typeArguments: [{ name: 'string', kind: 'primitive' as const }],
      };
      
      expect(typeInference.isCompatible(promise1, promise2)).toBe(true);
    });

    it('互換性のない型を正しく識別する', () => {
      const stringType = { name: 'string', kind: 'primitive' as const };
      const numberType = { name: 'number', kind: 'primitive' as const };
      
      expect(typeInference.isCompatible(stringType, numberType)).toBe(false);
    });
  });

  describe('selectMoreSpecificType', () => {
    it('unknownより具体的な型を選択する', () => {
      const unknownType = { name: 'unknown', kind: 'unknown' as const };
      const stringType = { name: 'string', kind: 'primitive' as const };
      
      expect(typeInference.selectMoreSpecificType(unknownType, stringType)).toEqual(stringType);
      expect(typeInference.selectMoreSpecificType(stringType, unknownType)).toEqual(stringType);
    });

    it('プリミティブ型を優先する', () => {
      const stringType = { name: 'string', kind: 'primitive' as const };
      const objectType = { name: 'object', kind: 'object' as const };
      
      expect(typeInference.selectMoreSpecificType(stringType, objectType)).toEqual(stringType);
      expect(typeInference.selectMoreSpecificType(objectType, stringType)).toEqual(stringType);
    });

    it('デフォルトで最初の型を選択する', () => {
      const type1 = { name: 'CustomType1', kind: 'generic' as const };
      const type2 = { name: 'CustomType2', kind: 'generic' as const };
      
      expect(typeInference.selectMoreSpecificType(type1, type2)).toEqual(type1);
    });
  });
});