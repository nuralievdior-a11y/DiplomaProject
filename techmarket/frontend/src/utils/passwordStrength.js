const COMMON_PASSWORD_PARTS = [
  'password',
  'qwerty',
  'admin',
  'welcome',
  'letmein',
  'iloveyou',
  '1234',
  '12345',
  '123456',
  '1234567',
  '12345678',
];

export function getPasswordStrength(password) {
  if (!password) {
    return {
      score: 0,
      label: '',
      percent: 0,
      textClass: 'text-neutral-400',
      barClass: 'bg-neutral-200',
      hints: [],
    };
  }

  const tooShort = password.length < 6;
  if (tooShort) {
    return {
      score: 0,
      label: 'Too short',
      percent: 10,
      textClass: 'text-red-600',
      barClass: 'bg-red-500',
      hints: ['Use at least 6 characters'],
    };
  }

  const hasLower = /[a-z]/.test(password);
  const hasUpper = /[A-Z]/.test(password);
  const hasDigit = /\d/.test(password);
  const hasSymbol = /[^a-zA-Z0-9]/.test(password);

  const varietyCount = [hasLower, hasUpper, hasDigit, hasSymbol].filter(Boolean).length;

  let score = 0;
  if (password.length >= 6) score += 1;
  if (password.length >= 10) score += 1;
  if (varietyCount >= 2) score += 1;
  if (varietyCount >= 3) score += 1;

  const lower = password.toLowerCase();
  const hasCommonPart = COMMON_PASSWORD_PARTS.some(part => lower.includes(part));
  const hasTripleRepeat = /(.)\1\1/.test(password);
  const hasSimpleSequence = /(0123|1234|2345|3456|4567|5678|6789|abcd|qwer)/.test(lower);

  if (hasCommonPart) score -= 1;
  if (hasTripleRepeat) score -= 1;
  if (hasSimpleSequence) score -= 1;

  score = Math.max(0, Math.min(4, score));

  const hints = [];
  if (password.length < 10) hints.push('Use 10+ characters');
  if (!hasUpper) hints.push('Add an uppercase letter');
  if (!hasLower) hints.push('Add a lowercase letter');
  if (!hasDigit) hints.push('Add a number');
  if (!hasSymbol) hints.push('Add a symbol (e.g. !@#)');
  if (hasCommonPart || hasSimpleSequence) hints.push('Avoid common words/sequences');
  if (hasTripleRepeat) hints.push('Avoid repeated characters');

  const meta = {
    0: { label: 'Weak', percent: 25, textClass: 'text-red-600', barClass: 'bg-red-500' },
    1: { label: 'Weak', percent: 25, textClass: 'text-red-600', barClass: 'bg-red-500' },
    2: { label: 'Okay', percent: 50, textClass: 'text-amber-600', barClass: 'bg-amber-500' },
    3: { label: 'Good', percent: 75, textClass: 'text-lime-600', barClass: 'bg-lime-500' },
    4: { label: 'Strong', percent: 100, textClass: 'text-emerald-600', barClass: 'bg-emerald-500' },
  };

  return { score, hints, ...meta[score] };
}
