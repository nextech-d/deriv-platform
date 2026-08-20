export function BrandMark() {
  return (
    <svg className="tc-brand-mark" viewBox="0 0 32 32" aria-hidden>
      <rect width="32" height="32" rx="6" fill="#0B1220" />
      <path d="M5 26.5h22" stroke="#1e293b" strokeWidth="1" />
      <rect x="6" y="16.5" width="4" height="10" rx="0.5" fill="#94A3B8" />
      <rect x="11.2" y="11" width="4" height="15.5" rx="0.5" fill="#E2E8F0" />
      <rect x="16.4" y="14.5" width="4" height="12" rx="0.5" fill="#CBD5E1" />
      <rect x="21.6" y="7" width="4" height="19.5" rx="0.5" fill="#2DD4BF" />
    </svg>
  );
}

export function BrandWord() {
  return (
    <span className="tc-brand-word">
      <span className="tc-brand-trade">Trade</span>
      <span className="tc-brand-city">City</span>
    </span>
  );
}
