/**
 * @file SidebarDrawer.tsx
 * @description Custom Premium Enterprise Sidebar/Navigation Drawer overlay.
 *              Matches the design 100% with smooth Animated translations,
 *              dynamic company logo/name, clickable employee card,
 *              permission-filtered menus, unread notifications badge,
 *              and logout confirmation bottom sheet.
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
  Dimensions,
  ScrollView,
  BackHandler,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Path, Defs, LinearGradient, Stop } from 'react-native-svg';
import { useQueryClient } from '@tanstack/react-query';

import useTheme from '../hooks/useTheme';
import useAuthStore from '../store/authStore';
import useBranding from '../hooks/useBranding';
import useDrawerStore from '../store/drawerStore';
import useUserPermissions from '../hooks/useUserPermissions';
import { Avatar } from './Avatar';
import { useProfile } from '../../features/profile';
import { useNotificationsUnreadCount } from '../../features/notifications';
import { toast } from './Toast';
import ENV from '../../config/env';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const PANEL_WIDTH = SCREEN_WIDTH * 0.82;

interface MenuItem {
  name: string;
  icon: keyof typeof Ionicons.glyphMap;
  path: string;
  moduleKey?: string;
  badgeCountKey?: 'notifications' | 'chat';
}

export const SidebarDrawer: React.FC = () => {
  const { colors, spacing, radius, typography, shadows, isDark } = useTheme();
  const { companyName, logoUrl } = useBranding();
  const { isOpen, selectedMenu, closeDrawer, setSelectedMenu } = useDrawerStore();
  const { user, logout: performAuthLogout } = useAuthStore();
  const { hasPermission } = useUserPermissions();
  const { data: profile } = useProfile();
  const { data: unreadNotificationsCount = 0 } = useNotificationsUnreadCount();
  const queryClient = useQueryClient();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [logoutSheetVisible, setLogoutSheetVisible] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  // Animation values
  const slideAnim = useRef(new Animated.Value(-PANEL_WIDTH)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Handle hardware back button when drawer is open
  useEffect(() => {
    const handleBackButton = () => {
      if (isOpen) {
        closeDrawer();
        return true;
      }
      return false;
    };

    const subscription = BackHandler.addEventListener('hardwareBackPress', handleBackButton);
    return () => {
      subscription.remove();
    };
  }, [isOpen, closeDrawer]);

  // Synchronize animations with open/close state
  useEffect(() => {
    if (isOpen) {
      // Open animation: <200ms
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 190,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 190,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Close animation: <180ms
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: -PANEL_WIDTH,
          duration: 160,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 160,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isOpen, slideAnim, fadeAnim]);

  // Merge profile details dynamically
  const displayName = profile?.name || user?.name || 'Employee';
  const displayDesignation = profile?.designation || user?.role || 'Staff Member';
  const displayEmail = profile?.email || user?.email || '';
  const displayAvatar = profile?.avatar || profile?.avatarUrl || profile?.profilePhoto || user?.avatar || user?.avatarUrl;

  // Sidebar Menu Items
  const menuItems: MenuItem[] = [
    { name: 'Dashboard', icon: 'grid', path: '/(app)/(tabs)', moduleKey: 'dashboard' },
    { name: 'My Profile', icon: 'person', path: '/(app)/(tabs)/profile', moduleKey: 'profile_settings' },
    { name: 'Attendance Pass', icon: 'qr-code', path: '/(app)/attendance-qr', moduleKey: 'attendance_management' },
    { name: 'Employees', icon: 'people', path: '/(app)/employees', moduleKey: 'employee_management' },
    { name: 'Attendance', icon: 'calendar', path: '/(app)/(tabs)/attendance', moduleKey: 'attendance_management' },
    { name: 'Leave Management', icon: 'today', path: '/(app)/(tabs)/leave', moduleKey: 'leave_management' },
    { name: 'Payroll', icon: 'wallet', path: '/(app)/payroll', moduleKey: 'payroll_management' },
    { name: 'Documents', icon: 'folder-open', path: '/(app)/profile/documents', moduleKey: 'document_management' },
    { name: 'Chat', icon: 'chatbubbles', path: '/(app)/(tabs)/inbox', moduleKey: 'notifications' },
    { name: 'Tasks', icon: 'checkbox', path: '/(app)/(tabs)/work', moduleKey: 'task_monitoring' },
    { name: 'Reports & Analytics', icon: 'bar-chart', path: '/(app)/reports', moduleKey: 'security_audit_logs' },
    { name: 'Announcements', icon: 'megaphone', path: '/(app)/announcements', moduleKey: 'announcements' },
    { name: 'Notifications', icon: 'notifications', path: '/(app)/notifications', moduleKey: 'notifications', badgeCountKey: 'notifications' },
    { name: 'Settings', icon: 'settings', path: '/(app)/profile/security', moduleKey: 'system_settings' },
    { name: 'Help & Support', icon: 'help-circle', path: '/(app)/profile/help', moduleKey: 'profile_settings' },
  ];

  // Filter menu items dynamically
  const filteredMenuItems = menuItems.filter((item) => {
    if (!item.moduleKey) return true;
    return hasPermission(item.moduleKey, 'read');
  });

  const handleMenuItemPress = (item: MenuItem) => {
    setSelectedMenu(item.name);
    closeDrawer();

    // Check if the path exists in the Expo Router routes.
    // If it is reports, employees, or announcements, show a Premium Toast and do not crash
    const unimplementedRoutes = ['/(app)/employees', '/(app)/reports', '/(app)/announcements'];
    if (unimplementedRoutes.includes(item.path)) {
      toast.info(`${item.name} module is available on Web Portal. Mobile support coming soon!`);
      return;
    }

    setTimeout(() => {
      router.push(item.path as any);
    }, 180);
  };

  const handleProfilePress = () => {
    closeDrawer();
    setTimeout(() => {
      router.push('/(app)/(tabs)/profile' as any);
    }, 180);
  };

  const handleLogoutClick = () => {
    setLogoutSheetVisible(true);
  };

  const handleConfirmLogout = async () => {
    setLoggingOut(true);
    try {
      // 1. Invalidate and clear all queries in React Query cache
      queryClient.clear();

      // 2. Perform authentication logout (clears Zustand, SecureStorage, Socket, Push Tokens)
      await performAuthLogout();

      setLogoutSheetVisible(false);
      closeDrawer();
      toast.success('Logged out successfully');

      // 3. Navigate to Auth login screen
      router.replace('/(auth)/login');
    } catch (err) {
      toast.error('Logout failed. Please try again.');
    } finally {
      setLoggingOut(false);
    }
  };

  // Skip rendering if not open and animation completed
  const [shouldRender, setShouldRender] = useState(false);
  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
    } else {
      const timer = setTimeout(() => setShouldRender(false), 200);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!shouldRender) return null;

  return (
    <View style={styles.absoluteContainer} pointerEvents={isOpen ? 'auto' : 'none'}>
      {/* Backdrop */}
      <Animated.View
        style={[
          styles.backdrop,
          {
            opacity: fadeAnim,
            backgroundColor: isDark ? 'rgba(0, 0, 0, 0.75)' : 'rgba(15, 23, 42, 0.45)',
          },
        ]}
      >
        <Pressable style={styles.backdropPressable} onPress={closeDrawer} />
      </Animated.View>

      {/* Drawer Panel */}
      <Animated.View
        style={[
          styles.drawerPanel,
          {
            transform: [{ translateX: slideAnim }],
            backgroundColor: colors.surface,
            paddingTop: insets.top || spacing.lg,
            paddingBottom: insets.bottom || spacing.lg,
          },
          shadows.heavy,
        ]}
      >
        {/* Curved Header Background Design */}
        <Svg
          height="160"
          width={PANEL_WIDTH}
          style={{ position: 'absolute', top: 0, right: 0, pointerEvents: 'none' }}
        >
          <Defs>
            <LinearGradient id="waveGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor={colors.primary} stopOpacity="0.02" />
              <Stop offset="50%" stopColor={colors.primary} stopOpacity="0.08" />
              <Stop offset="100%" stopColor={colors.secondary} stopOpacity="0.18" />
            </LinearGradient>
          </Defs>
          <Path
            d={`M 0 0 C ${PANEL_WIDTH * 0.45} 80, ${PANEL_WIDTH * 0.72} -10, ${PANEL_WIDTH} 100 L ${PANEL_WIDTH} 0 Z`}
            fill="url(#waveGrad)"
          />
        </Svg>

        {/* 1. Header (Company details) */}
        <View style={[styles.headerContainer, { paddingHorizontal: spacing.lg }]}>
          <View style={[styles.logoContainer, { borderColor: colors.border, backgroundColor: colors.surface }, shadows.light]}>
            {logoUrl ? (
              <Avatar source={logoUrl} name={companyName} size={42} />
            ) : (
              <View style={[styles.logoPlaceholder, { backgroundColor: `${colors.primary}10` }]}>
                <Text style={[styles.logoLetter, { color: colors.primary, fontFamily: typography.fonts.bold }]}>
                  {companyName.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
          </View>
          <View style={styles.companyInfo}>
            <Text
              style={[styles.companyNameText, { color: colors.text, fontFamily: typography.fonts.bold }]}
              numberOfLines={1}
            >
              {companyName.toUpperCase()}
            </Text>
            <Text
              style={[styles.companyTaglineText, { color: colors.textMuted, fontFamily: typography.fonts.medium }]}
              numberOfLines={1}
            >
              Enterprise Management System
            </Text>
          </View>
        </View>

        <View style={[styles.divider, { backgroundColor: colors.border, marginHorizontal: spacing.lg }]} />

        {/* 2. Profile Card */}
        <Pressable
          onPress={handleProfilePress}
          style={({ pressed }) => [
            styles.profileCard,
            { marginHorizontal: spacing.lg, paddingHorizontal: spacing.sm, borderRadius: radius.md },
            pressed && { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)' },
          ]}
        >
          <Avatar
            source={displayAvatar}
            name={displayName}
            size={48}
            userId={user ? String(user.id || (user as any).employeeId || (user as any)._id || '') || undefined : undefined}
          />
          <View style={styles.profileTextWrapper}>
            <Text style={[styles.profileName, { color: colors.text, fontFamily: typography.fonts.bold }]} numberOfLines={1}>
              {displayName}
            </Text>
            <Text style={[styles.profileDesignation, { color: colors.textMuted, fontFamily: typography.fonts.medium }]} numberOfLines={1}>
              {displayDesignation}
            </Text>
            <Text style={[styles.profileEmail, { color: colors.primary, fontFamily: typography.fonts.semibold }]} numberOfLines={1}>
              {displayEmail}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
        </Pressable>

        {/* 3. Navigation List */}
        <ScrollView
          style={styles.menuScrollView}
          contentContainerStyle={{ paddingHorizontal: spacing.md, paddingVertical: spacing.sm }}
          showsVerticalScrollIndicator={false}
        >
          {filteredMenuItems.map((item) => {
            const isActive = selectedMenu === item.name;
            const badgeCount = item.badgeCountKey === 'notifications' ? unreadNotificationsCount : 0;

            return (
              <Pressable
                key={item.name}
                onPress={() => handleMenuItemPress(item)}
                style={({ pressed }) => [
                  styles.menuItemRow,
                  { borderRadius: radius.md, marginVertical: 2 },
                  isActive && { backgroundColor: `${colors.primary}12` },
                  pressed && !isActive && { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.02)' },
                ]}
              >
                <View style={styles.menuLeft}>
                  <Ionicons
                    name={isActive ? item.icon : (`${item.icon}-outline` as any)}
                    size={22}
                    color={isActive ? colors.primary : colors.textMuted}
                    style={styles.menuIcon}
                  />
                  <Text
                    style={[
                      styles.menuText,
                      {
                        color: isActive ? colors.primary : colors.text,
                        fontFamily: isActive ? typography.fonts.bold : typography.fonts.medium,
                      },
                    ]}
                  >
                    {item.name}
                  </Text>
                </View>
                <View style={styles.menuRight}>
                  {badgeCount > 0 && (
                    <View style={[styles.badgeContainer, { backgroundColor: colors.primary }]}>
                      <Text style={[styles.badgeText, { fontFamily: typography.fonts.bold }]}>
                        {badgeCount}
                      </Text>
                    </View>
                  )}
                  <Ionicons
                    name="chevron-forward"
                    size={14}
                    color={isActive ? colors.primary : colors.textLight}
                  />
                </View>
              </Pressable>
            );
          })}

          <View style={[styles.divider, { backgroundColor: colors.border, marginVertical: spacing.md }]} />

          {/* Logout Menu Action */}
          <Pressable
            onPress={handleLogoutClick}
            style={({ pressed }) => [
              styles.menuItemRow,
              { borderRadius: radius.md, marginVertical: 2 },
              pressed && { backgroundColor: isDark ? 'rgba(239, 68, 68, 0.1)' : 'rgba(239, 68, 68, 0.05)' },
            ]}
          >
            <View style={styles.menuLeft}>
              <Ionicons
                name="log-out-outline"
                size={22}
                color={colors.danger}
                style={styles.menuIcon}
              />
              <Text
                style={[
                  styles.menuText,
                  {
                    color: colors.danger,
                    fontFamily: typography.fonts.semibold,
                  },
                ]}
              >
                Logout
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={14} color={colors.danger} />
          </Pressable>
        </ScrollView>

        {/* 4. Footer */}
        <View style={[styles.footerContainer, { paddingHorizontal: spacing.lg }]}>
          {/* Curved Secure Card */}
          <View style={[styles.secureCard, { backgroundColor: colors.neutralLight, borderRadius: radius.md }]}>
            <View style={[styles.secureIconWrapper, { backgroundColor: `${colors.primary}18` }]}>
              <Ionicons name="shield-checkmark" size={18} color={colors.primary} />
            </View>
            <View style={styles.secureTextWrapper}>
              <Text style={[styles.secureTitle, { color: colors.text, fontFamily: typography.fonts.bold }]}>
                Secure. Smart. Reliable.
              </Text>
              <Text style={[styles.secureSubtitle, { color: colors.primary, fontFamily: typography.fonts.bold }]}>
                OMS Enterprise Solution
              </Text>
            </View>
          </View>

          {/* App Specifications */}
          <View style={styles.specificationsRow}>
            <Text style={[styles.specText, { color: colors.textLight, fontFamily: typography.fonts.semibold }]}>
              v1.2.0 (Build 12) | {ENV.ENV?.toUpperCase() || 'PROD'}
            </Text>
            <Text style={[styles.specText, { color: colors.textLight, fontFamily: typography.fonts.medium }]}>
              Powered by Gatecode
            </Text>
          </View>
        </View>
      </Animated.View>

      {/* Logout Confirmation Bottom Sheet */}
      <Modal
        visible={logoutSheetVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setLogoutSheetVisible(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setLogoutSheetVisible(false)}>
          <Pressable
            style={[styles.bottomSheetCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.sheetHandle} />

            <View style={[styles.alertIconCircle, { backgroundColor: isDark ? 'rgba(239, 68, 68, 0.12)' : '#FEF2F2' }]}>
              <Ionicons name="log-out-outline" size={30} color={colors.danger} />
            </View>

            <Text style={[styles.sheetTitle, { color: colors.text, fontFamily: typography.fonts.bold }]}>
              Log Out of OMS?
            </Text>
            <Text style={[styles.sheetSubtitle, { color: colors.textMuted, fontFamily: typography.fonts.medium }]}>
              Are you sure you want to end your session? You will need an active connection to sign back in.
            </Text>

            <View style={styles.sheetActionRow}>
              <Pressable
                onPress={() => setLogoutSheetVisible(false)}
                style={[styles.sheetCancelBtn, { borderColor: colors.border }]}
                disabled={loggingOut}
              >
                <Text style={[styles.sheetCancelText, { color: colors.textMuted, fontFamily: typography.fonts.semibold }]}>
                  Cancel
                </Text>
              </Pressable>
              <Pressable
                onPress={handleConfirmLogout}
                style={[styles.sheetConfirmBtn, { backgroundColor: colors.danger }]}
                disabled={loggingOut}
              >
                {loggingOut ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={[styles.sheetConfirmText, { fontFamily: typography.fonts.bold }]}>
                    Log Out
                  </Text>
                )}
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  absoluteContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999,
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  backdropPressable: {
    flex: 1,
  },
  drawerPanel: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: PANEL_WIDTH,
    borderTopRightRadius: 28,
    borderBottomRightRadius: 28,
    overflow: 'hidden',
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 16,
  },
  logoContainer: {
    width: 46,
    height: 46,
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoLetter: {
    fontSize: 20,
  },
  companyInfo: {
    marginLeft: 12,
    flex: 1,
  },
  companyNameText: {
    fontSize: 14,
    letterSpacing: 0.8,
  },
  companyTaglineText: {
    fontSize: 11,
    marginTop: 2,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    marginTop: 14,
    marginBottom: 8,
  },
  profileTextWrapper: {
    marginLeft: 12,
    flex: 1,
  },
  profileName: {
    fontSize: 15,
  },
  profileDesignation: {
    fontSize: 12,
    marginTop: 1,
  },
  profileEmail: {
    fontSize: 11,
    marginTop: 2,
  },
  menuScrollView: {
    flex: 1,
  },
  menuItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  menuLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuIcon: {
    marginRight: 12,
  },
  menuText: {
    fontSize: 14,
  },
  menuRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  badgeContainer: {
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 10,
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 9.5,
  },
  footerContainer: {
    marginTop: 'auto',
    paddingTop: 12,
  },
  secureCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  secureIconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  secureTextWrapper: {
    flex: 1,
  },
  secureTitle: {
    fontSize: 11.5,
  },
  secureSubtitle: {
    fontSize: 10,
    marginTop: 1,
  },
  specificationsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingHorizontal: 2,
  },
  specText: {
    fontSize: 9.5,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'flex-end',
  },
  bottomSheetCard: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderBottomWidth: 0,
    padding: 24,
    alignItems: 'center',
  },
  sheetHandle: {
    width: 38,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#CBD5E1',
    marginBottom: 20,
  },
  alertIconCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  sheetTitle: {
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 8,
  },
  sheetSubtitle: {
    fontSize: 13.5,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  sheetActionRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  sheetCancelBtn: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sheetCancelText: {
    fontSize: 14,
  },
  sheetConfirmBtn: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sheetConfirmText: {
    color: '#FFFFFF',
    fontSize: 14,
  },
});

export default SidebarDrawer;
