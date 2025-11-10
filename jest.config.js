export default {
  preset: 'ts-jest',
  testEnvironment: 'node',
  transform: {
    '^.+\\.ts$': 'ts-jest'
  },
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  testMatch: ['**/__tests__/**/*.[tj]s?(x)', '**/?(*.)+(spec|test).[tj]s?(x)'],
  passWithNoTests: false,
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  roots: ['<rootDir>'],
  testPathIgnorePatterns: ['/node_modules/', '/e2e/', '/api/', '/pages/', '/scripts/', '/server/']
};
