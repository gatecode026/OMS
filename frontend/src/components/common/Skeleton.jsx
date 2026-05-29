import React from 'react';
import './Skeleton.css';

const Skeleton = ({
  variant = 'line', // 'line', 'circle', 'rect'
  width,
  height,
  className = '',
  style = {}
}) => {
  const customStyles = {
    width,
    height,
    ...style
  };

  return (
    <div
      className={`skeleton skeleton-${variant} ${className}`}
      style={customStyles}
    />
  );
};

export default Skeleton;
