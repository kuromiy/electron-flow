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
