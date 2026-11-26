import Image from "next/image";

export function buildCustomerSplashBackground(
  primary: string,
  accent: string,
  splashBase: string | null | undefined,
): string {
  const base = splashBase?.trim() || null;
  if (base) {
    return `radial-gradient(ellipse 90% 56% at 50% -8%, ${accent}40 0%, transparent 55%),
       radial-gradient(ellipse 70% 40% at 50% 108%, ${accent}28 0%, transparent 52%),
       linear-gradient(168deg, ${base} 0%, ${primary} 52%, ${base} 100%)`;
  }
  return `radial-gradient(ellipse 95% 58% at 50% -10%, ${accent}4d 0%, transparent 58%),
       radial-gradient(ellipse 75% 42% at 50% 115%, ${accent}33 0%, transparent 52%),
       linear-gradient(168deg, ${primary} 0%, ${primary} 46%, #120208 100%)`;
}

export function CustomerSplashLogo({
  logoSrc,
  accent,
  primary,
  fallbackLetter,
  loading,
}: {
  logoSrc: string | null;
  accent: string;
  primary: string;
  fallbackLetter: string;
  loading?: boolean;
}) {
  return (
    <div className="mb-8 flex min-h-[7.5rem] w-full items-center justify-center">
      {logoSrc ? (
        <Image
          src={logoSrc}
          alt=""
          width={512}
          height={512}
          unoptimized
          priority
          className="h-auto max-h-[9.75rem] w-auto max-w-[min(82vw,16rem)] rounded-[1.35rem] object-contain"
          style={{
            boxShadow: `0 28px 56px -26px rgba(0,0,0,0.48), 0 0 0 1px ${accent}44`,
          }}
        />
      ) : loading ? (
        <span className="size-10 animate-pulse rounded-full bg-white/15" />
      ) : (
        <span
          className="grid size-[7.5rem] place-items-center rounded-[1.35rem] font-serif text-4xl font-semibold tracking-tight text-white"
          style={{ background: `linear-gradient(155deg, ${primary}, ${accent})` }}
        >
          {fallbackLetter}
        </span>
      )}
    </div>
  );
}

export function CustomerSplashFiligree({ accent, className }: { accent: string; className?: string }) {
  return (
    <svg aria-hidden className={className} viewBox="0 0 80 80" fill="none">
      <path d="M4 30V4h26" stroke={accent} strokeWidth="1.2" />
      <path d="M4 16V8h8" stroke={accent} strokeWidth="1.1" opacity="0.55" />
      <circle cx="8" cy="8" r="1.55" fill={accent} />
    </svg>
  );
}