module.exports = {
    testEnvironment: 'node',
    testMatch: ['**/__tests__/**/*.test.js'],
    collectCoverageFrom: [
        'codecs/**/*.js',
        'libs/**/*.js',
        '!**/node_modules/**'
    ],
    coverageDirectory: 'coverage',
    verbose: true
};
