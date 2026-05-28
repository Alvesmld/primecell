import { STATUS_LABELS, STATUS_COLORS } from '@/lib/format';
import { cn } from '@/lib/utils';

export function ServiceStatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        'text-xs px-2 py-1 rounded-full font-medium whitespace-nowrap',
        STATUS_COLORS[status] || STATUS_COLORS.em_andamento
      )}
    >
      {STATUS_LABELS[status] || status}
    </span>
  );
}
