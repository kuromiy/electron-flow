import { success, failure, isSuccess, isFailure } from '../result';
import type { Result, Success, Failure } from '../result';
import type { ErrorValue } from '../error';

describe('Result型テスト', () => {
  describe('success関数', () => {
    it('プリミティブ値でSuccess結果を作成できる', () => {
      const result = success('テスト値');
      
      expect(result).toEqual({
        _tag: 'success',
        value: 'テスト値',
      });
    });

    it('オブジェクト値でSuccess結果を作成できる', () => {
      const data = { id: 1, name: 'テスト' };
      const result = success(data);
      
      expect(result).toEqual({
        _tag: 'success',
        value: data,
      });
    });

    it('null値でSuccess結果を作成できる', () => {
      const result = success(null);
      
      expect(result).toEqual({
        _tag: 'success',
        value: null,
      });
    });

    it('undefined値でSuccess結果を作成できる', () => {
      const result = success(undefined);
      
      expect(result).toEqual({
        _tag: 'success',
        value: undefined,
      });
    });
  });

  describe('failure関数', () => {
    it('単一エラーでFailure結果を作成できる', () => {
      const errors: ErrorValue[] = [
        { path: 'フィールド', messages: ['無効な値'] },
      ];
      const result = failure(errors);
      
      expect(result).toEqual({
        _tag: 'failure',
        value: errors,
      });
    });

    it('複数エラーでFailure結果を作成できる', () => {
      const errors: ErrorValue[] = [
        { path: 'email', messages: ['メール形式が無効'] },
        { path: 'password', messages: ['短すぎます', '数字を含める必要があります'] },
      ];
      const result = failure(errors);
      
      expect(result).toEqual({
        _tag: 'failure',
        value: errors,
      });
    });

    it('空のエラー配列でFailure結果を作成できる', () => {
      const result = failure([]);
      
      expect(result).toEqual({
        _tag: 'failure',
        value: [],
      });
    });
  });

  describe('isSuccess関数', () => {
    it('Success結果に対してtrueを返す', () => {
      const result = success('テスト');
      
      expect(isSuccess(result)).toBe(true);
    });

    it('Failure結果に対してfalseを返す', () => {
      const result = failure([{ path: 'エラー', messages: ['失敗'] }]);
      
      expect(isSuccess(result)).toBe(false);
    });

    it('型ガードとして機能する', () => {
      const result: Result<string> = success('テスト');
      
      if (isSuccess(result)) {
        // TypeScriptはresultがSuccess<string>であることを認識する
        const value: string = result.value;
        expect(value).toBe('テスト');
      } else {
        // この分岐は実行されないはず
        fail('成功結果が期待されます');
      }
    });
  });

  describe('isFailure関数', () => {
    it('Success結果に対してfalseを返す', () => {
      const result = success('テスト');
      
      expect(isFailure(result)).toBe(false);
    });

    it('Failure結果に対してtrueを返す', () => {
      const result = failure([{ path: 'エラー', messages: ['失敗'] }]);
      
      expect(isFailure(result)).toBe(true);
    });

    it('型ガードとして機能する', () => {
      const result: Result<string> = failure([{ path: 'エラー', messages: ['失敗'] }]);
      
      if (isFailure(result)) {
        // TypeScriptはresultがFailureであることを認識する
        const errors: ErrorValue[] = result.value;
        expect(errors).toHaveLength(1);
        expect(errors[0].path).toBe('エラー');
      } else {
        // この分岐は実行されないはず
        fail('失敗結果が期待されます');
      }
    });
  });

  describe('Result型の使用例', () => {
    it('ジェネリック型で動作する', () => {
      interface User {
        id: number;
        name: string;
      }

      const successResult: Result<User> = success({ id: 1, name: 'テスト' });
      const failureResult: Result<User> = failure([{ path: 'ユーザー', messages: ['見つかりません'] }]);

      expect(isSuccess(successResult)).toBe(true);
      expect(isFailure(failureResult)).toBe(true);
    });

    it('非同期関数で動作する', async () => {
      async function fetchData(): Promise<Result<string>> {
        try {
          // 非同期操作をシミュレート
          await Promise.resolve();
          return success('データ');
        } catch {
          return failure([{ path: 'フェッチ', messages: ['取得に失敗しました'] }]);
        }
      }

      const result = await fetchData();
      expect(isSuccess(result)).toBe(true);
    });

    it('複雑なエラーシナリオを処理できる', () => {
      const validationErrors: ErrorValue[] = [
        { path: 'email', messages: ['形式が無効', '既に存在します'] },
        { path: 'password', messages: ['弱すぎます'] },
        { path: 'username', messages: ['必須項目です'] },
      ];

      const result: Result<void> = failure(validationErrors);

      if (isFailure(result)) {
        expect(result.value).toHaveLength(3);
        expect(result.value[0].messages).toHaveLength(2);
      }
    });
  });
});