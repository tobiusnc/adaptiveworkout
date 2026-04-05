module.exports = {
  preset: 'jest-expo',
  moduleNameMapper: {
    // react-native-safe-area-context is a peer dep of expo-router not installed
    // in this project. Map it to a manual stub so screen files can be imported
    // in unit tests without a device runtime.
    '^react-native-safe-area-context$': '<rootDir>/__mocks__/react-native-safe-area-context.js',
  },
};
