import { Stack } from 'expo-router';
import { ModelProvider } from '@/lib/model-context';
import { InferenceProvider } from '@/lib/inference';

export default function AppLayout() {
  return (
    <ModelProvider>
      <InferenceProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
        </Stack>
      </InferenceProvider>
    </ModelProvider>
  );
}
