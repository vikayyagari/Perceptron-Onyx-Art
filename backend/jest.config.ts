import type { Config } from 'jest'

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src/__tests__'],
  moduleNameMapper: {
    '@perceptron/shared': '<rootDir>/../shared/src',
  },
  setupFiles: ['<rootDir>/src/__tests__/setup-env.ts'],
  globalSetup: '<rootDir>/src/__tests__/integration/global-setup.ts',
  globalTeardown: '<rootDir>/src/__tests__/integration/global-teardown.ts',
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/__tests__/**',
    '!src/index.ts',
    '!src/types/**',
  ],
  coverageThreshold: {
    global: {
      lines: 70,
      functions: 70,
    },
  },
  testTimeout: 30000,
}

export default config
