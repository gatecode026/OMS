import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { TextField } from '../Input';

describe('TextField component', () => {
  it('should render label and placeholder correctly', () => {
    const { getByText, getByPlaceholderText } = render(
      <TextField label="Username" placeholder="Enter username" />
    );

    expect(getByText('Username')).toBeTruthy();
    expect(getByPlaceholderText('Enter username')).toBeTruthy();
  });

  it('should trigger onChangeText when typing', () => {
    const handleChangeText = jest.fn();
    const { getByPlaceholderText } = render(
      <TextField placeholder="Enter username" onChangeText={handleChangeText} />
    );

    fireEvent.changeText(getByPlaceholderText('Enter username'), 'rahul');
    expect(handleChangeText).toHaveBeenCalledWith('rahul');
  });

  it('should render error messages when error prop is provided', () => {
    const { getByText } = render(
      <TextField label="Username" error="Username is required" />
    );

    expect(getByText('Username is required')).toBeTruthy();
  });

  it('should disable editing when disabled prop is true', () => {
    const { getByPlaceholderText } = render(
      <TextField placeholder="Enter username" disabled={true} />
    );

    const input = getByPlaceholderText('Enter username');
    expect(input.props.editable).toBe(false);
  });
});
