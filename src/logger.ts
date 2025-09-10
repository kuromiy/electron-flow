/**
 * ログレベルの定義
 */
export enum LogLevel {
	ERROR = 0,
	WARN = 1,
	INFO = 2,
	DEBUG = 3,
}

/**
 * ログレベルの文字列マッピング
 */
const LOG_LEVEL_NAMES: Record<LogLevel, string> = {
	[LogLevel.ERROR]: "ERROR",
	[LogLevel.WARN]: "WARN",
	[LogLevel.INFO]: "INFO",
	[LogLevel.DEBUG]: "DEBUG",
};

/**
 * ANSIカラーコード（ターミナル出力用）
 */
const COLORS = {
	RESET: "\x1b[0m",
	RED: "\x1b[31m",
	YELLOW: "\x1b[33m",
	BLUE: "\x1b[34m",
	GRAY: "\x1b[90m",
} as const;

/**
 * ログレベルごとのカラー設定
 */
const LOG_COLORS: Record<LogLevel, string> = {
	[LogLevel.ERROR]: COLORS.RED,
	[LogLevel.WARN]: COLORS.YELLOW,
	[LogLevel.INFO]: COLORS.BLUE,
	[LogLevel.DEBUG]: COLORS.GRAY,
};

/**
 * ロガークラス
 */
export class Logger {
	private currentLevel: LogLevel;
	private useColor: boolean;

	constructor(level: LogLevel = LogLevel.INFO, useColor = true) {
		this.currentLevel = level;
		this.useColor = useColor && process.stdout.isTTY;
	}

	/**
	 * ログレベルを設定
	 */
	setLevel(level: LogLevel): void {
		this.currentLevel = level;
	}

	/**
	 * 現在のログレベルを取得
	 */
	getLevel(): LogLevel {
		return this.currentLevel;
	}

	/**
	 * カラー出力の有効/無効を設定
	 */
	setUseColor(useColor: boolean): void {
		this.useColor = useColor && process.stdout.isTTY;
	}

	/**
	 * タイムスタンプを生成
	 */
	private getTimestamp(): string {
		return new Date().toISOString();
	}

	/**
	 * ログメッセージをフォーマット
	 */
	private formatMessage(
		level: LogLevel,
		message: string,
		...args: unknown[]
	): string {
		const timestamp = this.getTimestamp();
		const levelName = LOG_LEVEL_NAMES[level];
		const formattedArgs =
			args.length > 0
				? ` ${args.map((arg) => JSON.stringify(arg)).join(" ")}`
				: "";

		if (this.useColor) {
			const color = LOG_COLORS[level];
			return `${COLORS.GRAY}${timestamp}${COLORS.RESET} ${color}[${levelName}]${COLORS.RESET} ${message}${formattedArgs}`;
		}

		return `${timestamp} [${levelName}] ${message}${formattedArgs}`;
	}

	/**
	 * ログを出力
	 */
	private log(level: LogLevel, message: string, ...args: unknown[]): void {
		if (level > this.currentLevel) {
			return;
		}

		const formattedMessage = this.formatMessage(level, message, ...args);

		if (level === LogLevel.ERROR) {
			console.error(formattedMessage);
		} else {
			console.log(formattedMessage);
		}
	}

	/**
	 * エラーログ
	 */
	error(message: string, ...args: unknown[]): void {
		this.log(LogLevel.ERROR, message, ...args);
	}

	/**
	 * 警告ログ
	 */
	warn(message: string, ...args: unknown[]): void {
		this.log(LogLevel.WARN, message, ...args);
	}

	/**
	 * 情報ログ
	 */
	info(message: string, ...args: unknown[]): void {
		this.log(LogLevel.INFO, message, ...args);
	}

	/**
	 * デバッグログ
	 */
	debug(message: string, ...args: unknown[]): void {
		this.log(LogLevel.DEBUG, message, ...args);
	}

	/**
	 * オブジェクトを整形してログ出力
	 */
	logObject(level: LogLevel, message: string, obj: unknown): void {
		if (level > this.currentLevel) {
			return;
		}

		const formattedMessage = this.formatMessage(level, message, "");
		const objString = JSON.stringify(obj, null, 2);

		if (level === LogLevel.ERROR) {
			console.error(formattedMessage);
			console.error(objString);
		} else {
			console.log(formattedMessage);
			console.log(objString);
		}
	}

	/**
	 * デバッグレベルでオブジェクトを出力
	 */
	debugObject(message: string, obj: unknown): void {
		this.logObject(LogLevel.DEBUG, message, obj);
	}
}

/**
 * 環境変数からログレベルを取得
 */
function getLogLevelFromEnv(): LogLevel {
	const envLevel = process.env.LOG_LEVEL?.toUpperCase();

	switch (envLevel) {
		case "ERROR":
			return LogLevel.ERROR;
		case "WARN":
			return LogLevel.WARN;
		case "INFO":
			return LogLevel.INFO;
		case "DEBUG":
			return LogLevel.DEBUG;
		default:
			return LogLevel.INFO;
	}
}

/**
 * デフォルトのロガーインスタンス
 */
export const logger = new Logger(getLogLevelFromEnv());

/**
 * ログレベルを設定（外部公開用）
 */
export function setLogLevel(level: LogLevel): void {
	logger.setLevel(level);
}

/**
 * 文字列からログレベルを設定
 */
export function setLogLevelByName(levelName: string): void {
	const upperName = levelName.toUpperCase();
	switch (upperName) {
		case "ERROR":
			logger.setLevel(LogLevel.ERROR);
			break;
		case "WARN":
			logger.setLevel(LogLevel.WARN);
			break;
		case "INFO":
			logger.setLevel(LogLevel.INFO);
			break;
		case "DEBUG":
			logger.setLevel(LogLevel.DEBUG);
			break;
		default:
			logger.warn(`Invalid log level: ${levelName}. Using INFO level.`);
			logger.setLevel(LogLevel.INFO);
	}
}
