module.exports = {
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  extends: [
    'eslint:recommended'
  ],
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module'
  },
  rules: {
    'no-unused-vars': 'off',
    'no-console': ['warn', { allow: ['warn', 'error'] }],
    'prefer-const': 'error',
    'no-var': 'error'
  },
  env: {
    node: true,
    es2022: true
  },
  ignorePatterns: [
    'dist',
    'node_modules',
    '*.js',
    'examples',
    '**/*.d.ts'
  ],
  overrides: [
    {
      files: ['*.ts'],
      extends: [
        'eslint:recommended'
      ],
      rules: {
        '@typescript-eslint/explicit-function-return-type': 'warn',
        '@typescript-eslint/no-explicit-any': 'warn',
        '@typescript-eslint/consistent-type-definitions': ['error', 'interface']
      }
    }
  ]
};