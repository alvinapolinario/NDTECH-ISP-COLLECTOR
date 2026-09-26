import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { colors } from '@/components/theme';
import { LoadingState } from '@/components/ui';
import { ApiError } from '@/lib/api';
import { AuthProvider, useAuth } from '@/lib/auth';

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        // Don't hammer the server on auth/validation errors; retry network blips.
        retry: (failureCount, error) =>
          !(error instanceof ApiError && error.isClientError) && failureCount < 2,
      },
      mutations: { retry: false },
    },
  });
}

function RootNavigator() {
  const { status } = useAuth();

  if (status === 'loading') {
    return <LoadingState />;
  }

  const signedIn = status === 'signedIn';

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Protected guard={!signedIn}>
        <Stack.Screen name="login" options={{ headerShown: false }} />
      </Stack.Protected>
      <Stack.Protected guard={signedIn}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="account/[invoiceId]" options={{ title: 'Account' }} />
        <Stack.Screen name="collect/[invoiceId]" options={{ title: 'Collect payment' }} />
        <Stack.Screen name="gcash/[invoiceId]" options={{ title: 'GCash / online payment' }} />
        <Stack.Screen name="visit/[invoiceId]" options={{ title: 'Log visit' }} />
        <Stack.Screen name="receipt/[paymentId]" options={{ title: 'Receipt' }} />
        <Stack.Screen name="remittances" options={{ title: 'Remittances' }} />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  const [queryClient] = useState(createQueryClient);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <StatusBar style="dark" />
        <RootNavigator />
      </AuthProvider>
    </QueryClientProvider>
  );
}
