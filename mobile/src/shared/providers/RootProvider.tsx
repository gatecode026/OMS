/**
 * @file RootProvider.tsx
 * @description Master provider component that aggregates React Query, Gesture Handler, Safe Areas, Network state, and Theme.
 */

import React from 'react';
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClientProvider } from '@tanstack/react-query';
import queryClient from '../api/queryClient';
import NetworkProvider from './NetworkProvider';
import ThemeProvider from '../theme/ThemeProvider';
import CallProvider from './CallProvider';
import { CallStoreSyncer } from '../components/CallStoreSyncer';
import { UserProfileSyncer } from '../components/UserProfileSyncer';

interface RootProviderProps {
  children: React.ReactNode;
}

export const RootProvider: React.FC<RootProviderProps> = ({ children }) => {
  return (
    <GestureHandlerRootView style={styles.container}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <NetworkProvider>
            <ThemeProvider>
              <CallProvider>
                <CallStoreSyncer />
                <UserProfileSyncer />
                {children}
              </CallProvider>
            </ThemeProvider>
          </NetworkProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
export default RootProvider;
