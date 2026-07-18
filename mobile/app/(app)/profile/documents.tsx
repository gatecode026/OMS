/**
 * @file documents.tsx
 * @description Identity Information & Documents Screen. Supports Aadhaar/PAN field edits, validations, ImageKit document uploads, and previews.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  StatusBar,
  Pressable,
  TextInput,
  ActivityIndicator,
  Linking,
  Modal,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import useTheme from '../../../src/shared/hooks/useTheme';
import useAuthStore from '../../../src/shared/store/authStore';
import { toast } from '../../../src/shared/components';
import {
  useProfile,
  useUpdateProfile,
  InfoCard,
  InfoRow,
  InnerPageSkeleton,
} from '../../../src/features/profile';

const AADHAAR_REGEX = /^\d{12}$/;
const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;

const DOCUMENT_CATEGORIES = [
  'Aadhaar Card',
  'PAN Card',
  'Passport',
  'Driving License',
  'Voter ID',
] as const;

type DocCategory = typeof DOCUMENT_CATEGORIES[number];

export default function DocumentsScreen() {
  const { colors, spacing, typography, radius, shadows, isDark } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const { data: profile, isLoading, refetch } = useProfile();
  const authUser = useAuthStore((s) => s.user);
  const updateProfileMutation = useUpdateProfile();

  const p = profile || authUser;

  const [isEditing, setIsEditing] = useState(false);
  const [aadhaarNumber, setAadhaarNumber] = useState('');
  const [panNumber, setPanNumber] = useState('');
  const [localDocs, setLocalDocs] = useState<any[]>([]);

  const [uploadingCategory, setUploadingCategory] = useState<DocCategory | null>(null);

  useEffect(() => {
    if (p) {
      setAadhaarNumber(p.aadhaarNumber || '');
      setPanNumber(p.panNumber || '');
      setLocalDocs(p.documents || []);
    }
  }, [p, isEditing]);

  const handleCancel = () => {
    setIsEditing(false);
  };

  const handleSave = async () => {
    if (aadhaarNumber.trim() && !AADHAAR_REGEX.test(aadhaarNumber.trim())) {
      toast.error('Aadhaar Number must be a 12-digit number.');
      return;
    }
    if (panNumber.trim() && !PAN_REGEX.test(panNumber.toUpperCase().trim())) {
      toast.error('Please enter a valid 10-character PAN number (e.g. ABCDE1234F).');
      return;
    }

    try {
      await updateProfileMutation.mutateAsync({
        employeeId: p?.id ?? authUser?.id ?? '',
        data: {
          aadhaarNumber: aadhaarNumber.trim(),
          panNumber: panNumber.toUpperCase().trim(),
          documents: localDocs,
        },
      });
      toast.success('Identity details and documents saved successfully!');
      setIsEditing(false);
      refetch();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to save identity documents.');
    }
  };

  const handleUploadDocument = async (category: DocCategory) => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      toast.error('Gallery permission is required to upload documents.');
      return;
    }

    setUploadingCategory(category);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.7,
        base64: true,
      });

      if (!result.canceled && result.assets?.[0]?.base64) {
        const base64Data = `data:image/jpeg;base64,${result.assets[0].base64}`;
        
        // Remove existing document of the same category if exists
        const filteredDocs = localDocs.filter((d) => d.category !== category);

        const newDocObj = {
          category,
          fileName: `${category.replace(/\s+/g, '_')}_${Date.now()}.jpg`,
          uploadDate: new Date().toISOString(),
          fileType: 'image/jpeg',
          downloadUrl: base64Data,
        };

        const updatedDocs = [...filteredDocs, newDocObj];
        setLocalDocs(updatedDocs);
        toast.success(`${category} attached. Press Save to upload.`);
      }
    } catch (err) {
      console.error('Failed to select file:', err);
      toast.error('Failed to select document.');
    } finally {
      setUploadingCategory(null);
    }
  };

  const handleDeleteDocument = (category: DocCategory) => {
    const updated = localDocs.filter((d) => d.category !== category);
    setLocalDocs(updated);
    toast.info(`${category} removed from local list. Press Save to apply.`);
  };

  const handlePreview = (url?: string) => {
    if (url) {
      Linking.openURL(url).catch((err) => {
        console.error("Couldn't open URL", err);
        toast.error('Failed to open document preview.');
      });
    } else {
      toast.info('No document preview available.');
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: isDark ? colors.background : '#F8FAFC' }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor="transparent" translucent />

      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.surface, paddingTop: insets.top + spacing.sm, paddingHorizontal: spacing.lg, paddingBottom: spacing.md, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} accessibilityLabel="Go back" accessible accessibilityRole="button">
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={{ fontSize: typography.sizes.h2, fontFamily: typography.fonts.bold, color: colors.text }}>
          Identity Info
        </Text>
        {isEditing ? (
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <Pressable onPress={handleCancel} style={styles.textActionBtn}>
              <Text style={{ color: colors.textMuted, fontFamily: typography.fonts.bold }}>Cancel</Text>
            </Pressable>
            <Pressable onPress={handleSave} disabled={updateProfileMutation.isPending} style={[styles.textActionBtn, { backgroundColor: colors.primary, borderRadius: radius.md, paddingHorizontal: 12, paddingVertical: 6 }]}>
              {updateProfileMutation.isPending ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={{ color: '#FFFFFF', fontFamily: typography.fonts.bold }}>Save</Text>
              )}
            </Pressable>
          </View>
        ) : (
          <Pressable onPress={() => setIsEditing(true)} style={styles.editBtn} accessibilityLabel="Edit identity info">
            <Ionicons name="create-outline" size={22} color={colors.primary} />
          </Pressable>
        )}
      </View>

      {isLoading ? (
        <ScrollView contentContainerStyle={{ paddingTop: spacing.lg, paddingBottom: insets.bottom + spacing.xxl }} showsVerticalScrollIndicator={false}>
          <InnerPageSkeleton />
        </ScrollView>
      ) : (
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: insets.bottom + spacing.xxl }}
          showsVerticalScrollIndicator={false}
        >
          {/* Identity Fields Card */}
          {isEditing ? (
            <View style={[styles.formContainer, { backgroundColor: colors.card, borderRadius: radius.lg, borderColor: colors.border, borderWidth: 1, padding: spacing.lg, marginBottom: spacing.lg }, shadows.light]}>
              <Text style={[styles.formLabel, { color: colors.textMuted, fontFamily: typography.fonts.bold }]}>Aadhaar Number</Text>
              <TextInput
                value={aadhaarNumber}
                onChangeText={setAadhaarNumber}
                keyboardType="numeric"
                maxLength={12}
                placeholder="12-digit Aadhaar Number"
                placeholderTextColor={colors.textLight}
                style={[styles.input, { color: colors.text, borderColor: colors.border, borderRadius: radius.md, backgroundColor: isDark ? colors.background : '#F8FAFC' }]}
              />

              <Text style={[styles.formLabel, { color: colors.textMuted, fontFamily: typography.fonts.bold }]}>PAN Number</Text>
              <TextInput
                value={panNumber}
                onChangeText={setPanNumber}
                autoCapitalize="characters"
                maxLength={10}
                placeholder="10-character PAN Card Number"
                placeholderTextColor={colors.textLight}
                style={[styles.input, { color: colors.text, borderColor: colors.border, borderRadius: radius.md, backgroundColor: isDark ? colors.background : '#F8FAFC' }]}
              />
            </View>
          ) : (
            <InfoCard title="National Identifiers" icon="shield-checkmark-outline" iconColor={colors.success}>
              <InfoRow label="Aadhaar Number" value={p?.aadhaarNumber} />
              <InfoRow label="PAN Number" value={p?.panNumber} />
            </InfoCard>
          )}

          {/* Document Upload / Details Card */}
          <Text style={{ fontSize: 13, fontFamily: typography.fonts.bold, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: spacing.sm, marginLeft: spacing.xs }}>
            Verification Documents
          </Text>

          {DOCUMENT_CATEGORIES.map((category) => {
            const doc = localDocs.find((d) => d.category === category);
            const downloadUrl = doc?.downloadUrl;
            const isLocalBase64 = downloadUrl?.startsWith('data:');

            return (
              <View
                key={category}
                style={[
                  styles.docRowCard,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                    borderRadius: radius.lg,
                  },
                  shadows.light,
                ]}
              >
                <View style={[styles.docIconWrapper, { backgroundColor: `${colors.primary}12`, borderRadius: radius.md }]}>
                  <Ionicons name="document-text-outline" size={24} color={colors.primary} />
                </View>

                <View style={styles.docMeta}>
                  <Text style={{ fontSize: 15, fontFamily: typography.fonts.semibold, color: colors.text }}>
                    {category}
                  </Text>
                  {doc ? (
                    <Text style={{ fontSize: 11, fontFamily: typography.fonts.medium, color: colors.success, marginTop: 2 }}>
                      {isLocalBase64 ? 'Document attached (unsaved)' : 'Verified Document Uploaded'}
                    </Text>
                  ) : (
                    <Text style={{ fontSize: 11, fontFamily: typography.fonts.medium, color: colors.textLight, marginTop: 2 }}>
                      No document uploaded
                    </Text>
                  )}
                </View>

                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {doc && !isLocalBase64 && (
                    <Pressable
                      onPress={() => handlePreview(downloadUrl)}
                      style={[styles.docActionBtn, { backgroundColor: colors.border, borderRadius: radius.md }]}
                    >
                      <Ionicons name="eye-outline" size={18} color={colors.text} />
                    </Pressable>
                  )}

                  {isEditing && (
                    <>
                      <Pressable
                        onPress={() => handleUploadDocument(category)}
                        style={[styles.docActionBtn, { backgroundColor: `${colors.primary}12`, borderRadius: radius.md }]}
                      >
                        {uploadingCategory === category ? (
                          <ActivityIndicator size="small" color={colors.primary} />
                        ) : (
                          <Ionicons name="cloud-upload-outline" size={18} color={colors.primary} />
                        )}
                      </Pressable>

                      {doc && (
                        <Pressable
                          onPress={() => handleDeleteDocument(category)}
                          style={[styles.docActionBtn, { backgroundColor: `${colors.danger}12`, borderRadius: radius.md }]}
                        >
                          <Ionicons name="trash-outline" size={18} color={colors.danger} />
                        </Pressable>
                      )}
                    </>
                  )}
                </View>
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
  editBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  textActionBtn: { justifyContent: 'center', alignItems: 'center' },
  formContainer: {
    gap: 12,
  },
  formLabel: {
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: -4,
  },
  input: {
    height: 48,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 15,
  },
  docRowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderWidth: 1,
    marginBottom: 12,
  },
  docIconWrapper: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  docMeta: {
    flex: 1,
  },
  docActionBtn: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
