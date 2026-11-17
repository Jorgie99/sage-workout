/** The app mark: a timer ring with a small sage sprig. Matches public/favicon.svg. */
export function Logo({ size = 64 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" role="img" aria-label="Sage">
      <circle cx="32" cy="32" r="24" stroke="#D5CBBD" strokeWidth="2.5" />
      <path d="M32 8a24 24 0 1 1-20.8 12" stroke="#6F8466" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M32 44V27" stroke="#6F8466" strokeWidth="2" strokeLinecap="round" />
      <path d="M32 33c-5.5 0-8.5-3-9-8 5 0 8.5 2.5 9 8Z" fill="#9CAF94" />
      <path d="M32 29c5.5 0 8.5-3 9-8-5 0-8.5 2.5-9 8Z" fill="#9CAF94" />
    </svg>
  );
}
