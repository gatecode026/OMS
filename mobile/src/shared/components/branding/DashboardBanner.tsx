import React from 'react';
import { useBranding } from '../../hooks/useBranding';
import BrandedImage from './BrandedImage';

interface DashboardBannerProps {
  width: number;
  height: number;
  style?: any;
}

export const DashboardBanner: React.FC<DashboardBannerProps> = ({ width, height, style }) => {
  const { branding } = useBranding();
  const fallback = require('../../../../assets/icon.png');

  return (
    <BrandedImage
      url={branding?.dashboardBannerUrl}
      fallback={fallback}
      width={width}
      height={height}
      contentFit="cover"
      style={style}
      accessibilityLabel="Dashboard Banner"
    />
  );
};

export default DashboardBanner;
