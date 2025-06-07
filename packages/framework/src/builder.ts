import { writeFile, mkdir } from "fs/promises";
import { dirname } from "path";
import { IpcFrameworkConfig, GenerationResult } from "./types";
import { readFilePaths, validateConfig } from "./utils";
import { parseApiFiles } from "./parser";
import { extractZodObjectInfos } from "./zod-analyzer";
import { generatePreloadScript, generateRegisterScript, generateRendererTypes } from "./generators";
import * as chokidar from "chokidar";

/**
 * Ensures directory exists and writes file safely
 * @param filePath - Path to write file
 * @param content - Content to write
 */
async function ensureDirectoryAndWriteFile(filePath: string, content: string): Promise<void> {
  const directory = dirname(filePath);
  
  // Create directory recursively if it doesn't exist
  await mkdir(directory, { recursive: true });
  
  // Write the file
  await writeFile(filePath, content);
  console.log(`📄 Generated file: ${filePath}`);
}

/**
 * Builds the IPC bridge code once
 * @param config - Framework configuration
 * @returns Generation result
 */
export async function build(config: IpcFrameworkConfig): Promise<GenerationResult> {
  validateConfig(config);
  
  console.log('🔍 Scanning API files...');
  const filePaths = await readFilePaths(config.apiPath);
  
  if (filePaths.length === 0) {
    console.warn(`⚠️  No TypeScript files found in ${config.apiPath}`);
    return { zodObjectInfos: [], packages: [] };
  }
  
  console.log(`📁 Found ${filePaths.length} files`);
  
  console.log('🔬 Extracting Zod schemas...');
  const zodObjectInfos = await extractZodObjectInfos(filePaths);
  
  console.log('🔍 Parsing API functions...');
  const packages = parseApiFiles(
    filePaths,
    config.ignores || [],
    [],
    config.contextTypeName || 'Context'
  );
  
  // Sort for consistent output
  packages.sort((a, b) => a.path.localeCompare(b.path));
  packages.forEach(pkg => {
    pkg.functions.sort((a, b) => a.name.localeCompare(b.name));
  });
  
  console.log('📝 Generating code...');
  
  // Generate preload script
  const preloadContent = generatePreloadScript(zodObjectInfos, packages);
  await ensureDirectoryAndWriteFile(config.preloadPath, preloadContent);
  
  // Generate register script
  const registerContent = generateRegisterScript(packages, config.registerPath, config);
  await ensureDirectoryAndWriteFile(config.registerPath, registerContent);
  
  // Generate renderer types
  const rendererTypesContent = generateRendererTypes(packages, zodObjectInfos, config.rendererTypesPath);
  await ensureDirectoryAndWriteFile(config.rendererTypesPath, rendererTypesContent);
  
  const functionCount = packages.reduce((sum, pkg) => sum + pkg.functions.length, 0);
  console.log(`✅ Generated IPC bridge for ${functionCount} functions`);
  
  return { zodObjectInfos, packages };
}

/**
 * Watches API files and rebuilds on changes
 * @param config - Framework configuration
 * @returns Promise that resolves when watcher is set up
 */
export async function watch(config: IpcFrameworkConfig): Promise<void> {
  validateConfig(config);
  
  console.log('🚀 Starting watch mode...');
  
  // Initial build
  let { zodObjectInfos, packages } = await build(config);
  
  // Set up file watcher
  const watcher = chokidar.watch(config.apiPath, {
    ignored: /(^|[\/\\])\..*/, // ignore dotfiles
    persistent: true,
    ignoreInitial: true
  });
  
  // Debounce mechanism
  let rebuildTimeout: NodeJS.Timeout;
  const debounceMs = 500;
  
  const handleFileChange = async (eventType: string, filePath?: string) => {
    if (!filePath || !filePath.endsWith('.ts')) {
      return;
    }
    
    console.log(`📝 File ${eventType}: ${filePath}`);
    
    // Clear existing timeout
    if (rebuildTimeout) {
      clearTimeout(rebuildTimeout);
    }
    
    // Set new timeout
    rebuildTimeout = setTimeout(async () => {
      try {
        console.log('🔄 Rebuilding...');
        const result = await build(config);
        zodObjectInfos = result.zodObjectInfos;
        packages = result.packages;
        console.log('✅ Rebuild complete');
      } catch (error) {
        console.error('❌ Rebuild failed:', error instanceof Error ? error.message : String(error));
      }
    }, debounceMs);
  };
  
  watcher
    .on('add', (path) => handleFileChange('added', path))
    .on('change', (path) => handleFileChange('changed', path))
    .on('unlink', (path) => handleFileChange('removed', path))
    .on('error', (error) => console.error('👀 Watcher error:', error instanceof Error ? error.message : String(error)));
  
  console.log(`👀 Watching ${config.apiPath} for changes...`);
  console.log('Press Ctrl+C to stop watching');
  
  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n🛑 Stopping watcher...');
    watcher.close();
    process.exit(0);
  });
}
