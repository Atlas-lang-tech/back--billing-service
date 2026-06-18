/** @type {import('jest').Config} */
export default {
  rootDir: '.',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testRegex: '.*\\.spec\\.ts$',
  extensionsToTreatAsEsm: ['.ts'],
  moduleFileExtensions: ['js', 'json', 'ts'],
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      {
        useESM: true,
        tsconfig: 'tsconfig.json',
      },
    ],
  },
  // ESM: relative imports use `.js`, but the source files are `.ts`.
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.spec.ts',
    '!src/**/testing/**',
    '!src/**/dto/**',
    '!src/main.ts',
  ],
  coverageDirectory: './coverage',
};
