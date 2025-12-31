export type SuccessMessage = {
    message: string;
};
export type onSuccess = (value: SuccessMessage) => void;

export type ErrorMessage = {
    message: string;
    code?: string;
};
export type onError = (value: ErrorMessage) => void;
