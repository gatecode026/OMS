import React from 'react';
import { useCompanyLogo } from '../../hooks/useBranding';
import BrandedImage from './BrandedImage';

interface AppLogoProps {
  size?: number;
  style?: any;
}

export const AppLogo: React.FC<AppLogoProps> = ({ size = 40, style }) => {
  const { appLogoUrl } = useCompanyLogo();
  const fallback = require('../../../../assets/gatecode-logo.png');

  return (
    <BrandedImage
      url={appLogoUrl}
      fallback={fallback}
      width={size}
      height={size}
      style={style}
      accessibilityLabel="App Logo"
    />
  );
};

export default AppLogo;
