import { dirname } from "node:path";
import * as ts from "typescript";

/**
 * イベント定義の情報
 * 例: export type onSuccess = (value: SuccessMessage) => void;
 */
export type EventInfo = {
	/** イベント名（例: onSuccess） */
	name: string;
	/** 引数の型名（例: SuccessMessage） */
	paramTypeName: string;
};

/**
 * イベントパッケージ情報
 */
export type EventPackageInfo = {
	/** ファイルパス */
	path: string;
	/** イベント定義リスト */
	events: EventInfo[];
};

/**
 * イベント定義ファイルをパースする
 * 関数型エイリアス（type Foo = (arg: T) => void）を解析する
 * @param paths - パースするファイルパスのリスト
 * @returns イベントパッケージ情報のリスト
 */
export function parseEventFile(paths: string[]): {
	packages: EventPackageInfo[];
} {
	const packages: EventPackageInfo[] = [];

	// 入力ファイルのディレクトリからtsconfig.jsonを探す
	let compilerOptions: ts.CompilerOptions = {};
	if (paths.length > 0) {
		const firstFilePath = paths[0];
		if (firstFilePath) {
			const configPath = ts.findConfigFile(
				dirname(firstFilePath),
				ts.sys.fileExists,
				"tsconfig.json",
			);
			if (configPath) {
				const configFile = ts.readConfigFile(configPath, ts.sys.readFile);
				if (configFile.config) {
					const parsedConfig = ts.parseJsonConfigFileContent(
						configFile.config,
						ts.sys,
						dirname(configPath),
					);
					compilerOptions = parsedConfig.options;
				}
			}
		}
	}

	const program = ts.createProgram(paths, compilerOptions);

	for (const path of paths) {
		const sourceFile = program.getSourceFile(path);
		if (!sourceFile) {
			console.log(`Source file not found: ${path}`);
			continue;
		}

		const events: EventInfo[] = [];

		ts.forEachChild(sourceFile, (node) => {
			// 型エイリアス宣言を解析
			// 例: export type onSuccess = (value: SuccessMessage) => void;
			if (ts.isTypeAliasDeclaration(node)) {
				// exportされている型のみ解析
				const modifierFlags = ts.getCombinedModifierFlags(node);
				const isExported = (modifierFlags & ts.ModifierFlags.Export) !== 0;
				if (!isExported) return;

				const typeName = node.name.getText(sourceFile);

				// 関数型かどうかを確認（ASTレベルで）
				const typeNode = node.type;
				if (!ts.isFunctionTypeNode(typeNode)) return;

				// 戻り値がvoidであることを確認
				const returnTypeNode = typeNode.type;
				if (
					!ts.isTypeReferenceNode(returnTypeNode) &&
					returnTypeNode.kind !== ts.SyntaxKind.VoidKeyword
				) {
					return;
				}
				if (returnTypeNode.kind !== ts.SyntaxKind.VoidKeyword) return;

				// 引数が1つであることを確認
				const parameters = typeNode.parameters;
				if (parameters.length !== 1) return;

				const param = parameters[0];
				if (!param) return;

				// 引数の型名を取得
				const paramTypeNode = param.type;
				if (!paramTypeNode) return;

				// 型参照ノードから型名を取得
				if (!ts.isTypeReferenceNode(paramTypeNode)) return;

				const paramTypeName = paramTypeNode.typeName.getText(sourceFile);

				events.push({
					name: typeName,
					paramTypeName,
				});
			}
		});

		if (events.length > 0) {
			packages.push({
				path,
				events,
			});
		}
	}

	return { packages };
}
