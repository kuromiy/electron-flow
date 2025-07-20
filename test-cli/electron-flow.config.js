// @ts-check

/**
 * @type {import('electron-flow').AutoCodeOption}
 */
export const autoCodeOption = {
  targetPath: "./src/main/api",
  ignores: [],
  preloadPath: "./src/preload/autogenerate/index.ts",
  registerPath: "./src/main/register/autogenerate/index.ts",
  rendererPath: "./src/renderer/autogenerate/index.d.ts",
  contextPath: "./src/types/context.ts",
  
  // オプション設定
  // errorHandler: {
  //   handlerPath: "../../errors/handler",
  //   handlerName: "customErrorHandler",
  //   defaultHandler: true
  // }
};
