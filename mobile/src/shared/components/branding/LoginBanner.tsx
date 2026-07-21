import React from 'react';
import { useLoginAssets } from '../../hooks/useBranding';
import BrandedImage from './BrandedImage';

interface LoginBannerProps {
  width: number;
  height: number;
  style?: any;
}

export const LoginBanner: React.FC<LoginBannerProps> = ({ width, height, style }) => {
  const { loginBanner } = useLoginAssets();
  const fallback = require('../../../../assets/icon.png');

  return (
    <BrandedImage
      url={loginBanner}
      fallback={fallback}
      width={width}
      height={height}
      contentFit="cover"
      style={style}
      accessibilityLabel="Login Banner"
    />
  );
};

export default LoginBanner;
