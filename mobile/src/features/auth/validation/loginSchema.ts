import { z } from 'zod';

export interface LoginFormValues {
  companyCode: string;
  identifier: string; // employee ID or email
  password: string;
  rememberMe: boolean;
}

export type LoginFormErrors = Partial<Record<keyof LoginFormValues, string>>;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const EMPLOYEE_ID_REGEX = /^[A-Za-z0-9_\-\.]{3,50}$/;

export const loginValidationSchema = z.object({
  companyCode: z.string(),
  identifier: z.string().trim().min(1, 'Employee ID or email is required.'),
  password: z.string().min(1, 'Password is required.').min(4, 'Password must be at least 4 characters.'),
  rememberMe: z.boolean(),
});

/**
 * Validates the login form and returns an errors object.
 * If the object is empty, form is valid.
 */
export function validateLoginForm(
  values: LoginFormValues,
  requireCompanyCode: boolean = false
): LoginFormErrors {
  const errors: LoginFormErrors = {};

  // Run Zod schema validation
  const result = loginValidationSchema.safeParse(values);
  if (!result.success) {
    result.error.issues.forEach((issue) => {
      const field = issue.path[0] as keyof LoginFormValues;
      if (field && !errors[field]) {
        errors[field] = issue.message;
      }
    });
  }

  // Company Code validation (only when multi-tenant mode enabled)
  if (requireCompanyCode) {
    const code = (values.companyCode || '').trim();
    if (!code) {
      errors.companyCode = 'Company code is required.';
    } else if (code.length < 2) {
      errors.companyCode = 'Company code must be at least 2 characters.';
    }
  }

  // Identifier custom union validation (must be either valid email or valid employee ID)
  const idVal = (values.identifier || '').trim();
  if (idVal) {
    const isEmail = EMAIL_REGEX.test(idVal);
    const isEmployeeId = EMPLOYEE_ID_REGEX.test(idVal);
    if (!isEmail && !isEmployeeId) {
      errors.identifier = 'Enter a valid email address or employee ID.';
    }
  }

  return errors;
}
