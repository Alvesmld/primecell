import { type LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string;
  icon: LucideIcon;
  trend?: string;
  variant?: 'default' | 'accent' | 'success' | 'warning';
}

const variants = {
  default: 'bg-[var(--color-primary)]/10 text-[var(--color-primary)]',
  accent: 'bg-[var(--color-accent)]/15 text-[var(--color-accent)]',
  success: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
  warning: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
};

export function StatCard({ title, value, icon: Icon, trend, variant = 'default' }: StatCardProps) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-[var(--color-muted-foreground)]">{title}</p>
            <p className="mt-2 text-2xl font-bold">{value}</p>
            {trend && (
              <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">{trend}</p>
            )}
          </div>
          <div className={cn('rounded-xl p-3', variants[variant])}>
            <Icon className="h-6 w-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
