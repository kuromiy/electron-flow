/**
 * パスと関連するメッセージを持つエラー値を表現する
 */
export interface ErrorValue {
  /**
   * エラーが発生した場所のパス (例: "email", "user.name", "items[0].quantity")
   */
  path: string;
  
  /**
   * このパスに対するエラーメッセージの配列
   */
  messages: string[];
}