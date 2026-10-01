import { describe, it, expect } from 'vitest';
import { analyzePassword } from './passwordValidation';

function validateSignUpForm(values: {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
}) {
  const errors: Record<string, string> = {};

  if (!values.firstName.trim()) {
    errors.firstName = 'First name is required.';
  }
  if (!values.lastName.trim()) {
    errors.lastName = 'Last name is required.';
  }
  if (!values.email.trim()) {
    errors.email = 'Email is required.';
  }
  if (!values.password.trim()) {
    errors.password = 'Password is required.';
  } else {
    const analysis = analyzePassword(values.password);
    if (!analysis.isValid) {
      errors.password = 'Password does not meet requirements.';
    }
  }

  if (!values.confirmPassword.trim()) {
    errors.confirmPassword = 'Confirm password is required.';
  } else if (values.password !== values.confirmPassword) {
    errors.confirmPassword = 'Passwords do not match.';
  }

  const isValid = Object.keys(errors).length === 0;
  return { isValid, errors };
}

describe('Sign Up Form & Confirm Password Validation', () => {
  it('rejects form when confirm password does not match password', () => {
    const result = validateSignUpForm({
      firstName: 'Maria',
      lastName: 'Santos',
      email: 'maria@example.com',
      password: 'Password123!',
      confirmPassword: 'Password456!',
    });

    expect(result.isValid).toBe(false);
    expect(result.errors.confirmPassword).toBe('Passwords do not match.');
  });

  it('rejects form when required fields are missing', () => {
    const result = validateSignUpForm({
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      confirmPassword: '',
    });

    expect(result.isValid).toBe(false);
    expect(result.errors.firstName).toBe('First name is required.');
    expect(result.errors.lastName).toBe('Last name is required.');
    expect(result.errors.email).toBe('Email is required.');
    expect(result.errors.confirmPassword).toBe('Confirm password is required.');
  });

  it('accepts form when all fields are valid and passwords match', () => {
    const result = validateSignUpForm({
      firstName: 'Juan',
      lastName: 'Dela Cruz',
      email: 'juan@example.com',
      password: 'StrongPassword1!',
      confirmPassword: 'StrongPassword1!',
    });

    expect(result.isValid).toBe(true);
    expect(Object.keys(result.errors).length).toBe(0);
  });
});
