# electron-flow

Type-safe IPC code generator for Electron applications with Result type pattern and user-defined error handling.

## Features

- 🔒 **Type-safe IPC communication** - Full TypeScript support with automatic type inference
- 🎯 **Result type pattern** - Explicit error handling without exceptions
- 🛠️ **User-defined validation** - Complete control over request validation with Zod
- 🎨 **Context-aware error handling** - Access to logger, database, and services in error handlers
- 🚀 **Developer-friendly** - Hot reload, automatic regeneration, and clear error messages
- 📦 **Zero configuration** - Sensible defaults with flexible customization options

## Installation

```bash
npm install --save-dev electron-flow
# or
yarn add -D electron-flow
# or
pnpm add -D electron-flow
```

## Quick Start

1. Initialize your project:

```bash
npx electron-flow init
```

2. Define your handlers:

```typescript
// src/main/handlers/author.ts
import { z } from 'zod';
import type { Context } from '../context';

export const getAuthorSchema = z.object({
  id: z.string(),
});

export type GetAuthorRequest = z.infer<typeof getAuthorSchema>;

export async function getAuthor(ctx: Context, request: GetAuthorRequest) {
  // Validate request
  const valid = getAuthorSchema.safeParse(request);
  if (!valid.success) {
    throw new ValidError(valid.error);
  }
  
  // Business logic
  const author = await ctx.db.author.findUnique({
    where: { id: valid.data.id }
  });
  
  if (!author) {
    throw new ApplicationError('Author not found');
  }
  
  return author;
}
```

3. Define your error handler:

```typescript
// src/main/error-handler.ts
import { failure } from 'electron-flow/runtime';
import type { Context } from './context';

export function handleError(ctx: Context, e: unknown) {
  if (e instanceof ValidError) {
    const errors = toErrorValue(e.errors);
    return failure(errors);
  }
  
  if (e instanceof ApplicationError) {
    return failure([{ 
      path: "application error", 
      messages: [e.message] 
    }]);
  }
  
  return failure([{ 
    path: "system error", 
    messages: [e.message] 
  }]);
}
```

4. Generate IPC code:

```bash
npx electron-flow generate
```

5. Use in your renderer:

```typescript
import { api } from './generated/renderer/api';

const author = await api.author.get({ id: '123' });
console.log(author.name);
```

## Configuration

Create `electron-flow.config.ts` in your project root:

```typescript
import type { ElectronFlowConfig } from 'electron-flow';

const config: ElectronFlowConfig = {
  handlersDir: 'src/main/handlers',
  outDir: 'src/generated',
  contextPath: 'src/main/context.ts',
  errorHandlerPath: 'src/main/error-handler.ts',
  dev: {
    electronEntry: 'src/main/index.ts',
    preloadEntry: 'src/preload/index.ts',
    viteConfig: 'vite.config.ts',
  },
};

export default config;
```

## Commands

- `npx electron-flow init` - Initialize a new project
- `npx electron-flow generate` - Generate IPC code
- `npx electron-flow watch` - Watch for changes and regenerate
- `npx electron-flow dev` - Development server with hot reload

## Documentation

For detailed documentation, visit [https://github.com/yourusername/electron-flow](https://github.com/yourusername/electron-flow)

## License

MIT
