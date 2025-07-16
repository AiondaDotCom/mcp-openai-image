module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.test.ts'],
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      tsconfig: {
        module: 'commonjs',
        esModuleInterop: true,
        allowSyntheticDefaultImports: true
      }
    }]
  },
  moduleFileExtensions: ['ts', 'js'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
    '^@modelcontextprotocol/sdk/(.*)$': '<rootDir>/tests/__mocks__/@modelcontextprotocol/sdk/$1',
    '^openai$': '<rootDir>/tests/__mocks__/openai.js'
  },
  transformIgnorePatterns: [
    'node_modules/'
  ],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/index.ts',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  // No coverage thresholds for CI
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  // Disable coverage collection in CI
  collectCoverage: false,
  // Verbose output for debugging
  verbose: true
};