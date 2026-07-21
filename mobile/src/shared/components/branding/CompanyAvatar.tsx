import React from 'react';
import { useBranding } from '../../hooks/useBranding';
import BrandedImage from './BrandedImage';

interface CompanyAvatarProps {
  size?: number;
  rounded?: boolean;
  style?: any;
}

export const CompanyAvatar: React.FC<CompanyAvatarProps> = ({ size = 40, rounded = true, style }) => {
  const { branding } = useBranding();
  const fallback = require('../../../../assets/gatecode-logo.png');

  return (
    <BrandedImage
      url={branding?.defaultAvatarUrl}
      fallback={fallback}
      width={size}
      height={size}
      contentFit="cover"
      style={[{ borderRadius: rounded ? size / 2 : 8 }, style]}
      accessibilityLabel="Company Avatar"
    />
  );
};

export default CompanyAvatar;
