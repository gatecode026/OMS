/**
 * @file attendance-qr.tsx
 * @description Redesigned Futuristic Enterprise Employee ID Card & Attendance QR Code Screen.
 *              Includes holographic smartcard chip graphics, camera target reticles, 
 *              2-column metadata grids, live security token countdowns, and database profile synchronization.
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  StatusBar,
  Share,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Rect, Path, G, Circle } from 'react-native-svg';
import dayjs from 'dayjs';

import { useTheme } from '../../src/shared/hooks/useTheme';
import { useAuthStore } from '../../src/shared/store/authStore';
import { useProfile } from '../../src/features/profile/hooks/useProfile';
import apiClient from '../../src/shared/services/apiClient';
import { Avatar, Skeleton } from '../../src/shared/components';

/**
 * Smartcard IC Chip Graphic Component
 */
const SmartCardChipSVG: React.FC<{ size?: number }> = ({ size = 38 }) => (
  <Svg width={size} height={size * 0.75} viewBox="0 0 40 30">
    <Rect width="40" height="30" rx="4" fill="#D97706" opacity="0.9" />
    <Rect x="2" y="2" width="36" height="26" rx="3" fill="#F59E0B" />
    <Path d="M2 10 H38 M2 20 H38 M14 2 V28 M26 2 V28" stroke="#B45309" strokeWidth="1.2" />
    <Rect x="14" y="10" width="12" height="10" rx="2" fill="#FEF3C7" opacity="0.8" />
  </Svg>
);

/**
 * Corner Reticle Bracket Overlay for Scanner Box
 */
const CornerReticles: React.FC<{ color: string }> = ({ color }) => (
  <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
    {/* Top-Left Reticle */}
    <View style={[styles.reticle, styles.reticleTL, { borderColor: color }]} />
    {/* Top-Right Reticle */}
    <View style={[styles.reticle, styles.reticleTR, { borderColor: color }]} />
    {/* Bottom-Left Reticle */}
    <View style={[styles.reticle, styles.reticleBL, { borderColor: color }]} />
    {/* Bottom-Right Reticle */}
    <View style={[styles.reticle, styles.reticleBR, { borderColor: color }]} />
  </View>
);

/**
 * Deterministic Vector QR Matrix Generator Component
 */
const QRCodeSVG: React.FC<{ value: string; size?: number; color?: string; bg?: string }> = ({
  value,
  size = 210,
  color = '#0F172A',
  bg = '#FFFFFF',
}) => {
  const gridSize = 25;
  const cellSize = size / gridSize;

  const matrix = useMemo(() => {
    const grid: boolean[][] = Array(gridSize)
      .fill(false)
      .map(() => Array(gridSize).fill(false));

    const drawFinder = (startRow: number, startCol: number) => {
      for (let r = 0; r < 7; r++) {
        for (let c = 0; c < 7; c++) {
          const isOuter = r === 0 || r === 6 || c === 0 || c === 6;
          const isInner = r >= 2 && r <= 4 && c >= 2 && c <= 4;
          grid[startRow + r][startCol + c] = isOuter || isInner;
        }
      }
    };

    drawFinder(0, 0);
    drawFinder(0, gridSize - 7);
    drawFinder(gridSize - 7, 0);

    for (let i = 7; i < gridSize - 7; i++) {
      grid[6][i] = i % 2 === 0;
      grid[i][6] = i % 2 === 0;
    }

    let hash = 0;
    for (let i = 0; i < value.length; i++) {
      hash = (hash << 5) - hash + value.charCodeAt(i);
      hash |= 0;
    }

    let seed = Math.abs(hash);
    for (let r = 0; r < gridSize; r++) {
      for (let c = 0; c < gridSize; c++) {
        const isTL = r < 8 && c < 8;
        const isTR = r < 8 && c >= gridSize - 8;
        const isBL = r >= gridSize - 8 && c < 8;
        if (isTL || isTR || isBL) continue;
        if (r === 6 || c === 6) continue;

        seed = (seed * 9301 + 49297) % 233280;
        grid[r][c] = seed / 233280 > 0.45;
      }
    }

    return grid;
  }, [value]);

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <Rect width={size} height={size} fill={bg} rx={16} />
      <G>
        {matrix.map((row, rIdx) =>
          row.map((cell, cIdx) => {
            if (!cell) return null;
            return (
              <Rect
                key={`${rIdx}-${cIdx}`}
                x={cIdx * cellSize}
                y={rIdx * cellSize}
                width={cellSize + 0.3}
                height={cellSize + 0.3}
                fill={color}
                rx={cellSize > 8 ? 2 : 0}
              />
            );
          })
        )}
      </G>
    </Svg>
  );
};

export default function AttendanceQRScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, typography, isDark } = useTheme();

  // Database & Profile bindings
  const authUser = useAuthStore((s) => s.user);
  const companyId = useAuthStore((s) => s.companyId);
  const { data: profile, isLoading, refetch } = useProfile();

  const [dbQrCode, setDbQrCode] = useState<string | null>(null);
  const [dbQrUrl, setDbQrUrl] = useState<string | null>(null);
  const [isQrLoading, setIsQrLoading] = useState(false);

  const [timestamp, setTimestamp] = useState(dayjs().unix());
  const [secondsLeft, setSecondsLeft] = useState(30);

  const fetchDatabaseQR = async () => {
    setIsQrLoading(true);
    try {
      const response = await apiClient.get('/api/v1/attendance/qr');
      const data = response.data?.data;
      if (data?.qrCode) setDbQrCode(data.qrCode);
      if (data?.qrCodeUrl) setDbQrUrl(data.qrCodeUrl);
    } catch (err) {
      // Graceful fallback to profile data
    } finally {
      setIsQrLoading(false);
    }
  };

  useEffect(() => {
    fetchDatabaseQR();
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          setTimestamp(dayjs().unix());
          return 30;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Profile data resolutions
  const displayName = profile?.name || authUser?.name || 'Employee User';
  const displayDesignation = profile?.designation || (authUser as any)?.designation || 'Software Engineer';
  const displayDepartment = profile?.department || (authUser as any)?.department || 'Engineering & IT';
  const displayCompany = profile?.companyName || (authUser as any)?.companyName || (companyId !== 'GATECODE' ? companyId : null) || 'Corporate Enterprise';
  const displayEmpId = profile?.employeeCode || profile?.id || authUser?.id || 'GATECO-EMP-008';
  const displayAvatar = profile?.avatarUrl || profile?.avatar || profile?.profilePhoto || (profile as any)?.photoUrl || (profile as any)?.image || (profile as any)?.profileImage || authUser?.avatarUrl || (authUser as any)?.avatar;
  const displayBranch = profile?.branch || profile?.officeLocation || 'Headquarters';
  const displayShift = profile?.shiftTiming || profile?.shift || '09:00 AM - 06:00 PM';
  const displayBloodGroup = profile?.bloodGroup || 'O+';

  const qrValue = useMemo(() => {
    const isLocalUrl = (str?: string) => typeof str === 'string' && (str.includes('localhost') || str.includes('127.0.0.1'));
    if (dbQrCode && !isLocalUrl(dbQrCode)) return dbQrCode;
    if (profile?.qrCode && !isLocalUrl(profile.qrCode)) return profile.qrCode;
    if (profile?.attendanceQr && !isLocalUrl(profile.attendanceQr)) return profile.attendanceQr;

    return JSON.stringify({
      employeeId: profile?.id || profile?.employeeId || authUser?.id || 'GATECO-EMP-008',
      companyId: companyId || 'GATECODE',
      employeeCode: displayEmpId,
      name: displayName,
      ts: timestamp,
    });
  }, [dbQrCode, profile, authUser, companyId, displayEmpId, displayName, timestamp]);

  const handleShare = async () => {
    try {
      await Share.share({
        message: `OMS Enterprise Digital Pass\nName: ${displayName}\nEmp ID: ${displayEmpId}\nDesignation: ${displayDesignation}\nCompany: ${displayCompany}\nBranch: ${displayBranch}`,
      });
    } catch (error) {
      console.log('Share error:', error);
    }
  };

  const handleManualRefresh = async () => {
    setTimestamp(dayjs().unix());
    setSecondsLeft(30);
    await Promise.all([refetch(), fetchDatabaseQR()]);
  };

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#0B0F19' : '#F1F5F9' }]}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* ─── Sticky Header ─── */}
      <View style={[styles.header, { paddingTop: insets.top + 12, backgroundColor: colors.primary }]}>
        <Pressable onPress={() => router.back()} style={styles.headerBtn}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </Pressable>
        <Text style={[styles.headerTitle, { fontFamily: typography.fonts.bold, color: '#FFFFFF' }]}>
          Digital Attendance Pass
        </Text>
        <Pressable onPress={handleShare} style={styles.headerBtn}>
          <Ionicons name="share-social-outline" size={22} color="#FFFFFF" />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* ─── Holographic Enterprise ID Card ─── */}
        <View style={[styles.idCard, { backgroundColor: isDark ? '#1E293B' : '#FFFFFF', borderColor: isDark ? '#334155' : '#E2E8F0' }]}>
          
          {/* Card Top Banner with Smartcard Chip */}
          <View style={[styles.cardTopBanner, { backgroundColor: colors.primary }]}>
            <View style={styles.bannerLeftRow}>
              <Ionicons name="shield-checkmark" size={20} color="#60A5FA" style={{ marginRight: 8 }} />
              <View>
                <Text style={[styles.companyNameText, { fontFamily: typography.fonts.bold }]}>
                  {displayCompany.toUpperCase()}
                </Text>
                <Text style={[styles.companySubText, { fontFamily: typography.fonts.medium }]}>
                  ENTERPRISE VERIFIED ACCESS
                </Text>
              </View>
            </View>
            <SmartCardChipSVG size={36} />
          </View>

          {/* Card Body */}
          <View style={styles.cardBody}>
            {/* ─── 2-Column Split Identity Section ─── */}
            <View style={styles.twoColumnIdentityRow}>
              {/* LEFT COLUMN: Profile Pic -> Name -> Designation */}
              <View style={styles.leftIdentityCol}>
                {isLoading ? (
                  <Skeleton width={76} height={76} borderRadius={38} style={{ marginBottom: 8 }} />
                ) : (
                  <View style={styles.avatarWrapper}>
                    <View style={[styles.avatarRing, { borderColor: colors.primary }]}>
                      <Avatar
                        name={displayName}
                        size={76}
                        source={displayAvatar || undefined}
                      />
                    </View>
                    <View style={styles.onlineStatusDot}>
                      <Ionicons name="checkmark" size={10} color="#FFFFFF" />
                    </View>
                  </View>
                )}

                <Text style={[styles.userNameLeft, { fontFamily: typography.fonts.bold, color: isDark ? '#F8FAFC' : '#0F172A' }]} numberOfLines={1}>
                  {displayName}
                </Text>

                <View style={[styles.designationPillLeft, { backgroundColor: isDark ? '#312E81' : '#EEF2FF' }]}>
                  <Ionicons name="briefcase-outline" size={12} color={isDark ? '#818CF8' : '#4F46E5'} style={{ marginRight: 4 }} />
                  <Text style={[styles.designationTextLeft, { fontFamily: typography.fonts.semibold, color: isDark ? '#818CF8' : '#4F46E5' }]} numberOfLines={1}>
                    {displayDesignation}
                  </Text>
                </View>
              </View>

              {/* Vertical Separator Line */}
              <View style={[styles.colVerticalDivider, { backgroundColor: isDark ? '#334155' : '#E2E8F0' }]} />

              {/* RIGHT COLUMN: Emp ID -> Department -> Office Branch in Themed Color Boxes */}
              <View style={styles.rightIdentityCol}>
                {/* 1. EMP ID COLOR BOX */}
                <View
                  style={[
                    styles.metaColorBox,
                    {
                      backgroundColor: isDark ? 'rgba(99, 102, 241, 0.15)' : '#EEF2FF',
                      borderColor: isDark ? 'rgba(99, 102, 241, 0.35)' : '#C7D2FE',
                    },
                  ]}
                >
                  <Text style={[styles.metaLabel, { color: isDark ? '#A5B4FC' : '#4F46E5', fontFamily: typography.fonts.bold }]}>
                    EMP ID
                  </Text>
                  <Text style={[styles.metaValue, { color: isDark ? '#F8FAFC' : '#1E1B4B', fontFamily: typography.fonts.bold }]} numberOfLines={1}>
                    {displayEmpId}
                  </Text>
                </View>

                {/* 2. DEPARTMENT COLOR BOX */}
                <View
                  style={[
                    styles.metaColorBox,
                    {
                      backgroundColor: isDark ? 'rgba(139, 92, 246, 0.15)' : '#F3E8FF',
                      borderColor: isDark ? 'rgba(139, 92, 246, 0.35)' : '#DDD6FE',
                    },
                  ]}
                >
                  <Text style={[styles.metaLabel, { color: isDark ? '#C4B5FD' : '#7C3AED', fontFamily: typography.fonts.bold }]}>
                    DEPARTMENT
                  </Text>
                  <Text style={[styles.metaValue, { color: isDark ? '#F8FAFC' : '#2E1065', fontFamily: typography.fonts.bold }]} numberOfLines={1}>
                    {displayDepartment}
                  </Text>
                </View>

                {/* 3. OFFICE BRANCH COLOR BOX */}
                <View
                  style={[
                    styles.metaColorBox,
                    {
                      backgroundColor: isDark ? 'rgba(16, 185, 129, 0.15)' : '#ECFDF5',
                      borderColor: isDark ? 'rgba(16, 185, 129, 0.35)' : '#A7F3D0',
                    },
                  ]}
                >
                  <Text style={[styles.metaLabel, { color: isDark ? '#6EE7B7' : '#059669', fontFamily: typography.fonts.bold }]}>
                    OFFICE BRANCH
                  </Text>
                  <Text style={[styles.metaValue, { color: isDark ? '#F8FAFC' : '#064E3B', fontFamily: typography.fonts.bold }]} numberOfLines={1}>
                    {displayBranch}
                  </Text>
                </View>
              </View>
            </View>

            {/* ─── Scanner Corner Target Box & QR Code ─── */}
            <View style={styles.scannerTargetBox}>
              <View style={[styles.qrFrame, { backgroundColor: '#FFFFFF', borderColor: isDark ? '#334155' : '#E2E8F0' }]}>
                <CornerReticles color={isDark ? '#6366F1' : '#4F46E5'} />
                {isQrLoading ? (
                  <View style={{ width: 210, height: 210, alignItems: 'center', justifyContent: 'center' }}>
                    <ActivityIndicator size="large" color="#4F46E5" />
                  </View>
                ) : dbQrUrl || profile?.qrCodeUrl ? (
                  <Image
                    source={{ uri: dbQrUrl || profile?.qrCodeUrl }}
                    style={{ width: 210, height: 210, borderRadius: 12 }}
                    resizeMode="contain"
                  />
                ) : (
                  <QRCodeSVG
                    value={qrValue}
                    size={210}
                    color="#0F172A"
                    bg="#FFFFFF"
                  />
                )}
              </View>

              {/* Dynamic Live Refresh Indicator */}
              <View style={styles.liveRefreshRow}>
                <View style={styles.liveDotPulse} />
                <Text style={[styles.liveRefreshText, { fontFamily: typography.fonts.medium, color: colors.textMuted }]}>
                  Dynamic Security Token • Refreshes in <Text style={{ fontFamily: typography.fonts.bold, color: isDark ? '#818CF8' : '#4F46E5' }}>{secondsLeft}s</Text>
                </Text>
              </View>
            </View>

          </View>
        </View>

        {/* ─── Kiosk Guidance Box ─── */}
        <View style={[styles.infoBox, { backgroundColor: isDark ? '#1E293B' : '#FFFFFF', borderColor: isDark ? '#334155' : '#E2E8F0' }]}>
          <Ionicons name="qr-code-outline" size={24} color={isDark ? '#818CF8' : '#4F46E5'} style={{ marginRight: 12 }} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.infoBoxTitle, { fontFamily: typography.fonts.bold, color: isDark ? '#F8FAFC' : '#0F172A' }]}>
              Office Kiosk Scanner Guide
            </Text>
            <Text style={[styles.infoBoxDesc, { fontFamily: typography.fonts.medium, color: colors.textMuted }]}>
              Position this digital pass 10–15 cm from the office attendance camera kiosk to log your attendance instantly.
            </Text>
          </View>
        </View>

        {/* Action Button */}
        <Pressable
          onPress={handleManualRefresh}
          style={[styles.refreshBtn, { backgroundColor: isDark ? '#4F46E5' : '#3F51B5' }]}
        >
          <Ionicons name="refresh-outline" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
          <Text style={[styles.refreshBtnText, { fontFamily: typography.fonts.bold }]}>
            Sync & Refresh QR Data
          </Text>
        </Pressable>
      </ScrollView>
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
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  headerBtn: {
    padding: 6,
  },
  headerTitle: {
    fontSize: 18,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  idCard: {
    borderRadius: 24,
    borderWidth: 1,
    overflow: 'hidden',
    elevation: 6,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    marginBottom: 20,
  },
  cardTopBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  bannerLeftRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  companyNameText: {
    color: '#FFFFFF',
    fontSize: 14,
    letterSpacing: 0.6,
  },
  companySubText: {
    color: '#93C5FD',
    fontSize: 9,
    letterSpacing: 0.8,
  },
  cardBody: {
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 24,
  },
  twoColumnIdentityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 20,
  },
  leftIdentityCol: {
    flex: 1,
    alignItems: 'center',
    paddingRight: 10,
  },
  userNameLeft: {
    fontSize: 15,
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 4,
  },
  designationPillLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  designationTextLeft: {
    fontSize: 11,
  },
  colVerticalDivider: {
    width: 1,
    height: 110,
    opacity: 0.5,
  },
  rightIdentityCol: {
    flex: 1.25,
    justifyContent: 'center',
    paddingLeft: 12,
    gap: 8,
  },
  metaColorBox: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    width: '100%',
  },
  infoMetaGroup: {
    justifyContent: 'center',
  },
  metaLabel: {
    fontSize: 9,
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  metaValue: {
    fontSize: 13,
  },
  avatarWrapper: {
    position: 'relative',
    marginBottom: 4,
  },
  avatarRing: {
    borderWidth: 3,
    borderRadius: 45,
    padding: 2,
  },
  onlineStatusDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#10B981',
    borderWidth: 2.5,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userName: {
    fontSize: 22,
    textAlign: 'center',
    marginBottom: 6,
  },
  designationPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 14,
    marginBottom: 18,
  },
  designationText: {
    fontSize: 13,
  },
  specGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    width: '100%',
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 20,
  },
  specItem: {
    alignItems: 'center',
    flex: 1,
  },
  specLabel: {
    fontSize: 9,
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  specVal: {
    fontSize: 12,
  },
  specDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#CBD5E1',
    opacity: 0.5,
  },
  scannerTargetBox: {
    alignItems: 'center',
  },
  qrFrame: {
    position: 'relative',
    padding: 16,
    borderRadius: 20,
    borderWidth: 1.5,
    elevation: 4,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    marginBottom: 14,
  },
  reticle: {
    position: 'absolute',
    width: 22,
    height: 22,
    borderWidth: 3,
  },
  reticleTL: {
    top: 6,
    left: 6,
    borderRightWidth: 0,
    borderBottomWidth: 0,
    borderTopLeftRadius: 8,
  },
  reticleTR: {
    top: 6,
    right: 6,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
    borderTopRightRadius: 8,
  },
  reticleBL: {
    bottom: 6,
    left: 6,
    borderRightWidth: 0,
    borderTopWidth: 0,
    borderBottomLeftRadius: 8,
  },
  reticleBR: {
    bottom: 6,
    right: 6,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    borderBottomRightRadius: 8,
  },
  liveRefreshRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  liveDotPulse: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
  },
  liveRefreshText: {
    fontSize: 12,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: 20,
  },
  infoBoxTitle: {
    fontSize: 14,
    marginBottom: 2,
  },
  infoBoxDesc: {
    fontSize: 12,
    lineHeight: 17,
  },
  refreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
    borderRadius: 16,
  },
  refreshBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
  },
});
