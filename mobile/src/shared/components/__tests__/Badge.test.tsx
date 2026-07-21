import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Badge, Chip } from '../Badge';

describe('Badge and Chip components', () => {
  describe('Badge', () => {
    it('should render correct badge content', () => {
      const { getByText } = render(<Badge content={5} />);
      expect(getByText('5')).toBeTruthy();
    });
  });

  describe('Chip', () => {
    it('should render chip label correctly', () => {
      const { getByText } = render(<Chip label="Design" />);
      expect(getByText('Design')).toBeTruthy();
    });

    it('should fire onPress when tapped', () => {
      const handlePress = jest.fn();
      const { getByText } = render(<Chip label="Design" onPress={handlePress} />);
      
      fireEvent.press(getByText('Design'));
      expect(handlePress).toHaveBeenCalledTimes(1);
    });

    it('should show selected state styling configurations', () => {
      const { getByText } = render(<Chip label="Design" selected={true} />);
      const textNode = getByText('Design');
      
      // Selected text style has white color (e.g. #FFFFFF)
      expect(textNode.props.style.color).toBe('#FFFFFF');
    });
  });
});
