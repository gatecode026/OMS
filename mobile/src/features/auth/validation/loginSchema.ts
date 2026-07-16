/**
 * @file loginSchema.ts
 * @description Validation schema for the Login form. Supports Employee ID, email, and company code fields.
 */

export interface LoginFormValues {
  companyCode: string;
  identifier: string; // employee ID or email
  password: string;
  rememberMe: boolean;
}

export type LoginFormErrors = Partial<Record<keyof LoginFormValues, string>>;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const EMPLOYEE_ID_REGEX = /^[A-Za-z0-9_\-\.]{3,50}$/;

function isEmailFormat(value: string): boolean {
  return EMAIL_REGEX.test(value);
}

function isEmployeeIdFormat(value: string): boolean {
  return EMPLOYEE_ID_REGEX.test(value);
}

/**
 * Validates the login form and returns an errors object.
 * If the object is empty, form is valid.
 */
export function validateLoginForm(
  values: LoginFormValues,
  requireCompanyCode: boolean = false
): LoginFormErrors {
  const errors: LoginFormErrors = {};

  // Company Code validation (only when multi-tenant mode enabled)
  if (requireCompanyCode) {
    if (!values.companyCode.trim()) {
      errors.companyCode = 'Company code is required.';
    } else if (values.companyCode.trim().length < 2) {
      errors.companyCode = 'Company code must be at least 2 characters.';
    }
  }

  // Identifier validation
  if (!values.identifier.trim()) {
    errors.identifier = 'Employee ID or email is required.';
  } else {
    const id = values.identifier.trim();
    const isEmail = isEmailFormat(id);
    const isEmployeeId = isEmployeeIdFormat(id);
    if (!isEmail && !isEmployeeId) {
      errors.identifier = 'Enter a valid email address or employee ID.';
    }
  }

  // Password validation
  if (!values.password) {
    errors.password = 'Password is required.';
  } else if (values.password.length < 4) {
    errors.password = 'Password must be at least 4 characters.';
  }

  return errors;
}
