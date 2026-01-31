export type Success<T> = {
	_tag: "success";
	value: T;
};

export type Failure<E = Error> = {
	_tag: "failure";
	value: E;
};

export type Result<T, E = Error> = Success<T> | Failure<E>;

export function success<T>(value: T): Success<T> {
	return { _tag: "success", value };
}

export function failure<E = Error>(value: E): Failure<E> {
	return { _tag: "failure", value };
}

export function isSuccess<T, E = Error>(
	result: Result<T, E>,
): result is Success<T> {
	return result._tag === "success";
}

export function isFailure<T, E = Error>(
	result: Result<T, E>,
): result is Failure<E> {
	return result._tag === "failure";
}

/**
 * エラーハンドラーが処理できなかったエラーをラップする型
 */
export type UnknownError = {
	_tag: "UnknownError";
	value: unknown;
};

export function unknownError(value: unknown): UnknownError {
	return { _tag: "UnknownError", value };
}

export function isUnknownError(error: unknown): error is UnknownError {
	return (
		typeof error === "object" &&
		error !== null &&
		"_tag" in error &&
		(error as UnknownError)._tag === "UnknownError"
	);
}
