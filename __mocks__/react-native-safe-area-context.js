// __mocks__/react-native-safe-area-context.js
// Stub for tests. react-native-safe-area-context is a peer dep of expo-router
// not installed in this project; this stub prevents resolution failures when
// test files import screen files that transitively require it.
module.exports = {
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  SafeAreaProvider: ({ children }) => children,
  SafeAreaView: ({ children }) => children,
  initialWindowMetrics: null,
};
