# require

これはライブラリです。
なので、electronアプリケーションからnpm installされる想定でcliを提供します。

electronのIPC部分を自動生成したい。
下記のような関数定義からpreloadやrendererの型定義を生成したい。
関数定義は設定ファイルで任意の1つのフォルダを設定し、そのフォルダ内を再帰的に検索。１つめの引数がContextのものを対象にしたい。
レスポンス定義はzodではしない

```typescript
// zod
export const getAuthorSchema = z.object({
    id: z.string(),
});
export type GetAuthorRequest = z.infer<typeof getAuthorSchema>;

// asyncがつかない場合もある。
export async function getAuthor(
    // データベースやロガーなどを所持
    // 詳細はelectron-flowを使っている側で
    ctx: Context,
    // リクエストがない場合省略可
    request: GetAuthorRequest,
) {
    // バリデート
    const valid = getAuthorSchema.safeParse(request);
    if (!valid.success) {
        logger.warn("get author valid error", valid.error);
        throw new ValidError(valid.error);
    }

// 処理
}
```

生成されるイメージ
electron ipcはthrow errorが単純なstring型になるのでResult型をラップして返す。
Resultはelectron-flowが提供している。
catch部分はelectron-flowを使っている側で実装させたい。

```typescript
    "getAuthor": (ctx: Omit<Context, "event">) => {
        return async (event: IpcMainInvokeEvent, args: any) => {
            try {
                const result = await getAuthor({ ...ctx, event }, args);
                return success(result);
            } catch (e) {
                return handleError({...ctx, event}, e);
            }
        };
    },

// other-file.ts
export function handleError(ctx: Context, e: unknown) {
    if (e instanceof ValidError) {
        const errors = toErrorValue(e.errors);
        return failure(errors);
    }
    if (e instanceof ApplicationError) {
        return failure([{ path: "application error", messages: [e.message] }]);
    }
    return failure([{ path: "system error", messages: [e.message] }]);
}
```

```typescript
import { ErrorValue } from "./error";

export type Success<T> = {
  _tag: "success";
  value: T;
};
export type Failure = {
  _tag: "failure";
  value: ErrorValue[];
};
export type Result<T> = Success<T> | Failure;

export function success<T>(value: T): Success<T> {
  return { _tag: "success", value };
}

export function failure(value: ErrorValue[]): Failure {
  return { _tag: "failure", value };
}

export function isSuccess<T>(result: Result<T>): result is Success<T> {
  return result._tag === "success";
}

export function isFailure<T>(result: Result<T>): result is Failure {
  return result._tag === "failure";
}
```

メインプロセス側コードの変更に併せてelecctronのリスタート、viteサーバーによるレンダラープロセスのリロード(開発時のみ)
TDDでの開発、なのでテスト実装したい。