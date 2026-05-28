export function getMonthRange(year: number, month: number) {
  const start = `${year}-${String(month).padStart(2, '0')}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const end = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  return { start, end };
}

export function getCurrentMonthRange() {
  const now = new Date();
  return getMonthRange(now.getFullYear(), now.getMonth() + 1);
}

export function parsePeriod(period?: string, start?: string, end?: string) {
  const today = new Date();
  const y = today.getFullYear();
  const m = today.getMonth();
  const pad = (n: number) => String(n).padStart(2, '0');
  const fmt = (d: Date) =>
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

  switch (period) {
    case 'hoje':
      return { start: fmt(today), end: fmt(today) };
    case 'semana': {
      const startDate = new Date(today);
      startDate.setDate(today.getDate() - today.getDay());
      return { start: fmt(startDate), end: fmt(today) };
    }
    case 'ano':
      return { start: `${y}-01-01`, end: `${y}-12-31` };
    case 'personalizado':
      if (start && end) return { start, end };
      return getCurrentMonthRange();
    case 'mes':
    default:
      return getCurrentMonthRange();
  }
}

export function lastNMonths(n: number): { label: string; year: number; month: number }[] {
  const result: { label: string; year: number; month: number }[] = [];
  const now = new Date();
  const months = [
    'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
    'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez',
  ];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    result.push({
      label: `${months[d.getMonth()]}/${String(d.getFullYear()).slice(2)}`,
      year: d.getFullYear(),
      month: d.getMonth() + 1,
    });
  }
  return result;
}
