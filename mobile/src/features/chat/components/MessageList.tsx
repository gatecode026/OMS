import React, { useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import dayjs from 'dayjs';
import useTheme from '../../../shared/hooks/useTheme';
import { Image as ExpoImage } from 'expo-image';
import { ChatMessage } from '../types';
import { UploadState } from '../hooks/useUploadQueue';
import MessageBubble from './MessageBubble';
import DateSeparator from './DateSeparator';
import ScrollToBottomButton from './ScrollToBottomButton';

interface MessageListProps {
  flatListRef: React.RefObject<any>;
  localMessages: ChatMessage[];
  isLoading: boolean;
  currentUserId: string;
  onLongPressMessage: (msg: ChatMessage) => void;
  onSwipeReply: (msg: ChatMessage) => void;
  onRetryUpload: (msg: ChatMessage) => void;
  onCancelUpload: (msgId: string) => void;
  onRetrySend: (msg: ChatMessage) => void;
  uploadsProgress: Record<string, number>;
  uploadErrors: Record<string, boolean>;
  uploadStates?: Record<string, UploadState>;
  wallpaper: { type: string; value: string };
  isGroup?: boolean;
  highlightedMessageId?: string;
}

export const MessageList: React.FC<MessageListProps> = ({
  flatListRef,
  localMessages,
  isLoading,
  currentUserId,
  onLongPressMessage,
  onSwipeReply,
  onRetryUpload,
  onCancelUpload,
  onRetrySend,
  uploadsProgress,
  uploadErrors,
  uploadStates,
  wallpaper,
  isGroup = false,
  highlightedMessageId,
}) => {
  const { colors, spacing } = useTheme();
  const [showScrollBtn, setShowScrollBtn] = React.useState(false);
  const [newMessagesCount, setNewMessagesCount] = React.useState(0);
  const isCloseToBottomRef = React.useRef(true);
  const prevMessagesLengthRef = React.useRef(localMessages.length);

  React.useEffect(() => {
    if (localMessages.length > prevMessagesLengthRef.current) {
      const lastMsg = localMessages[localMessages.length - 1];
      if (lastMsg && lastMsg.senderId !== currentUserId) {
        if (!isCloseToBottomRef.current) {
          setNewMessagesCount((c) => c + 1);
        }
      }
    }
    prevMessagesLengthRef.current = localMessages.length;
  }, [localMessages.length, currentUserId]);

  const handleScroll = (event: any) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    const contentHeight = event.nativeEvent.contentSize.height;
    const layoutHeight = event.nativeEvent.layoutMeasurement.height;
    const isCloseToBottom = contentHeight - layoutHeight - offsetY < 150;
    isCloseToBottomRef.current = isCloseToBottom;
    setShowScrollBtn(!isCloseToBottom);
    if (isCloseToBottom) {
      setNewMessagesCount(0);
    }
  };

  const scrollToBottom = () => {
    setNewMessagesCount(0);
    isCloseToBottomRef.current = true;
    flatListRef.current?.scrollToEnd({ animated: true });
  };

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const AnyFlashList = FlashList as any;

  const isSolid = wallpaper.type === 'solid';
  const isImage = wallpaper.type === 'image';

  return (
    <View style={[styles.container, isSolid && { backgroundColor: wallpaper.value }]}>
      {isImage && (
        <View style={StyleSheet.absoluteFill}>
          <ExpoImage
            source={{ uri: wallpaper.value }}
            style={StyleSheet.absoluteFillObject}
            contentFit="cover"
          />
        </View>
      )}
      <AnyFlashList
        ref={flatListRef}
        data={localMessages}
        extraData={localMessages}
        keyExtractor={(item: ChatMessage) => item.id}
        estimatedItemSize={80}
        contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingVertical: spacing.md }}
        onContentSizeChange={() => {
          if (isCloseToBottomRef.current) {
            scrollToBottom();
          }
        }}
        onLayout={() => {
          if (isCloseToBottomRef.current) {
            scrollToBottom();
          }
        }}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        renderItem={({ item, index }: { item: ChatMessage; index: number }) => {
          const showDateSep =
            index === 0 ||
            !dayjs(item.createdAt).isSame(dayjs(localMessages[index - 1].createdAt), 'day');

          const prevMsg = index > 0 ? localMessages[index - 1] : null;
          const nextMsg = index < localMessages.length - 1 ? localMessages[index + 1] : null;

          const isFirstOfGroup =
            !prevMsg ||
            prevMsg.senderId !== item.senderId ||
            prevMsg.type === 'system' ||
            prevMsg.type === 'call' ||
            !dayjs(item.createdAt).isSame(dayjs(prevMsg.createdAt), 'day') ||
            dayjs(item.createdAt).diff(dayjs(prevMsg.createdAt), 'minute') > 1;

          const isLastOfGroup =
            !nextMsg ||
            nextMsg.senderId !== item.senderId ||
            nextMsg.type === 'system' ||
            nextMsg.type === 'call' ||
            !dayjs(item.createdAt).isSame(dayjs(nextMsg.createdAt), 'day') ||
            dayjs(nextMsg.createdAt).diff(dayjs(item.createdAt), 'minute') > 1;

          return (
            <View style={{ width: '100%' }}>
              {showDateSep && (
                <DateSeparator date={dayjs(item.createdAt).format('MMMM D, YYYY')} />
              )}
               <MessageBubble
                item={item}
                currentUserId={currentUserId}
                onLongPress={onLongPressMessage}
                onSwipeReply={onSwipeReply}
                onRetryUpload={onRetryUpload}
                onCancelUpload={onCancelUpload}
                onRetrySend={onRetrySend}
                uploadProgress={uploadsProgress[item.id]}
                uploadError={uploadErrors[item.id]}
                uploadState={uploadStates?.[item.id]}
                isFirstOfGroup={isFirstOfGroup}
                isLastOfGroup={isLastOfGroup}
                isGroup={isGroup}
                isHighlighted={item.id === highlightedMessageId}
              />
            </View>
          );
        }}
      />
      <ScrollToBottomButton onPress={scrollToBottom} visible={showScrollBtn} unreadCount={newMessagesCount} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default MessageList;
