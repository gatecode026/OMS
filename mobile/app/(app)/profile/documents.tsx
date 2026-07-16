/**
 * @file documents.tsx
 * @description Uploaded Documents inner page for the Enterprise Profile Module. Supports listing, previewing, and downloading.
 */

import React from 'react';
import { View, Text, ScrollView, StyleSheet, StatusBar, Pressable, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import useTheme from '../../../src/shared/hooks/useTheme';
import { useProfileDocuments, InnerPageSkeleton } from '../../../src/features/profile';
import { EmptyState } from '../../../src/shared/components';

export default function DocumentsScreen() {
  const { colors, spacing, typography, isDark, radius, shadows } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data: documents, isLoading } = useProfileDocuments();

  const handlePreview = (url?: string) => {
    if (url) {
      Linking.openURL(url).catch((err) => console.error("Couldn't open URL", err));
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: isDark ? colors.background : '#F8FAFC' }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor="transparent" translucent />
      <View style={[styles.header, { backgroundColor: colors.surface, paddingTop: insets.top + spacing.sm, paddingHorizontal: spacing.lg, paddingBottom: spacing.md, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} accessibilityLabel="Go back" accessible accessibilityRole="button">
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={{ fontSize: typography.sizes.h2, fontFamily: typography.fonts.bold, color: colors.text }}>Documents</Text>
        <View style={styles.backBtn} />
      </View>

      {isLoading ? (
        <ScrollView contentContainerStyle={{ paddingTop: spacing.lg, paddingBottom: insets.bottom + spacing.xxl }} showsVerticalScrollIndicator={false}>
          <InnerPageSkeleton />
        </ScrollView>
      ) : !documents || documents.length === 0 ? (
        <EmptyState
          icon="document-text-outline"
          title="No Documents Uploaded"
          description="You haven't uploaded any documents yet (such as Offer Letters, Certificates, or ID proofs)."
          style={{ flex: 1 }}
        />
      ) : (
        <ScrollView contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: insets.bottom + spacing.xxl }} showsVerticalScrollIndicator={false}>
          {documents.map((doc, idx) => {
            const url = doc.url || doc.fileUrl;
            return (
              <View
                key={doc.id || idx}
                style={[
                  styles.docCard,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                    borderRadius: radius.lg,
                  },
                  shadows.light,
                ]}
              >
                <View style={[styles.iconWrapper, { backgroundColor: `${colors.primary}12`, borderRadius: radius.md }]}>
                  <Ionicons name="document-text-outline" size={24} color={colors.primary} />
                </View>
                <View style={styles.docInfo}>
                  <Text style={{ fontSize: typography.sizes.body, fontFamily: typography.fonts.semibold, color: colors.text }} numberOfLines={1}>
                    {doc.name || 'Untitled Document'}
                  </Text>
                  <Text style={{ fontSize: typography.sizes.caption, fontFamily: typography.fonts.regular, color: colors.textMuted, marginTop: 2 }}>
                    {doc.type || 'General'} {doc.uploadedAt ? `• ${new Date(doc.uploadedAt).toLocaleDateString()}` : ''}
                  </Text>
                </View>
                {url && (
                  <View style={styles.actions}>
                    <Pressable
                      onPress={() => handlePreview(url)}
                      style={[styles.actionBtn, { backgroundColor: colors.neutralLight, borderRadius: radius.sm }]}
                      accessibilityLabel="Preview Document"
                    >
                      <Ionicons name="eye-outline" size={18} color={colors.text} />
                    </Pressable>
                  </View>
                )}
              </View>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1 },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  docCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderWidth: 1,
    marginBottom: 12,
  },
  iconWrapper: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  docInfo: {
    flex: 1,
    marginRight: 8,
  },
  actions: {
    flexDirection: 'row',
  },
  actionBtn: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
});
