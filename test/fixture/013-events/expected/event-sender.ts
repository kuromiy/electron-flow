// auto generated
import type { WebContents } from "electron";
import type { ErrorMessage, SuccessMessage } from "../../fixture/013-events/input/events/notification.js";

/**
 * 型安全なイベント送信クラス
 * Contextに組み込んで使用する
 */
export class EventSender {
    constructor(private sender: WebContents) {}

    onError(value: ErrorMessage) {
        this.sender.send("onError", value);
    }

    onSuccess(value: SuccessMessage) {
        this.sender.send("onSuccess", value);
    }
}

/**
 * EventSenderのファクトリ関数
 */
export function createEventSender(sender: WebContents): EventSender {
    return new EventSender(sender);
}
