import { Sprout } from 'lucide-react';

export function Logo({ light = false }: { light?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <span className="relative flex h-9 w-9 items-center justify-center rounded-2xl bg-ink text-lime shadow-[0_8px_20px_-8px_rgba(20,38,28,0.7)]">
        <Sprout className="h-[18px] w-[18px]" strokeWidth={2.25} />
      </span>
      <span className={`leading-none ${light ? 'text-white' : 'text-ink'}`}>
        <span className="block font-display text-[17px] font-semibold tracking-tight">
          Grow Business
        </span>
        <span className={`mt-0.5 block text-[10px] font-semibold uppercase tracking-[0.18em] ${light ? 'text-lime' : 'text-leaf'}`}>
          AI
        </span>
      </span>
    </span>
  );
}
