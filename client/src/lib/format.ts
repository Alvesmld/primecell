export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value ?? 0);
}

export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  const [y, m, d] = dateStr.split('T')[0].split('-');
  if (!y || !m || !d) return dateStr;
  return `${d}/${m}/${y}`;
}

export function toInputDate(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export const STATUS_LABELS: Record<string, string> = {
  em_andamento: 'Em andamento',
  concluido: 'Concluído',
  entregue: 'Entregue',
  cancelado: 'Cancelado',
};

export const EXPENSE_CATEGORIES: Record<string, string> = {
  pecas: 'Peças',
  contas: 'Contas',
  despesas: 'Despesas gerais',
  outros: 'Outros',
};

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  dinheiro: 'Dinheiro',
  pix: 'Pix',
  debito: 'Débito',
  credito: 'Crédito',
  transferencia: 'Transferência',
};

export const INSTALLMENT_STATUS_LABELS: Record<string, string> = {
  pago: 'Pago',
  pendente: 'Pendente',
};

export const WARRANTY_OPTIONS = [
  { value: 30, label: '30 dias' },
  { value: 60, label: '60 dias' },
  { value: 90, label: '90 dias' },
  { value: 'custom', label: 'Personalizado' },
] as const;

export function calcWarrantyEndDate(startDate: string, days: number): string {
  const d = new Date(startDate + 'T12:00:00');
  d.setDate(d.getDate() + days);
  return toInputDate(d);
}

export function whatsappUrl(phone: string, message?: string): string {
  let digits = phone.replace(/\D/g, '');
  if (digits.length <= 11 && !digits.startsWith('55')) {
    digits = `55${digits}`;
  }
  const base = `https://wa.me/${digits}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}

export const STATUS_COLORS: Record<string, string> = {
  em_andamento: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  concluido: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
  entregue: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
  cancelado: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
};
