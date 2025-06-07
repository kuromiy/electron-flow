export * from './types';
export * from './builder';
export * from './utils';
export { parseApiFiles } from './parser';
export { extractZodObjectInfos } from './zod-analyzer';
export { generatePreloadScript, generateRegisterScript, generateRendererTypes } from './generators';

// Re-export from shared package
export { Result, Success, Failure, success, failure, isSuccess, isFailure } from '@electron-flow/shared';

// Re-export main functions
export { build, watch } from './builder';
