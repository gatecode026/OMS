/**
 * @file ImageMessage.tsx
 * @description Premium image message bubble.
 * Shows a rounded preview with ActivityIndicator skeleton while loading.
 * Tapping opens the fullscreen gallery viewer with conversationId for swipe navigation.
 */

import React, { useState } from 'react';
import { Pressable, Image, View, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';

const BUBBLE_WIDTH = 220;
const BUBBLE_HEIGHT = 165;

interface ImageMessageProps {
  mediaUrl: string;
  fileName?: string;
  fileSize?: number;
  conversationId?: string;
  messageId?: string;
}

export const ImageMessage: React.FC<ImageMessageProps> = ({
  mediaUrl,
  fileName,
  fileSize,
  conversationId,
  messageId,
}) => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const handlePress = () => {
    const params = new URLSearchParams({
      url: mediaUrl,
      type: 'image',
      name: fileName || 'Image',
      size: String(fileSize || 0),
      ...(conversationId ? { conversationId } : {}),
      ...(messageId ? { activeMessageId: messageId } : {}),
    });
    router.push(`/chat/preview?${params.toString()}` as any);
  };

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [styles.container, pressed && { opacity: 0.9 }]}
      accessibilityRole="imagebutton"
      accessibilityLabel={`Image attachment${fileName ? `: ${fileName}` : ''}`}
    >
      {/* Skeleton while loading */}
      {isLoading && (
        <View style={styles.skeleton}>
          <ActivityIndicator size="small" color="rgba(255,255,255,0.6)" />
        </View>
      )}

      {hasError ? (
        <View style={[styles.skeleton, styles.errorPlaceholder]}>
          {/* broken image icon */}
          <View style={styles.brokenIcon}>
            {/* simple broken image indicator */}
          </View>
        </View>
      ) : (
        <Image
          source={{ uri: mediaUrl }}
          style={[
            styles.image,
            isLoading && { opacity: 0 },
          ]}
          resizeMode="cover"
          onLoadStart={() => setIsLoading(true)}
          onLoad={() => setIsLoading(false)}
          onError={() => {
            setIsLoading(false);
            setHasError(true);
          }}
        />
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    width: BUBBLE_WIDTH,
    height: BUBBLE_HEIGHT,
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 4,
    backgroundColor: '#1E293B',
  },
  skeleton: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#1E293B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  errorPlaceholder: {
    backgroundColor: '#334155',
  },
  brokenIcon: {
    width: 32,
    height: 32,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
    borderStyle: 'dashed',
  },
});

export default ImageMessage;
