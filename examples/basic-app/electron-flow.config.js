import { defineConfig } from '@electron-flow/cli';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // IPC自動生成設定
  framework: {
    apiPath: "./src/main/api",
    ignores: [],
    preloadPath: "./src/preload/autogenerate/index.ts",
    registerPath: "./src/main/register/autogenerate/index.ts",
    rendererTypesPath: "./src/renderer/autogenerate/index.d.ts",
    contextTypeName: "Context",
    errorHandler: {
      functionName: "handleIpcError",
      importPath: "../../error-handler"
    }
  },
  
  // Vite設定（レンダラープロセス）
  renderer: {
    plugins: [react()],
    build: {
      outDir: "../../dist/renderer",
    },
    root: "./src/renderer",
    base: "./",
  },
  
  // ESBuild設定（プリロード）
  preload: {
    entryPoints: ["./src/preload/index.ts"],
    outdir: "./dist/preload",
    bundle: true,
    platform: "browser",
    packages: "external",
  },
  
  // ESBuild設定（メインプロセス）
  main: {
    entryPoints: ["./src/main/index.ts"],
    outdir: "./dist/main",
    bundle: true,
    platform: "node",
    packages: "external",
  },
  
  // Electronパッケージング設定
  packager: {
    dir: ".",
    asar: false,
    overwrite: true,
    out: "out",
    ignore: [
      "src",
      ".gitignore",
      "configs",
      "README.md",
      "tsconfig.json",
      "node_modules/.vite",
      "*.log"
    ],
    icon: "./assets/icon.ico",
  },
  
  // 開発モード設定
  dev: {
    clearViteCache: true,
    port: 5173
  }
});
