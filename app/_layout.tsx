import { Stack } from 'expo-router';
import Toast from 'react-native-toast-message';

export default function RootLayout() {
  return (
    <>
      <Stack
        screenOptions={{
          headerShown: false
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="hostjoin" />
        <Stack.Screen name="lobby" />
        <Stack.Screen name="propose-topics" />
        <Stack.Screen name="game" />
        <Stack.Screen name="leaderboard" />
      </Stack>
      <Toast />
    </>
  );
}