import { ZodObject } from "zod";
import { relative } from "path";
import { ZodObjectInfo } from "./types";

/**
 * Type guard to check if a value is a ZodObject
 */
function isZodObject(value: any): value is ZodObject<any> {
  return value && typeof value === 'object' && value.constructor && value.constructor.name === 'ZodObject';
}

/**
 * Extracts ZodObject information from TypeScript files
 * @param filePaths - Array of file paths to analyze
 * @param existingList - Existing list to append to
 * @returns Array of ZodObjectInfo
 */
export async function extractZodObjectInfos(
  filePaths: string[], 
  existingList: ZodObjectInfo[] = []
): Promise<ZodObjectInfo[]> {
  const list = [...existingList];
  
  for (const filePath of filePaths) {
    try {
      // Clear require cache to get fresh modules
      const modulePath = getRequirePath(filePath);
      delete require.cache[require.resolve(modulePath)];
      
      const modules = require(modulePath);
      
      Object.entries(modules).forEach(([exportName, exportValue]) => {
        if (isZodObject(exportValue)) {
          const fields = extractZodFields(exportValue);
          list.push({
            path: filePath,
            name: exportName,
            fields
          });
        }
      });
    } catch (error) {
      console.warn(`Warning: Could not analyze zod objects in ${filePath}:`, error instanceof Error ? error.message : String(error));
    }
  }
  
  return list;
}

/**
 * Extracts field information from a ZodObject
 * @param zodObject - The ZodObject to analyze
 * @returns Array of field information
 */
function extractZodFields(zodObject: ZodObject<any>): { name: string; type: string }[] {
  try {
    const shape = zodObject._def.shape();
    return Object.keys(shape).map(fieldName => ({
      name: fieldName,
      type: inferZodType(shape[fieldName])
    }));
  } catch (error) {
    console.warn('Warning: Could not extract zod fields:', error instanceof Error ? error.message : String(error));
    return [];
  }
}

/**
 * Infers TypeScript type from Zod schema
 * @param zodSchema - The Zod schema to analyze
 * @returns TypeScript type string
 */
function inferZodType(zodSchema: any): string {
  if (!zodSchema || !zodSchema.constructor) {
    return 'unknown';
  }
  
  const zodType = zodSchema.constructor.name;
  
  switch (zodType) {
    case 'ZodString':
      return 'string';
      
    case 'ZodNumber':
      return 'number';
      
    case 'ZodBoolean':
      return 'boolean';
      
    case 'ZodArray':
      return `${inferZodType(zodSchema._def.type)}[]`;
      
    case 'ZodObject': {
      const shape = zodSchema._def.shape();
      const fields = Object.entries(shape)
        .map(([key, value]) => `${key}: ${inferZodType(value)}`)
        .join(', ');
      return `{${fields}}`;
    }
    
    case 'ZodUnion':
      return zodSchema._def.options
        .map((option: any) => inferZodType(option))
        .join(' | ');
        
    case 'ZodLiteral':
      return typeof zodSchema._def.value === 'string' 
        ? `"${zodSchema._def.value}"` 
        : String(zodSchema._def.value);
        
    case 'ZodOptional':
      return `${inferZodType(zodSchema._def.innerType)} | undefined`;
      
    case 'ZodDefault':
      return inferZodType(zodSchema._def.innerType);
      
    case 'ZodNullable':
      return `${inferZodType(zodSchema._def.innerType)} | null`;
      
    case 'ZodEnum':
      return zodSchema._def.values
        .map((value: any) => `"${value}"`)
        .join(' | ');
        
    default:
      console.warn(`Unknown Zod type: ${zodType}`);
      return 'unknown';
  }
}

/**
 * Converts a file path to a require-compatible path
 * @param filePath - The file path to convert
 * @returns Require-compatible path
 */
function getRequirePath(filePath: string): string {
  return relative(__dirname, filePath).replace(/\.[^/.]+$/, '');
}
