import type { IpcMainInvokeEvent } from 'electron';

/**
 * electron-flow で使用するコンテキスト型
 * 
 * この型定義をカスタマイズして、API関数で使用する共通の情報を追加できます。
 * 例: ユーザー情報、データベース接続、設定など
 */
export interface Context {
  /** IPCイベントオブジェクト */
  event: IpcMainInvokeEvent;
  
  // カスタムフィールドを追加
  // 例:
  // user?: {
  //   id: string;
  //   name: string;
  //   roles: string[];
  // };
  // db?: DatabaseConnection;
  // config?: AppConfig;
}
