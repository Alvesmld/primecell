export function calcProfit(totalCharged: number, partCost: number): number {
  return Math.round((totalCharged - partCost) * 100) / 100;
}

export function formatDateISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function calcWarrantyEnd(startDate: string, days: number): string {
  const d = new Date(startDate + 'T12:00:00');
  d.setDate(d.getDate() + days);
  return formatDateISO(d);
}

export function resolveWarrantyDates(
  status: string,
  warrantyDays: number,
  entryDate: string | null,
  deliveryDate: string | null,
  existingStart?: string | null
): { warranty_start: string | null; warranty_end: string | null } {
  if (status !== 'concluido' && status !== 'entregue') {
    return { warranty_start: null, warranty_end: null };
  }
  const start = existingStart || deliveryDate || entryDate || formatDateISO(new Date());
  return {
    warranty_start: start,
    warranty_end: calcWarrantyEnd(start, warrantyDays || 30),
  };
}
