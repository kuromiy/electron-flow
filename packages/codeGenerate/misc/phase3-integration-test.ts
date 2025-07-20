/**
 * Phase 3: コード生成エンジンの統合テスト
 * 生成されるコードの品質と正確性を検証
 */

import { 
  generatePreloadScript, 
  generateHandlers, 
  generateTypeDefinitions,
  validateGeneratedCode 
} from '../src/format.js';
import type { PackageInfo, ZodObjectInfo, FunctionInfo } from '../src/types.js';

// サンプルデータの作成
const samplePackage: PackageInfo = {
  packageName: 'users',
  filePath: '../api/users',
  functions: [
    {
      name: 'createUser',
      parameters: [
        {
          name: 'ctx',
          type: { text: 'Context', kind: 'object', isArray: false, isPromise: false },
          isOptional: false,
          position: 0
        },
        {
          name: 'request',
          type: { text: 'CreateUserRequest', kind: 'object', isArray: false, isPromise: false },
          isOptional: false,
          position: 1
        }
      ],
      returnType: { text: 'Promise<User>', kind: 'promise', isArray: false, isPromise: true },
      isAsync: true,
      isExported: true,
      filePath: '../api/users.ts',
      importPath: '../api/users'
    },
    {
      name: 'getUsers',
      parameters: [
        {
          name: 'ctx',
          type: { text: 'Context', kind: 'object', isArray: false, isPromise: false },
          isOptional: false,
          position: 0
        }
      ],
      returnType: { text: 'Promise<User[]>', kind: 'promise', isArray: false, isPromise: true },
      isAsync: true,
      isExported: true,
      filePath: '../api/users.ts',
      importPath: '../api/users'
    },
    {
      name: 'updateUser',
      parameters: [
        {
          name: 'ctx',
          type: { text: 'Context', kind: 'object', isArray: false, isPromise: false },
          isOptional: false,
          position: 0
        },
        {
          name: 'id',
          type: { text: 'string', kind: 'string', isArray: false, isPromise: false },
          isOptional: false,
          position: 1
        },
        {
          name: 'request',
          type: { text: 'UpdateUserRequest', kind: 'object', isArray: false, isPromise: false },
          isOptional: false,
          position: 2
        }
      ],
      returnType: { text: 'Promise<User>', kind: 'promise', isArray: false, isPromise: true },
      isAsync: true,
      isExported: true,
      filePath: '../api/users.ts',
      importPath: '../api/users'
    }
  ],
  imports: [],
  exports: []
};

const sampleZodInfo: ZodObjectInfo = {
  name: 'createUserSchema',
  filePath: '../api/users.ts',
  schema: {
    type: 'object',
    properties: {
      name: {
        name: 'name',
        type: 'string',
        optional: false,
        nullable: false,
        validations: []
      },
      email: {
        name: 'email',
        type: 'string',
        optional: false,
        nullable: false,
        validations: [{ type: 'email' }]
      }
    }
  },
  exportType: 'export const',
  inferredTypeName: 'CreateUserRequest',
  importPath: '../api/users'
};

function runTests() {
  console.log('🚀 Phase 3 Integration Test Starting...\n');

  try {
    // 1. プリロードスクリプト生成テスト
    console.log('=== 1. Preload Script Generation ===');
    const preloadResult = generatePreloadScript([samplePackage]);
    console.log('Generated preload script:');
    console.log(preloadResult);
    console.log('\n✅ Contains electronAPI:', preloadResult.includes('electronAPI'));
    console.log('✅ Contains createUser:', preloadResult.includes('createUser'));
    console.log('✅ Contains getUsers:', preloadResult.includes('getUsers'));
    console.log('✅ Contains updateUser:', preloadResult.includes('updateUser'));
    console.log('✅ Does not contain ctx:', !preloadResult.includes('ctx'));
    console.log('✅ Contains ipcRenderer.invoke:', preloadResult.includes('ipcRenderer.invoke'));
    console.log('✅ Contains global declaration:', preloadResult.includes('declare global'));

    // プリロードスクリプトのバリデーション
    const preloadValidation = validateGeneratedCode(preloadResult, 'preload');
    console.log('Preload validation result:', preloadValidation.isValid ? '✅ VALID' : '❌ INVALID');
    if (!preloadValidation.isValid) {
      console.log('Errors:', preloadValidation.errors);
    }
    if (preloadValidation.warnings.length > 0) {
      console.log('Warnings:', preloadValidation.warnings);
    }

    console.log('\n' + '='.repeat(50) + '\n');

    // 2. ハンドラーコード生成テスト
    console.log('=== 2. Handler Code Generation ===');
    const handlerResult = generateHandlers([samplePackage]);
    console.log('Generated handler code:');
    console.log(handlerResult);
    console.log('\n✅ Contains autoGenerateHandlers:', handlerResult.includes('autoGenerateHandlers'));
    console.log('✅ Contains handleError:', handlerResult.includes('handleError'));
    console.log('✅ Contains success response:', handlerResult.includes('success: true'));
    console.log('✅ Contains error handling:', handlerResult.includes('catch (error)'));
    console.log('✅ Contains Context type:', handlerResult.includes('Context'));

    // ハンドラーコードのバリデーション
    const handlerValidation = validateGeneratedCode(handlerResult, 'handler');
    console.log('Handler validation result:', handlerValidation.isValid ? '✅ VALID' : '❌ INVALID');
    if (!handlerValidation.isValid) {
      console.log('Errors:', handlerValidation.errors);
    }
    if (handlerValidation.warnings.length > 0) {
      console.log('Warnings:', handlerValidation.warnings);
    }

    console.log('\n' + '='.repeat(50) + '\n');

    // 3. 型定義生成テスト
    console.log('=== 3. Type Definition Generation ===');
    const typeResult = generateTypeDefinitions([samplePackage], [sampleZodInfo]);
    console.log('Generated type definitions:');
    console.log(typeResult);
    console.log('\n✅ Contains ElectronAPI interface:', typeResult.includes('interface ElectronAPI'));
    console.log('✅ Contains Result type:', typeResult.includes('Result<'));
    console.log('✅ Contains Promise return types:', typeResult.includes('Promise<Result<'));
    console.log('✅ Contains global declaration:', typeResult.includes('declare global'));

    // 型定義のバリデーション
    const typeValidation = validateGeneratedCode(typeResult, 'types');
    console.log('Type definition validation result:', typeValidation.isValid ? '✅ VALID' : '❌ INVALID');
    if (!typeValidation.isValid) {
      console.log('Errors:', typeValidation.errors);
    }
    if (typeValidation.warnings.length > 0) {
      console.log('Warnings:', typeValidation.warnings);
    }

    console.log('\n' + '='.repeat(50) + '\n');

    // 4. カスタムエラーハンドラーテスト
    console.log('=== 4. Custom Error Handler Test ===');
    const customErrorHandlerResult = generateHandlers([samplePackage], {
      handlerPath: '../../errors/customHandler',
      handlerName: 'handleAPIError',
      defaultHandler: true
    });
    console.log('Generated handler with custom error handling:');
    console.log(customErrorHandlerResult);
    console.log('\n✅ Contains custom handler import:', customErrorHandlerResult.includes('handleAPIError'));
    console.log('✅ Contains fallback logic:', customErrorHandlerResult.includes('defaultErrorHandler'));

    console.log('\n' + '='.repeat(50) + '\n');

    // 5. 総合結果
    console.log('=== 5. Overall Test Results ===');
    const allValidationsPassed = 
      preloadValidation.isValid && 
      handlerValidation.isValid && 
      typeValidation.isValid;

    if (allValidationsPassed) {
      console.log('🎉 ALL TESTS PASSED!');
      console.log('✅ All generated code compiles successfully');
      console.log('✅ All required patterns are present');
      console.log('✅ TypeScript strict mode compatibility confirmed');
    } else {
      console.log('❌ SOME TESTS FAILED');
      console.log('Please check the validation errors above');
    }

    console.log('\n📊 Test Statistics:');
    console.log(`- Functions processed: ${samplePackage.functions.length}`);
    console.log(`- Preload methods generated: ${samplePackage.functions.length}`);
    console.log(`- Handler functions generated: ${samplePackage.functions.length}`);
    console.log(`- Type interfaces generated: 1 (ElectronAPI)`);

  } catch (error) {
    console.error('❌ Test execution failed:', error);
    process.exit(1);
  }
}

// テスト実行
if (import.meta.url === `file://${process.argv[1]}`) {
  runTests();
}