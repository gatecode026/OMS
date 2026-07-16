/**
 * @file apply-leave.tsx
 * @description Apply Leave screen.
 *   - Inline dropdown for leave type (no modal)
 *   - Calendar icon on date inputs → native DateTimePicker (past dates disabled)
 *   - Polished submit button
 *   - Same UI structure as original
 */

import React, { useState, useMemo, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  StatusBar,
} from "react-native";
import DateTimePicker, {
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import dayjs from "dayjs";

import useTheme from "../../src/shared/hooks/useTheme";
import useAuthStore from "../../src/shared/store/authStore";
import {
  useLeavePolicies,
  useCreateLeaveRequest,
  useCancelLeaveRequest,
} from "../../src/features/leaves/hooks/useLeaves";
import { LeavePolicy } from "../../src/features/leaves/types";
import leavesApi from "../../src/features/leaves/api/leavesApi";
import { toast } from "../../src/shared/components/Toast";

const TODAY = dayjs().startOf("day").toDate();

export default function ApplyLeaveScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, spacing, typography, radius, shadows, isDark } = useTheme();
  const user = useAuthStore((s) => s.user);

  // Edit mode params
  const params = useLocalSearchParams<{
    editId?: string;
    type?: string;
    fromDate?: string;
    toDate?: string;
    reason?: string;
  }>();
  const isEditMode = !!params.editId;

  // Form — prefill from params if editing
  const [leaveType, setLeaveType] = useState(params.type || "");
  const [fromDate, setFromDate] = useState(params.fromDate || "");
  const [toDate, setToDate] = useState(params.toDate || "");
  const [reason, setReason] = useState(params.reason || "");

  // Sync picker dates with prefilled param dates
  const [pickerFrom, setPickerFrom] = useState<Date>(
    params.fromDate ? dayjs(params.fromDate).toDate() : TODAY
  );
  const [pickerTo, setPickerTo] = useState<Date>(
    params.toDate ? dayjs(params.toDate).toDate() : TODAY
  );

  // Dropdown
  const [isTypeOpen, setIsTypeOpen] = useState(false);

  // Date pickers
  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showToPicker, setShowToPicker] = useState(false);

  // Misc
  const [inlineError, setInlineError] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  const { data: policies = [], isLoading: isLoadingPolicies } =
    useLeavePolicies();
  const createMutation = useCreateLeaveRequest();

  const activePolicies = useMemo(
    () => policies.filter((p) => p.isActive),
    [policies]
  );

  const calculatedDays = useMemo(() => {
    if (!fromDate || !toDate) return 0;
    const s = dayjs(fromDate);
    const e = dayjs(toDate);
    if (!s.isValid() || !e.isValid()) return 0;
    const d = e.diff(s, "day");
    return d >= 0 ? d + 1 : 0;
  }, [fromDate, toDate]);

  const todayStr = dayjs().format("YYYY-MM-DD");

  // From date change
  const onFromChange = (event: DateTimePickerEvent, date?: Date) => {
    setShowFromPicker(Platform.OS === "ios");
    if (event.type === "dismissed") return;
    if (date) {
      setPickerFrom(date);
      const str = dayjs(date).format("YYYY-MM-DD");
      setFromDate(str);
      setInlineError(null);
      // Reset toDate if it is before new fromDate
      if (toDate && toDate < str) {
        setToDate("");
        setPickerTo(date);
      }
    }
  };

  // To date change
  const onToChange = (event: DateTimePickerEvent, date?: Date) => {
    setShowToPicker(Platform.OS === "ios");
    if (event.type === "dismissed") return;
    if (date) {
      setPickerTo(date);
      setToDate(dayjs(date).format("YYYY-MM-DD"));
      setInlineError(null);
    }
  };

  const handleSubmit = async () => {
    setInlineError(null);
    if (!leaveType) return setInlineError("Please select a leave type.");
    if (!fromDate) return setInlineError("Please select a start date.");
    if (!toDate) return setInlineError("Please select an end date.");
    if (!reason.trim())
      return setInlineError("Please provide a reason for your leave.");
    if (!isEditMode && fromDate < todayStr)
      return setInlineError("Start date cannot be in the past.");
    if (toDate < fromDate)
      return setInlineError("End date cannot be before start date.");

    // ── EDIT MODE: PUT request via direct API ──
    if (isEditMode && params.editId) {
      setIsUpdating(true);
      try {
        await leavesApi.updateRequest(params.editId, {
          type: leaveType,
          fromDate,
          toDate,
          days: calculatedDays,
          reason: reason.trim(),
        });
        toast.success('Request updated successfully');
        setTimeout(() => router.replace("/leave" as any), 1500);
      } catch (err: any) {
        setInlineError(
          err.response?.data?.message || "Failed to update request. Please try again."
        );
      } finally {
        setIsUpdating(false);
      }
      return;
    }

    // ── CREATE MODE: POST request ──
    createMutation.mutate(
      {
        employeeId: user?.id || "",
        employeeName: user?.name || "Employee",
        department: user?.department || "IT",
        type: leaveType,
        fromDate,
        toDate,
        days: calculatedDays,
        reason: reason.trim(),
        status: "Pending",
      },
      {
        onSuccess: () => {
          toast.success('Leave request submitted successfully');
          setTimeout(() => router.replace("/leave" as any), 1500);
        },
        onError: (err: any) => {
          setInlineError(
            err.response?.data?.message ||
              "Failed to submit request. Please try again."
          );
        },
      }
    );
  };

  const isFormValid =
    leaveType && fromDate && toDate && reason.trim().length > 0;
  const isBusy = createMutation.isPending || isUpdating;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar
        barStyle={isDark ? "light-content" : "dark-content"}
        backgroundColor="transparent"
        translucent
      />

      {/* Header */}
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + 8,
            backgroundColor: colors.surface,
            borderBottomColor: colors.border,
            borderBottomWidth: 1,
          },
        ]}
      >
        <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Pressable>
        <Text
          style={[
            styles.headerTitle,
            { color: colors.text, fontFamily: typography.fonts.bold },
          ]}
        >
          {isEditMode ? "Edit Request" : "Apply Leave"}
        </Text>
        <View style={{ width: 32 }} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scroll,
            { paddingBottom: insets.bottom + 48 },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={{ padding: spacing.lg, gap: spacing.lg }}>
            <Text
              style={[
                styles.subtitle,
                {
                  color: colors.textMuted,
                  fontFamily: typography.fonts.medium,
                },
              ]}
            >
              {isEditMode
                ? "Update the details of your pending leave request."
                : "Fill out the form details below to request a new leave period."}
            </Text>

            {/* Error Banner */}
            {inlineError && (
              <View
                style={[
                  styles.errorBox,
                  { backgroundColor: `${colors.danger}12` },
                ]}
              >
                <Ionicons
                  name="alert-circle"
                  size={16}
                  color={colors.danger}
                  style={{ marginRight: 6 }}
                />
                <Text
                  style={[
                    styles.errorText,
                    {
                      color: colors.danger,
                      fontFamily: typography.fonts.semibold,
                    },
                  ]}
                >
                  {inlineError}
                </Text>
              </View>
            )}

            {/* ── Leave Type ── */}
            <View>
              <Text
                style={[
                  styles.fieldLabel,
                  {
                    color: colors.textMuted,
                    fontFamily: typography.fonts.bold,
                  },
                ]}
              >
                LEAVE TYPE
              </Text>
              <Pressable
                onPress={() => setIsTypeOpen((v) => !v)}
                style={[
                  styles.dropdownTrigger,
                  {
                    backgroundColor: colors.surface,
                    borderColor: isTypeOpen ? colors.primary : colors.border,
                    borderRadius: radius.md,
                  },
                  shadows.light,
                ]}
              >
                <Text
                  style={[
                    styles.dropdownTriggerText,
                    {
                      color: leaveType ? colors.text : colors.textLight,
                      fontFamily: leaveType
                        ? typography.fonts.semibold
                        : typography.fonts.regular,
                    },
                  ]}
                >
                  {leaveType || "Select Leave Type"}
                </Text>
                <Ionicons
                  name={isTypeOpen ? "chevron-up" : "chevron-down"}
                  size={18}
                  color={colors.textLight}
                />
              </Pressable>

              {/* Inline dropdown list */}
              {isTypeOpen && (
                <View
                  style={[
                    styles.dropdownList,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                      borderRadius: radius.md,
                    },
                    shadows.medium,
                  ]}
                >
                  {isLoadingPolicies ? (
                    <ActivityIndicator
                      color={colors.primary}
                      style={{ marginVertical: 14 }}
                    />
                  ) : activePolicies.length === 0 ? (
                    <Text
                      style={[
                        styles.dropdownEmpty,
                        {
                          color: colors.textMuted,
                          fontFamily: typography.fonts.medium,
                        },
                      ]}
                    >
                      No leave types available
                    </Text>
                  ) : (
                    activePolicies.map((policy, idx) => {
                      const isLast = idx === activePolicies.length - 1;
                      const isSelected = leaveType === policy.leaveName;
                      return (
                        <Pressable
                          key={policy.id}
                          onPress={() => {
                            setLeaveType(policy.leaveName);
                            setIsTypeOpen(false);
                            setInlineError(null);
                          }}
                          style={({ pressed }) => [
                            styles.dropdownItem,
                            !isLast && {
                              borderBottomWidth: 1,
                              borderBottomColor: colors.border,
                            },
                            pressed && {
                              backgroundColor: `${colors.primary}08`,
                            },
                            isSelected && {
                              backgroundColor: `${colors.primary}10`,
                            },
                          ]}
                        >
                          <View style={{ flex: 1 }}>
                            <Text
                              style={[
                                styles.dropdownItemText,
                                {
                                  color: colors.text,
                                  fontFamily: isSelected
                                    ? typography.fonts.bold
                                    : typography.fonts.semibold,
                                },
                              ]}
                            >
                              {policy.leaveName}
                            </Text>
                            {policy.description ? (
                              <Text
                                style={[
                                  styles.dropdownItemDesc,
                                  {
                                    color: colors.textMuted,
                                    fontFamily: typography.fonts.regular,
                                  },
                                ]}
                              >
                                {policy.description}
                              </Text>
                            ) : null}
                          </View>
                          {isSelected && (
                            <Ionicons
                              name="checkmark-circle"
                              size={18}
                              color={colors.primary}
                            />
                          )}
                        </Pressable>
                      );
                    })
                  )}
                </View>
              )}
            </View>

            {/* ── From Date & To Date ── */}
            <View style={styles.datesRow}>
              {/* FROM DATE */}
              <View style={{ flex: 1 }}>
                <Text
                  style={[
                    styles.fieldLabel,
                    {
                      color: colors.textMuted,
                      fontFamily: typography.fonts.bold,
                    },
                  ]}
                >
                  FROM DATE
                </Text>
                <Pressable
                  onPress={() => setShowFromPicker(true)}
                  style={[
                    styles.dateInput,
                    {
                      backgroundColor: colors.surface,
                      borderColor: fromDate ? colors.primary : colors.border,
                      borderRadius: radius.md,
                    },
                    shadows.light,
                  ]}
                >
                  <Text
                    style={[
                      styles.dateInputText,
                      {
                        color: fromDate ? colors.text : colors.textLight,
                        fontFamily: fromDate
                          ? typography.fonts.semibold
                          : typography.fonts.regular,
                        flex: 1,
                      },
                    ]}
                    numberOfLines={1}
                  >
                    {fromDate
                      ? dayjs(fromDate).format("DD MMM YYYY")
                      : "Select date"}
                  </Text>
                  <Ionicons
                    name="calendar-outline"
                    size={16}
                    color={fromDate ? colors.primary : colors.textLight}
                  />
                </Pressable>
              </View>

              {/* TO DATE */}
              <View style={{ flex: 1 }}>
                <Text
                  style={[
                    styles.fieldLabel,
                    {
                      color: colors.textMuted,
                      fontFamily: typography.fonts.bold,
                    },
                  ]}
                >
                  TO DATE
                </Text>
                <Pressable
                  onPress={() => setShowToPicker(true)}
                  style={[
                    styles.dateInput,
                    {
                      backgroundColor: colors.surface,
                      borderColor: toDate ? colors.primary : colors.border,
                      borderRadius: radius.md,
                    },
                    shadows.light,
                  ]}
                >
                  <Text
                    style={[
                      styles.dateInputText,
                      {
                        color: toDate ? colors.text : colors.textLight,
                        fontFamily: toDate
                          ? typography.fonts.semibold
                          : typography.fonts.regular,
                        flex: 1,
                      },
                    ]}
                    numberOfLines={1}
                  >
                    {toDate
                      ? dayjs(toDate).format("DD MMM YYYY")
                      : "Select date"}
                  </Text>
                  <Ionicons
                    name="calendar-outline"
                    size={16}
                    color={toDate ? colors.primary : colors.textLight}
                  />
                </Pressable>
              </View>
            </View>

            {/* Native DateTimePicker — Android shows inline, iOS shows spinner modal */}
            {showFromPicker && (
              <DateTimePicker
                value={pickerFrom}
                mode="date"
                display={Platform.OS === "ios" ? "spinner" : "default"}
                minimumDate={TODAY}
                onChange={onFromChange}
                accentColor={colors.primary}
              />
            )}
            {showToPicker && (
              <DateTimePicker
                value={pickerTo}
                mode="date"
                display={Platform.OS === "ios" ? "spinner" : "default"}
                minimumDate={fromDate ? dayjs(fromDate).toDate() : TODAY}
                onChange={onToChange}
                accentColor={colors.primary}
              />
            )}

            {/* Duration badge */}
            {calculatedDays > 0 && (
              <View
                style={[
                  styles.durationBadge,
                  {
                    backgroundColor: `${colors.primary}12`,
                    borderColor: `${colors.primary}30`,
                  },
                ]}
              >
                <Ionicons
                  name="time-outline"
                  size={14}
                  color={colors.primary}
                />
                <Text
                  style={[
                    styles.durationText,
                    {
                      color: colors.primary,
                      fontFamily: typography.fonts.semibold,
                    },
                  ]}
                >
                  {calculatedDays} {calculatedDays === 1 ? "Day" : "Days"} ·{" "}
                  {dayjs(fromDate).format("DD MMM")} →{" "}
                  {dayjs(toDate).format("DD MMM")}
                </Text>
              </View>
            )}

            {/* ── Reason ── */}
            <View>
              <Text
                style={[
                  styles.fieldLabel,
                  {
                    color: colors.textMuted,
                    fontFamily: typography.fonts.bold,
                  },
                ]}
              >
                REASON FOR LEAVE
              </Text>
              <TextInput
                placeholder="Write your explanation or details here..."
                placeholderTextColor={colors.textLight}
                value={reason}
                onChangeText={(v) => {
                  setReason(v);
                  setInlineError(null);
                }}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                style={[
                  styles.textarea,
                  {
                    backgroundColor: colors.surface,
                    borderColor:
                      reason.length > 0 ? colors.primary : colors.border,
                    borderRadius: radius.md,
                    color: colors.text,
                    fontFamily: typography.fonts.regular,
                  },
                  shadows.light,
                ]}
              />
            </View>

            {/* ── Submit Button ── */}
            <Pressable
              onPress={handleSubmit}
              disabled={isBusy}
              style={({ pressed }) => [
                styles.submitBtn,
                {
                  backgroundColor: isFormValid ? colors.primary : `${colors.primary}55`,
                  opacity: pressed ? 0.88 : 1,
                },
                isFormValid && shadows.medium,
              ]}
            >
              {isBusy ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons
                    name={isEditMode ? "checkmark-circle" : "paper-plane"}
                    size={17}
                    color="#FFFFFF"
                    style={{ marginRight: 10 }}
                  />
                  <Text
                    style={[
                      styles.submitBtnText,
                      { fontFamily: typography.fonts.bold },
                    ]}
                  >
                    {isEditMode ? "UPDATE REQUEST" : "SUBMIT LEAVE REQUEST"}
                  </Text>
                </>
              )}
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, textAlign: "center" },
  scroll: { flexGrow: 1 },
  subtitle: { fontSize: 13, lineHeight: 19 },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 10,
  },
  errorText: { fontSize: 12, flex: 1 },
  fieldLabel: {
    fontSize: 10,
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  // Dropdown
  dropdownTrigger: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    height: 48,
    paddingHorizontal: 14,
  },
  dropdownTriggerText: { fontSize: 14, flex: 1 },
  dropdownList: {
    marginTop: 4,
    borderWidth: 1,
    overflow: "hidden",
  },
  dropdownEmpty: {
    textAlign: "center",
    fontSize: 13,
    paddingVertical: 14,
  },
  dropdownItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  dropdownItemText: { fontSize: 14 },
  dropdownItemDesc: { fontSize: 11, marginTop: 2 },
  // Dates
  datesRow: { flexDirection: "row", gap: 12 },
  dateInput: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    height: 48,
    paddingHorizontal: 12,
  },
  dateInputText: { fontSize: 13 },
  durationBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    alignSelf: "flex-start",
  },
  durationText: { fontSize: 12 },
  // Textarea
  textarea: {
    borderWidth: 1,
    padding: 12,
    height: 100,
    textAlignVertical: "top",
    fontSize: 14,
    lineHeight: 20,
  },
  // Submit
  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 54,
    borderRadius: 14,
    marginTop: 4,
  },
  submitBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    letterSpacing: 0.6,
  },
});
