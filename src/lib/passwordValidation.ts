export interface PasswordRule {
  id: string;
  label: string;
  valid: boolean;
}

export interface PasswordAnalysis {
  rules: PasswordRule[];
  isValid: boolean;
  score: number; // 0 to 4
  strengthLabel: 'Weak' | 'Fair' | 'Good' | 'Strong' | '';
  strengthColor: string;
}

/**
 * Analyzes a password against standard professional security criteria:
 * 1. Minimum 8 characters
 * 2. At least one uppercase letter (A–Z)
 * 3. At least one lowercase letter (a–z)
 * 4. At least one number (0–9)
 * 5. At least one special character (!@#$%^&*)
 */
export function analyzePassword(password: string): PasswordAnalysis {
  const rules: PasswordRule[] = [
    {
      id: 'length',
      label: 'At least 8 characters',
      valid: password.length >= 8,
    },
    {
      id: 'uppercase',
      label: 'At least one uppercase letter (A–Z)',
      valid: /[A-Z]/.test(password),
    },
    {
      id: 'lowercase',
      label: 'At least one lowercase letter (a–z)',
      valid: /[a-z]/.test(password),
    },
    {
      id: 'number',
      label: 'At least one number (0–9)',
      valid: /[0-9]/.test(password),
    },
    {
      id: 'special',
      label: 'At least one special character (!@#$%^&*)',
      valid: /[^A-Za-z0-9]/.test(password),
    },
  ];

  const fulfilledCount = rules.filter((r) => r.valid).length;
  const isValid = fulfilledCount === rules.length;

  let score = 0;
  let strengthLabel: 'Weak' | 'Fair' | 'Good' | 'Strong' | '' = '';
  let strengthColor = 'bg-stone-300';

  if (!password) {
    score = 0;
    strengthLabel = '';
  } else if (fulfilledCount <= 2 || password.length < 6) {
    score = 1;
    strengthLabel = 'Weak';
    strengthColor = 'bg-rose-500';
  } else if (fulfilledCount === 3 || password.length < 8) {
    score = 2;
    strengthLabel = 'Fair';
    strengthColor = 'bg-amber-500';
  } else if (fulfilledCount === 4) {
    score = 3;
    strengthLabel = 'Good';
    strengthColor = 'bg-sky-600';
  } else {
    score = 4;
    strengthLabel = 'Strong';
    strengthColor = 'bg-emerald-600';
  }

  return {
    rules,
    isValid,
    score,
    strengthLabel,
    strengthColor,
  };
}
