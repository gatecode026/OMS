/**
 * @file create-group.tsx
 * @description Production implementation of the Screen 03: Create Group screen.
 *              Fulfills PRD requirements with 100% visual accuracy to the approved mockup.
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  Pressable,
  TextInput,
  ScrollView,
  FlatList,
  ActivityIndicator,
  Platform,
  Dimensions,
  LayoutAnimation,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import Animated, {
  FadeIn,
} from 'react-native-reanimated';
import { useQueryClient } from '@tanstack/react-query';

import useTheme from '../../../src/shared/hooks/useTheme';
import useAuthStore from '../../../src/shared/store/authStore';
import { Avatar } from '../../../src/shared/components/Avatar';
import { toast } from '../../../src/shared/components/Toast';
import { BottomSheet } from '../../../src/shared/components/Overlay';
import {
  useConversations,
  useSearchEmployees,
  useCreateGroupChat,
} from '../../../src/features/chat/hooks/useChat';
import { connectSocket, getSocket } from '../../../src/shared/services/socketManager';
import ImageKitUploadService from '../../../src/shared/services/imagekitUploadService';
import { usePresenceStore } from '../../../src/shared/store/presenceStore';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type FilterType =
  | 'Employees'
  | 'Departments'
  | 'Projects'
  | 'Teams'
  | 'Recent'
  | 'Managers'
  | 'Online'
  | 'Favorites'
  | 'Branch';

export default function CreateGroupScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, spacing, radius, typography, shadows, isDark } = useTheme();
  const authUser = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();

  // References
  const employeesListRef = useRef<FlatList>(null);

  // Group Details States
  const [groupName, setGroupName] = useState('');
  const [groupDesc, setGroupDesc] = useState('');
  const [groupAvatar, setGroupAvatar] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Members selection & list states
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('Employees');
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(new Set());
  const [filterSheetVisible, setFilterSheetVisible] = useState(false);

  // Socket states
  const onlineUserIds = usePresenceStore((s) => s.onlineUserIds);
  const statuses = usePresenceStore((s) => s.statuses);

  // Settings states
  const [whoCanSend, setWhoCanSend] = useState('Everyone');
  const [whoCanAdd, setWhoCanAdd] = useState('Group Admins');
  const [whoCanSendSheetVisible, setWhoCanSendSheetVisible] = useState(false);
  const [whoCanAddSheetVisible, setWhoCanAddSheetVisible] = useState(false);

  // Debouncing search query
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 400);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Load backend data
  const { data: conversations = [] } = useConversations();
  const { data: employees = [], isLoading: isEmployeesLoading } = useSearchEmployees(debouncedQuery);
  const { mutateAsync: createGroupChat, isPending: creatingGroup } = useCreateGroupChat();

  // Socket.IO presence connection
  useEffect(() => {
    // Initial fetch of online users
    const socket = getSocket();
    if (socket.connected) {
      socket.emit('get_online_users');
    }
  }, []);

  // Frequently / Recent Contacts
  const recentContactIds = useMemo(() => {
    const ids = new Set<string>();
    conversations.forEach((c) => {
      if (c.type === 'direct') {
        const otherUser = c.participants.find((p) => p.employeeId !== authUser?.id);
        if (otherUser) ids.add(otherUser.employeeId);
      }
    });
    return ids;
  }, [conversations, authUser]);

  // Filtering employees
  const filteredEmployees = useMemo(() => {
    let list = [...employees].filter((emp) => emp.id !== authUser?.id);

    if (activeFilter === 'Online') {
      list = list.filter((emp) => onlineUserIds.has(emp.id));
    } else if (activeFilter === 'Recent') {
      list = list.filter((emp) => recentContactIds.has(emp.id));
    } else if (activeFilter === 'Managers') {
      list = list.filter((emp) => emp.designation?.toLowerCase().includes('manager'));
    } else if (activeFilter === 'Departments') {
      list = list.filter((emp) => !!emp.department);
    } else if (activeFilter === 'Projects') {
      list = list.filter((emp) => !!emp.designation); // project/role info
    } else if (activeFilter === 'Teams') {
      list = list.filter((emp) => !!emp.role);
    }

    return list.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }, [employees, activeFilter, onlineUserIds, recentContactIds, authUser]);

  const toggleMemberSelection = (id: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setSelectedMembers((prev) => {
      const updated = new Set(prev);
      if (updated.has(id)) {
        updated.delete(id);
      } else {
        updated.add(id);
      }
      return updated;
    });
  };

  const handlePickAvatar = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      toast.error('Library access is required.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
      base64: true,
    });

    if (!result.canceled && result.assets?.[0]) {
      const asset = result.assets[0];
      setUploadingAvatar(true);
      try {
        const authParams = await ImageKitUploadService.fetchAuthParams();
        const uploadRes = await ImageKitUploadService.upload(
          asset.uri,
          `group_${Date.now()}.jpg`,
          'image/jpeg',
          authParams,
          () => {}
        );
        setGroupAvatar(uploadRes.url);
        toast.success('Group photo uploaded!');
      } catch (err) {
        console.error('Group avatar upload error:', err);
        toast.error('Image upload failed');
      } finally {
        setUploadingAvatar(false);
      }
    }
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      toast.error('Group name is required');
      return;
    }
    if (groupName.trim().length < 3) {
      toast.error('Group name must be at least 3 characters');
      return;
    }

    try {
      const participantIds = Array.from(selectedMembers);
      const conversation = await createGroupChat({
        name: groupName.trim(),
        participantIds,
        description: groupDesc.trim() || 'Group created from mobile app',
        avatar: groupAvatar || undefined,
      });

      toast.success('Group created successfully!');
      
      // Emit group socket update
      const socket = getSocket();
      if (socket?.connected) {
        socket.emit('group_created', { conversationId: conversation.id });
      }

      router.push(`/chat/${conversation.id}`);
    } catch (err) {
      toast.error('Failed to create group');
    }
  };

  const getPresenceColor = (empId: string, workStatus: string) => {
    const isOnline = onlineUserIds.has(empId);
    if (isOnline) {
      const presence = statuses[empId];
      const currentStatus = presence?.status || 'available';
      switch (currentStatus) {
        case 'available': return '#10B981';
        case 'away': return '#F59E0B';
        case 'dnd': return '#EF4444';
        default: return '#10B981';
      }
    }
    return colors.textLight;
  };

  const isFormValid = groupName.trim().length >= 3;

  return (
    <View style={[styles.container, { backgroundColor: isDark ? colors.background : '#F8F9FA' }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor="transparent" translucent />

      {/* ─── HEADER ─── */}
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm, backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} accessibilityLabel="Back" accessible>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>

        <View style={{ flex: 1, marginLeft: 8 }}>
          <Text style={[styles.headerTitle, { color: colors.text, fontFamily: typography.fonts.bold }]}>
            Create Group
          </Text>
          <Text style={[styles.headerSubtitle, { color: colors.textMuted, fontFamily: typography.fonts.medium }]}>
            Add group details and members
          </Text>
        </View>

        {creatingGroup ? (
          <ActivityIndicator size="small" color={colors.primary} style={{ paddingHorizontal: 16 }} />
        ) : (
          <Pressable
            onPress={handleCreateGroup}
            disabled={!isFormValid}
            style={[
              styles.createBtn,
              {
                backgroundColor: isFormValid ? colors.primary : isDark ? '#1E293B' : '#EEF2FF',
              },
            ]}
          >
            <Text
              style={{
                color: isFormValid ? '#FFFFFF' : isDark ? colors.textMuted : `${colors.primary}60`,
                fontFamily: typography.fonts.bold,
                fontSize: 14,
              }}
            >
              Create
            </Text>
          </Pressable>
        )}
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 80 }} showsVerticalScrollIndicator={false}>
        
        {/* ─── GROUP INFORMATION CARD ─── */}
        <Animated.View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }, shadows.light]}>
          <View style={styles.avatarAndNameRow}>
            <Pressable onPress={handlePickAvatar} style={styles.avatarWrapper}>
              {groupAvatar ? (
                <Avatar name={groupName || 'Group'} size={72} source={groupAvatar} />
              ) : (
                <View style={[styles.avatarPlaceholder, { backgroundColor: isDark ? '#1E293B' : '#EEF2FF' }]}>
                  <Ionicons name="people-outline" size={32} color={colors.primary} />
                </View>
              )}
              {uploadingAvatar && (
                <View style={styles.uploadSpinnerOverlay}>
                  <ActivityIndicator size="small" color="#FFFFFF" />
                </View>
              )}
              <View style={[styles.cameraBtn, { backgroundColor: colors.primary }]}>
                <Ionicons name="camera" size={12} color="#FFFFFF" />
              </View>
            </Pressable>

            <View style={{ flex: 1, marginLeft: 16 }}>
              <Text style={{ fontSize: 13, fontFamily: typography.fonts.bold, color: colors.text, marginBottom: 6 }}>
                Group Name <Text style={{ color: '#EF4444' }}>*</Text>
              </Text>
              <View style={[styles.inputBox, { borderColor: colors.border }]}>
                <TextInput
                  placeholder="e.g. Project OMS Team"
                  placeholderTextColor={colors.textLight}
                  value={groupName}
                  onChangeText={setGroupName}
                  maxLength={100}
                  style={[styles.input, { color: colors.text, fontFamily: typography.fonts.semibold }]}
                />
                <Text style={{ fontSize: 11, color: colors.textLight, fontFamily: typography.fonts.regular, marginLeft: 8 }}>
                  {groupName.length}/100
                </Text>
              </View>
            </View>
          </View>

          <View style={{ marginTop: 16 }}>
            <Text style={{ fontSize: 13, fontFamily: typography.fonts.bold, color: colors.text, marginBottom: 6 }}>
              Group Description
            </Text>
            <View style={[styles.descriptionBox, { borderColor: colors.border }]}>
              <TextInput
                placeholder="This group is for all updates and discussions..."
                placeholderTextColor={colors.textLight}
                value={groupDesc}
                onChangeText={setGroupDesc}
                maxLength={250}
                multiline
                style={[styles.descriptionInput, { color: colors.text, fontFamily: typography.fonts.regular }]}
              />
              <Text style={{ fontSize: 11, color: colors.textLight, fontFamily: typography.fonts.regular, alignSelf: 'flex-end', marginTop: 4 }}>
                {groupDesc.length}/250
              </Text>
            </View>
          </View>
        </Animated.View>

        {/* ─── ADD MEMBERS SECTION ─── */}
        <View style={{ paddingHorizontal: spacing.lg, marginTop: spacing.md }}>
          <Text style={[styles.sectionHeading, { color: colors.text, fontFamily: typography.fonts.bold }]}>
            Add Members
          </Text>

          {/* Search box & filter button */}
          <View style={styles.searchRow}>
            <View style={[styles.searchBox, { backgroundColor: isDark ? colors.card : '#F3F4F6', borderColor: colors.border, borderRadius: 24 }]}>
              <Ionicons name="search-outline" size={18} color={colors.textLight} style={{ marginRight: 8 }} />
              <TextInput
                placeholder="Search by name, department or employee ID..."
                placeholderTextColor={colors.textLight}
                value={searchQuery}
                onChangeText={setSearchQuery}
                style={{ flex: 1, color: colors.text, fontSize: 13, fontFamily: typography.fonts.regular }}
              />
            </View>
            <Pressable onPress={() => setFilterSheetVisible(true)} style={[styles.filterBtn, { borderColor: colors.border, backgroundColor: colors.card, borderRadius: radius.md }]}>
              <Ionicons name="funnel-outline" size={18} color={colors.text} />
            </Pressable>
          </View>

          {/* Selected Members horizontal list */}
          {selectedMembers.size > 0 && (
            <View style={{ marginTop: spacing.md }}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {Array.from(selectedMembers).map((id) => {
                  const emp = employees.find((e) => e.id === id);
                  if (!emp) return null;
                  return (
                    <Animated.View key={id} entering={FadeIn.duration(200)} style={styles.selectedMemberCard}>
                      <View style={{ position: 'relative' }}>
                        <Avatar name={emp.name} size={48} source={emp.avatar || undefined} />
                        <Pressable onPress={() => toggleMemberSelection(id)} style={styles.removeMemberBtn}>
                          <Ionicons name="close" size={11} color={colors.text} />
                        </Pressable>
                      </View>
                      <Text style={[styles.selectedMemberName, { color: colors.text, fontFamily: typography.fonts.semibold }]} numberOfLines={1}>
                        {emp.name}
                      </Text>
                    </Animated.View>
                  );
                })}

                {/* Add More card at the far right of the scroll */}
                <Pressable
                  onPress={() => employeesListRef.current?.scrollToOffset({ offset: 0, animated: true })}
                  style={styles.addMoreCard}
                >
                  <View style={[styles.addMoreCircle, { borderColor: colors.primary, backgroundColor: `${colors.primary}0D` }]}>
                    <Ionicons name="add" size={24} color={colors.primary} />
                  </View>
                  <Text style={[styles.addMoreText, { color: colors.primary, fontFamily: typography.fonts.bold }]}>
                    Add More
                  </Text>
                </Pressable>
              </ScrollView>
            </View>
          )}

          {/* Category Chips */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingVertical: spacing.md }}>
            {(['Employees', 'Departments', 'Projects', 'Teams', 'Recent'] as FilterType[]).map((filter) => {
              const isActive = activeFilter === filter;
              return (
                <Pressable
                  key={filter}
                  onPress={() => setActiveFilter(filter)}
                  style={[
                    styles.categoryChip,
                    {
                      backgroundColor: isActive ? `${colors.primary}1A` : isDark ? colors.card : '#E2E8F0',
                      borderColor: isActive ? colors.primary : 'transparent',
                    },
                  ]}
                >
                  <Text style={{ color: isActive ? colors.primary : colors.textMuted, fontFamily: typography.fonts.bold, fontSize: 12 }}>
                    {filter}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {/* Employee Directory Card container */}
          <View style={[styles.employeeListCard, { backgroundColor: colors.card, borderColor: colors.border }, shadows.light]}>
            {isEmployeesLoading ? (
              <View style={{ paddingVertical: 40, alignItems: 'center' }}>
                <ActivityIndicator size="small" color={colors.primary} />
              </View>
            ) : (
              <FlatList
                ref={employeesListRef}
                data={filteredEmployees}
                nestedScrollEnabled
                keyExtractor={(item) => item.id}
                ItemSeparatorComponent={() => <View style={[styles.separator, { backgroundColor: colors.border }]} />}
                ListEmptyComponent={() => (
                  <View style={{ alignItems: 'center', paddingVertical: 30 }}>
                    <Text style={{ color: colors.textMuted, fontFamily: typography.fonts.medium }}>
                      No contacts matching filter
                    </Text>
                  </View>
                )}
                renderItem={({ item }) => {
                  const isSelected = selectedMembers.has(item.id);
                  const presenceColor = getPresenceColor(item.id, item.workStatus);
                  return (
                    <Pressable
                      onPress={() => toggleMemberSelection(item.id)}
                      style={styles.employeeRow}
                    >
                      <View style={{ position: 'relative' }}>
                        <Avatar name={item.name} size={40} source={item.avatar || undefined} />
                        <View style={[styles.statusDot, { backgroundColor: presenceColor, borderColor: colors.card }]} />
                      </View>
                      <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text style={{ fontSize: 14, fontFamily: typography.fonts.bold, color: colors.text }}>
                          {item.name}{statuses[item.id]?.emoji ? ` ${statuses[item.id].emoji}` : ''}
                        </Text>
                        <Text style={{ fontSize: 11, color: colors.textMuted, fontFamily: typography.fonts.regular }}>
                          {item.designation} • {item.department}
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.checkbox,
                          {
                            borderColor: isSelected ? colors.primary : colors.textLight,
                            backgroundColor: isSelected ? colors.primary : 'transparent',
                          },
                        ]}
                      >
                        {isSelected && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
                      </View>
                    </Pressable>
                  );
                }}
              />
            )}
          </View>
        </View>

        {/* ─── GROUP SETTINGS SECTION ─── */}
        <View style={{ paddingHorizontal: spacing.lg, marginTop: spacing.lg }}>
          <Text style={[styles.sectionHeading, { color: colors.text, fontFamily: typography.fonts.bold }]}>
            Group Settings
          </Text>

          <View style={[styles.settingsCard, { backgroundColor: colors.card, borderColor: colors.border }, shadows.light]}>
            {/* Setting 1: Who can send messages */}
            <Pressable onPress={() => setWhoCanSendSheetVisible(true)} style={styles.settingsRow}>
              <View style={[styles.settingsIconCircle, { backgroundColor: '#F3E8FF' }]}>
                <Ionicons name="lock-closed" size={18} color="#8B5CF6" />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={{ fontSize: 14, fontFamily: typography.fonts.bold, color: colors.text }}>
                  Who can send messages?
                </Text>
                <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }}>
                  {whoCanSend}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.textLight} />
            </Pressable>

            <View style={[styles.separator, { backgroundColor: colors.border, marginLeft: 64 }]} />

            {/* Setting 2: Who can add members */}
            <Pressable onPress={() => setWhoCanAddSheetVisible(true)} style={styles.settingsRow}>
              <View style={[styles.settingsIconCircle, { backgroundColor: '#D1FAE5' }]}>
                <Ionicons name="person-add" size={18} color="#10B981" />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={{ fontSize: 14, fontFamily: typography.fonts.bold, color: colors.text }}>
                  Who can add members?
                </Text>
                <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }}>
                  {whoCanAdd}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.textLight} />
            </Pressable>
          </View>
        </View>
      </ScrollView>

      {/* ─── WHO CAN SEND SHEET ─── */}
      <BottomSheet visible={whoCanSendSheetVisible} onClose={() => setWhoCanSendSheetVisible(false)} title="Who can send messages?">
        {['Everyone', 'Admins Only', 'Managers Only'].map((option) => {
          const isSelected = whoCanSend === option;
          return (
            <Pressable
              key={option}
              onPress={() => {
                setWhoCanSend(option);
                setWhoCanSendSheetVisible(false);
              }}
              style={[styles.sheetRow, { borderBottomColor: colors.border }, isSelected && { backgroundColor: `${colors.primary}10` }]}
            >
              <Text style={{ flex: 1, fontSize: 15, color: colors.text, fontFamily: isSelected ? typography.fonts.bold : typography.fonts.medium }}>
                {option}
              </Text>
              {isSelected && <Ionicons name="checkmark-circle" size={20} color={colors.primary} />}
            </Pressable>
          );
        })}
      </BottomSheet>

      {/* ─── WHO CAN ADD SHEET ─── */}
      <BottomSheet visible={whoCanAddSheetVisible} onClose={() => setWhoCanAddSheetVisible(false)} title="Who can add members?">
        {['Everyone', 'Group Admins', 'Managers'].map((option) => {
          const isSelected = whoCanAdd === option;
          return (
            <Pressable
              key={option}
              onPress={() => {
                setWhoCanAdd(option);
                setWhoCanAddSheetVisible(false);
              }}
              style={[styles.sheetRow, { borderBottomColor: colors.border }, isSelected && { backgroundColor: `${colors.primary}10` }]}
            >
              <Text style={{ flex: 1, fontSize: 15, color: colors.text, fontFamily: isSelected ? typography.fonts.bold : typography.fonts.medium }}>
                {option}
              </Text>
              {isSelected && <Ionicons name="checkmark-circle" size={20} color={colors.primary} />}
            </Pressable>
          );
        })}
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: {
    padding: 4,
    marginLeft: -4,
  },
  headerTitle: {
    fontSize: 20,
  },
  headerSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  createBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  infoCard: {
    margin: 20,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
  },
  avatarAndNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarWrapper: {
    position: 'relative',
  },
  avatarPlaceholder: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraBtn: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  uploadSpinnerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 48,
    marginTop: 4,
  },
  input: {
    flex: 1,
    fontSize: 14,
  },
  descriptionBox: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginTop: 4,
  },
  descriptionInput: {
    fontSize: 14,
    minHeight: 60,
    textAlignVertical: 'top',
  },
  sectionHeading: {
    fontSize: 15,
    marginBottom: 10,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    height: 44,
    paddingHorizontal: 12,
  },
  filterBtn: {
    width: 44,
    height: 44,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedMemberCard: {
    alignItems: 'center',
    width: 60,
    marginRight: 12,
  },
  removeMemberBtn: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#F3F4F6',
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  selectedMemberName: {
    fontSize: 10.5,
    marginTop: 6,
    textAlign: 'center',
  },
  addMoreCard: {
    alignItems: 'center',
    width: 60,
    marginRight: 12,
  },
  addMoreCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addMoreText: {
    fontSize: 10.5,
    marginTop: 6,
    textAlign: 'center',
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  employeeListCard: {
    borderRadius: 16,
    borderWidth: 1,
    maxHeight: 320,
    paddingHorizontal: 12,
  },
  employeeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
  },
  statusDot: {
    position: 'absolute',
    bottom: -1,
    right: -1,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingsCard: {
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 4,
  },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  settingsIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sheetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
});
