import { Smartphone, Wrench } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  className?: string;
}

export function Logo({ size = 'md', showText = true, className }: LogoProps) {
  const iconSize = size === 'sm' ? 20 : size === 'lg' ? 32 : 24;
  const textSize = size === 'sm' ? 'text-base' : size === 'lg' ? 'text-2xl' : 'text-xl';

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className="relative flex items-center justify-center rounded-xl bg-[var(--color-accent)] p-2 text-[var(--color-accent-foreground)]">
        <Smartphone size={iconSize} />
        <Wrench
          size={iconSize * 0.45}
          className="absolute -bottom-0.5 -right-0.5 rounded-full bg-[var(--color-primary)] p-0.5 text-white"
        />
      </div>
      {showText && (
        <div>
          <span className={cn('font-bold tracking-tight', textSize)}>PrimeCell</span>
          {size !== 'sm' && (
            <p className="text-xs text-[var(--color-muted-foreground)] leading-none">
              Assistência Técnica
            </p>
          )}
        </div>
      )}
    </div>
  );
}
