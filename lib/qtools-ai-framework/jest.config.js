module.exports = {
    testEnvironment: 'node',
    coverageDirectory: 'coverage',
    collectCoverageFrom: [
        'lib/**/*.js',
        '!lib/**/node_modules/**',
        '!lib/**/*.test.js'
    ],
    testMatch: [
        '**/tests/**/*.test.js',
        '**/lib/**/tests/**/*.test.js'
    ],
    verbose: true,
    clearMocks: true,
    resetMocks: true,
    restoreMocks: true
};