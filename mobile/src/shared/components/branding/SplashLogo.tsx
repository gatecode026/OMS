import React from 'react';
import { useSplashAssets } from '../../hooks/useBranding';
import BrandedImage from './BrandedImage';

interface SplashLogoProps {
  size?: number;
  style?: any;
}

export const SplashLogo: React.FC<SplashLogoProps> = ({ size = 80, style }) => {
  const { splashLogo } = useSplashAssets();
  const fallback = require('../../../../assets/splash-icon.png');

  return (
    <BrandedImage
      url={splashLogo}
      fallback={fallback}
      width={size}
      height={size}
      style={style}
      accessibilityLabel="Splash Logo"
    />
  );
};

export default SplashLogo;
