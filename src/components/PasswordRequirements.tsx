import { analyzePassword } from '../lib/passwordValidation';

interface PasswordRequirementsProps {
  password: string;
}

/**
 * Clean, professional password strength and requirements checklist.
 * Follows industry standards (GitHub/Stripe/Linear) with understated typography.
 */
export default function PasswordRequirements({ password }: PasswordRequirementsProps) {
  if (!password) {
    return null;
  }

  const analysis = analyzePassword(password);

  return (
    <div className="w-full mt-2 text-left animate-fade-in-up">
      {/* 4-Segment Strength Bar */}
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[11px] font-medium text-stone-500">Password strength:</span>
        {analysis.strengthLabel && (
          <span
            className={`text-[11px] font-semibold ${
              analysis.score === 1
                ? 'text-rose-600'
                : analysis.score === 2
                  ? 'text-amber-600'
                  : analysis.score === 3
                    ? 'text-sky-600'
                    : 'text-emerald-700'
            }`}
          >
            {analysis.strengthLabel}
          </span>
        )}
      </div>

      <div className="flex gap-1.5 w-full mb-2.5" aria-hidden="true">
        {[1, 2, 3, 4].map((step) => (
          <div
            key={step}
            className={`h-1 flex-1 rounded-full transition-colors duration-200 ${
              analysis.score >= step ? analysis.strengthColor : 'bg-stone-200'
            }`}
          />
        ))}
      </div>

      {/* Rules Checklist */}
      <ul className="space-y-1 text-[11px] text-stone-500">
        {analysis.rules.map((rule) => (
          <li
            key={rule.id}
            className={`flex items-center gap-1.5 transition-colors duration-150 ${
              rule.valid ? 'text-emerald-700 font-medium' : 'text-stone-500'
            }`}
          >
            <span
              className={`inline-flex items-center justify-center w-3.5 text-xs shrink-0 select-none ${
                rule.valid ? 'text-emerald-600 font-bold' : 'text-stone-400'
              }`}
            >
              {rule.valid ? '✓' : '•'}
            </span>
            <span>{rule.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
