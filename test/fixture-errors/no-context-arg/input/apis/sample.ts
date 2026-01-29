// Context引数がない関数のみ（処理対象にならない）
export async function noContextFunction(id: string): Promise<string> {
	return `id: ${id}`;
}

export function anotherFunction(name: string, age: number): void {
	console.log(name, age);
}
