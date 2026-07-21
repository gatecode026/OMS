import React, { useState } from 'react';
import { StyleSheet, ActivityIndicator, View } from 'react-native';
import { Image, ImageStyle } from 'expo-image';
import useTheme from '../../hooks/useTheme';
import { optimizeImageKitUrl } from '../../utils/image';

interface BrandedImageProps {
  url?: string | null;
  fallback: any; // local require or URL
  width: number;
  height: number;
  contentFit?: 'contain' | 'cover' | 'fill' | 'none' | 'scale-down';
  style?: any;
  accessibilityLabel?: string;
}

export const BrandedImage: React.FC<BrandedImageProps> = ({
  url,
  fallback,
  width,
  height,
  contentFit = 'contain',
  style,
  accessibilityLabel,
}) => {
  const { colors } = useTheme();
  const [loading, setLoading] = useState(false);
  const [hasError, setHasError] = useState(false);

  const optimizedUrl = url ? optimizeImageKitUrl(url, width, height) : null;
  const imageSource = (optimizedUrl && !hasError) ? { uri: optimizedUrl } : fallback;

  const handleLoadStart = () => {
    setLoading(true);
  };

  const handleLoadEnd = () => {
    setLoading(false);
  };

  const handleError = (err: any) => {
    setHasError(true);
    setLoading(false);
    console.error(`[FileCacheService]
Operation: ImageLoad
Directory: ImageKitCDN
File: ${url}
Error: ${err?.error || 'Failed to load remote image'}
Stack: ${new Error().stack}
RecoveryAction: Show fallback illustration.`);
  };

  return (
    <View style={[{ width, height }, styles.container, style]}>
      <Image
        source={imageSource}
        style={{ width, height } as ImageStyle}
        contentFit={contentFit as any}
        onLoadStart={handleLoadStart}
        onLoadEnd={handleLoadEnd}
        onError={handleError}
        accessibilityLabel={accessibilityLabel}
        transition={200}
      />
      {loading && (
        <View style={[StyleSheet.absoluteFill, styles.loader, { backgroundColor: 'transparent' }]}>
          <ActivityIndicator size="small" color={colors.primary} />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  loader: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default BrandedImage;
