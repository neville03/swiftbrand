// Clean icon + wordmark logo. No external image file required, so it never
// looks blurry/mismatched at different sizes and never breaks if logo.png
// goes missing.
import { Zap } from "lucide-react";

export function Logo({ size = 28, showWordmark = true }: { size?: number; showWordmark?: boolean }) {
  const iconBox = Math.round(size * 1.15);
  return (
    <span className="inline-flex items-center gap-2 select-none">
      <span
        className="flex items-center justify-center rounded-lg bg-gradient-to-br from-brand to-brand-dark text-white shrink-0"
        style={{ width: iconBox, height: iconBox }}
      >
        <Zap size={Math.round(iconBox * 0.6)} strokeWidth={2.5} fill="currentColor" />
      </span>
      {showWordmark && (
        <span className="font-display font-bold text-slate-900 tracking-tight" style={{ fontSize: size * 0.62 }}>
          Swift<span className="text-brand">Brand</span>
        </span>
      )}
    </span>
  );
}
