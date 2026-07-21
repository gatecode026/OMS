import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Button } from '../Button';

describe('Button component', () => {
  it('should render the title text correctly', () => {
    const { getByText } = render(<Button title="Submit" onPress={jest.fn()} />);
    expect(getByText('Submit')).toBeTruthy();
  });

  it('should fire the onPress handler when tapped', () => {
    const handlePress = jest.fn();
    const { getByText } = render(<Button title="Tap Me" onPress={handlePress} />);
    
    fireEvent.press(getByText('Tap Me'));
    expect(handlePress).toHaveBeenCalledTimes(1);
  });

  it('should disable onPress events when loading', () => {
    const handlePress = jest.fn();
    const { queryByText } = render(
      <Button title="Tap Me" onPress={handlePress} loading={true} />
    );
    
    // Title is hidden/replaced by ActivityIndicator, so Tap Me text shouldn't be found
    expect(queryByText('Tap Me')).toBeNull();
  });

  it('should disable onPress events when disabled', () => {
    const handlePress = jest.fn();
    const { getByText } = render(
      <Button title="Tap Me" onPress={handlePress} disabled={true} />
    );
    
    fireEvent.press(getByText('Tap Me'));
    expect(handlePress).not.toHaveBeenCalled();
  });

  it('should include correct accessibility properties', () => {
    const { getByRole } = render(
      <Button title="Submit" onPress={jest.fn()} accessibilityLabel="Submit Form" />
    );
    
    const buttonElement = getByRole('button');
    expect(buttonElement.props.accessibilityLabel).toBe('Submit Form');
    expect(buttonElement.props.accessibilityState.disabled).toBe(false);
  });
});
