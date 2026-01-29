export interface SuccessMessage {
	id: string;
	message: string;
}

export interface ErrorMessage {
	code: string;
	message: string;
}

export type onSuccess = (value: SuccessMessage) => void;
export type onError = (value: ErrorMessage) => void;
