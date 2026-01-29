// auto generated
import type { ErrorMessage, SuccessMessage } from "../../../fixture/013-events/input/events/notification.js";

// window.events の型定義
declare global {
    interface Window {
        events: {
            onError: (cb: (value: ErrorMessage) => void) => () => void;
            onSuccess: (cb: (value: SuccessMessage) => void) => () => void;
        };
    }
}

// イベント購読用インターフェース
export interface EventServiceIF {
    onError: (cb: (value: ErrorMessage) => void) => () => void;
    onSuccess: (cb: (value: SuccessMessage) => void) => () => void;
}

// イベント購読用実装クラス
export class EventService implements EventServiceIF {
    onError(cb: (value: ErrorMessage) => void) {
        return window.events.onError(cb);
    }

    onSuccess(cb: (value: SuccessMessage) => void) {
        return window.events.onSuccess(cb);
    }
}
