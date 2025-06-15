import type { ErrorValue } from '../error';

describe('ErrorValue型テスト', () => {
  describe('ErrorValue構造', () => {
    it('pathとmessagesプロパティを持つ', () => {
      const error: ErrorValue = {
        path: 'フィールド',
        messages: ['エラーメッセージ'],
      };

      expect(error.path).toBe('フィールド');
      expect(error.messages).toEqual(['エラーメッセージ']);
    });

    it('空のメッセージ配列を受け入れる', () => {
      const error: ErrorValue = {
        path: 'フィールド',
        messages: [],
      };

      expect(error.messages).toEqual([]);
    });

    it('複数のメッセージを受け入れる', () => {
      const error: ErrorValue = {
        path: 'password',
        messages: ['短すぎます', '数字を含める必要があります', '特殊文字を含める必要があります'],
      };

      expect(error.messages).toHaveLength(3);
    });

    it('ネストしたパスで動作する', () => {
      const error: ErrorValue = {
        path: 'user.email',
        messages: ['メール形式が無効です'],
      };

      expect(error.path).toBe('user.email');
    });

    it('配列パスで動作する', () => {
      const error: ErrorValue = {
        path: 'items[0].quantity',
        messages: ['正の値である必要があります'],
      };

      expect(error.path).toBe('items[0].quantity');
    });
  });

  describe('ErrorValueの使用パターン', () => {
    it('配列で動作する', () => {
      const errors: ErrorValue[] = [
        { path: 'name', messages: ['必須項目です'] },
        { path: 'email', messages: ['形式が無効です'] },
        { path: 'age', messages: ['18歳以上である必要があります'] },
      ];

      expect(errors).toHaveLength(3);
      expect(errors.every(e => e.path && e.messages)).toBe(true);
    });

    it('パスによるエラーグループ化をサポートする', () => {
      const errors: ErrorValue[] = [
        { path: 'email', messages: ['必須項目です'] },
        { path: 'email', messages: ['形式が無効です'] },
        { path: 'password', messages: ['短すぎます'] },
      ];

      // パスでグループ化
      const grouped = errors.reduce((acc, error) => {
        if (!acc[error.path]) {
          acc[error.path] = [];
        }
        acc[error.path].push(...error.messages);
        return acc;
      }, {} as Record<string, string[]>);

      expect(grouped).toEqual({
        email: ['必須項目です', '形式が無効です'],
        password: ['短すぎます'],
      });
    });

    it('特別なエラーパスをサポートする', () => {
      const systemError: ErrorValue = {
        path: 'system error',
        messages: ['データベース接続に失敗しました'],
      };

      const applicationError: ErrorValue = {
        path: 'application error',
        messages: ['ユーザーが見つかりません'],
      };

      const validationError: ErrorValue = {
        path: 'validation',
        messages: ['リクエスト形式が無効です'],
      };

      expect(systemError.path).toBe('system error');
      expect(applicationError.path).toBe('application error');
      expect(validationError.path).toBe('validation');
    });

    it('空のパスを処理する', () => {
      const error: ErrorValue = {
        path: '',
        messages: ['一般的なエラー'],
      };

      expect(error.path).toBe('');
    });

    it('長いメッセージを処理する', () => {
      const longMessage = 'あ'.repeat(1000);
      const error: ErrorValue = {
        path: 'フィールド',
        messages: [longMessage],
      };

      expect(error.messages[0]).toHaveLength(1000);
    });
  });

  describe('ErrorValueの型安全性', () => {
    it('コンパイル時に必須プロパティを強制する', () => {
      // このテストはTypeScriptのコンパイルを検証する
      const validError: ErrorValue = {
        path: 'テスト',
        messages: ['エラー'],
      };

      // 以下はTypeScriptエラーを引き起こす:
      // const invalidError1: ErrorValue = { path: 'test' }; // messagesが不足
      // const invalidError2: ErrorValue = { messages: ['error'] }; // pathが不足
      // const invalidError3: ErrorValue = { path: 123, messages: ['error'] }; // pathの型が間違い
      // const invalidError4: ErrorValue = { path: 'test', messages: 'error' }; // messagesの型が間違い

      expect(validError).toBeDefined();
    });

    it('関数の戻り値で動作する', () => {
      function createError(path: string, message: string): ErrorValue {
        return {
          path,
          messages: [message],
        };
      }

      const error = createError('username', '既に使用されています');
      expect(error.path).toBe('username');
      expect(error.messages).toEqual(['既に使用されています']);
    });

    it('エラーマッピングで動作する', () => {
      const zodErrors = [
        { path: ['user', 'email'], message: 'メールが無効です' },
        { path: ['user', 'age'], message: '数値である必要があります' },
      ];

      const errorValues: ErrorValue[] = zodErrors.map(err => ({
        path: err.path.join('.'),
        messages: [err.message],
      }));

      expect(errorValues).toEqual([
        { path: 'user.email', messages: ['メールが無効です'] },
        { path: 'user.age', messages: ['数値である必要があります'] },
      ]);
    });
  });
});