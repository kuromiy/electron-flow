# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Guidelines

- コミットやプッシュはこちらでやる
- コメント、ドキュメント、応答は日本語で

## Development Commands

### Testing
```bash
npm test                    # Run all tests
npm run test:watch         # Watch mode for development
npm run test:coverage      # Run tests with coverage
npm run tdd                # TDD mode with verbose output
npm test src/path/file.test.ts  # Run specific test file
```

### Building and Development
```bash
npm run build              # Build TypeScript to dist/
npm run dev                # Watch mode compilation
npm run lint               # ESLint check
npm run lint:fix           # ESLint auto-fix
npm run format             # Prettier format
```

### CLI Testing
```bash
node bin/electron-flow --help    # Test CLI commands locally
```

## Architecture Overview

### Core Components

**electron-flow** is a type-safe IPC code generator for Electron applications that implements the Result type pattern for explicit error handling.

#### 1. Runtime Library (`src/runtime/`)
- **Result Type System**: `Result<T> = Success<T> | Failure<ErrorValue[]>`
- **Error Handling**: `ErrorValue` interface with path and messages
- **Utilities**: `success()`, `failure()`, `isSuccess()`, `isFailure()` functions
- Status: ✅ **Complete** - All tests passing (29 tests)

#### 2. CLI Foundation (`src/cli/`)
- **Command Structure**: Commander.js-based CLI with 4 main commands
- **Configuration**: TypeScript config loader with validation
- **Error Handling**: Custom ElectronFlowError with Japanese messages
- Status: ✅ **Foundation Complete** - Commands are stubs (23 tests)

#### 3. Code Generation Engine (`src/generator/`)
- **Parser**: TypeScript AST analysis using ts-morph
- **Generator**: IPC code generation for main/preload/renderer
- **Type Inference**: Automatic type detection and generation
- Status: ❌ **Not Implemented** (Phase 2 target)

### Implementation Phases

**Current Status: Phase 1 Complete (52/52 tests passing)**

- **Phase 1** ✅: Library Foundation (Runtime + CLI base)
- **Phase 2** 🔄: Code Generation Engine 
- **Phase 3** ⏳: CLI Commands Implementation
- **Phase 4** ⏳: Development Experience
- **Phase 5** ⏳: Testing & Documentation

### Key Design Decisions

1. **User-Controlled Validation**: Users implement validation in handlers (not auto-generated)
2. **Context-Aware Error Handling**: `handleError(ctx: Context, e: unknown)` receives context
3. **Result Type Pattern**: Explicit success/failure handling without exceptions
4. **TDD Approach**: Test-first development with 90%+ coverage requirement

### Configuration Structure

```typescript
interface ElectronFlowConfig {
  handlersDir: string;          // Handler functions directory
  outDir: string;               // Generated code output
  contextPath: string;          // Context type definition
  errorHandlerPath: string;     // Error handler implementation
  dev?: DevConfig;              // Development server options
  generation?: GenerationConfig; // Code generation options
}
```

### Testing Strategy

- **TDD Approach**: Red-Green-Refactor cycle
- **Test Structure**: Arrange-Act-Assert pattern
- **Coverage Target**: 90%+ (currently achieved)
- **Japanese Test Names**: All test descriptions in Japanese
- **Mock Strategy**: Electron, fs, and ts-morph modules mocked

### Code Generation Pattern

```typescript
// Target generation pattern for main process
ipcMain.handle('functionName', async (event: IpcMainInvokeEvent, args: any) => {
  try {
    const result = await handlerFunction({ ...ctx, event }, args);
    return success(result);
  } catch (e) {
    return handleError({ ...ctx, event }, e);
  }
});
```

## Development Guidelines

### Adding New Features
1. Create tests first (TDD)
2. Implement minimum viable functionality
3. Refactor for clarity and performance
4. Ensure Japanese comments and messages
5. Update relevant documentation

### Testing New Components
- Place tests in `__tests__/` directories alongside source
- Use descriptive Japanese test names
- Mock external dependencies (Electron, filesystem)
- Target 90%+ coverage for new code

### File Structure Patterns
```
src/
├── runtime/           # Core Result type system
├── cli/              # CLI commands and utilities
├── generator/        # Code generation engine (Phase 2)
├── dev-server/       # Development server (Phase 3)
└── index.ts          # Public API exports
```