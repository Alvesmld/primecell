import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ServiceFormDialog } from '@/components/services/ServiceFormDialog';
import { ServiceStatusBadge } from '@/components/services/ServiceStatusBadge';
import { api } from '@/lib/api';
import { formatCurrency, formatDate, STATUS_LABELS } from '@/lib/format';
import { useToast } from '@/components/ui/toast';
import type { ServiceListItem } from '@/types';

const PERIOD_OPTIONS = [
  { value: '', label: 'Todos os períodos' },
  { value: 'hoje', label: 'Hoje' },
  { value: 'semana', label: 'Esta semana' },
  { value: 'mes', label: 'Este mês' },
  { value: 'ano', label: 'Este ano' },
];

export function ServicesPage() {
  const { toast } = useToast();
  const [services, setServices] = useState<ServiceListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [period, setPeriod] = useState('mes');
  const [formOpen, setFormOpen] = useState(false);

  const loadServices = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('q', search);
      if (status) params.set('status', status);
      if (period) params.set('period', period);
      const data = await api<ServiceListItem[]>(`/services?${params}`);
      setServices(data);
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Erro ao carregar', 'error');
    } finally {
      setLoading(false);
    }
  }, [search, status, period, toast]);

  useEffect(() => {
    const t = setTimeout(loadServices, 300);
    return () => clearTimeout(t);
  }, [loadServices]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Serviços</h1>
          <p className="text-[var(--color-muted-foreground)] mt-1">
            Ordens de serviço e garantias
          </p>
        </div>
        <Button variant="accent" onClick={() => setFormOpen(true)}>
          <Plus className="h-4 w-4" />
          Novo Serviço
        </Button>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2 sm:col-span-1">
              <Label>Buscar</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--color-muted-foreground)]" />
                <Input
                  className="pl-10"
                  placeholder="Cliente, aparelho, descrição..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={status || 'all'} onValueChange={(v) => setStatus(v === 'all' ? '' : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {Object.entries(STATUS_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>
                      {v}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Período</Label>
              <Select
                value={period || 'all'}
                onValueChange={(v) => setPeriod(v === 'all' ? '' : v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PERIOD_OPTIONS.map((o) => (
                    <SelectItem key={o.value || 'all'} value={o.value || 'all'}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            {loading ? 'Carregando...' : `${services.length} serviço(s)`}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {services.length === 0 && !loading ? (
            <p className="p-6 text-sm text-[var(--color-muted-foreground)] text-center">
              Nenhum serviço encontrado.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--color-border)] bg-[var(--color-muted)]">
                    <th className="text-left p-4 font-medium">Cliente</th>
                    <th className="text-left p-4 font-medium hidden md:table-cell">Aparelho</th>
                    <th className="text-left p-4 font-medium hidden lg:table-cell">Descrição</th>
                    <th className="text-left p-4 font-medium">Entrada</th>
                    <th className="text-left p-4 font-medium">Status</th>
                    <th className="text-right p-4 font-medium">Valor</th>
                    <th className="p-4 w-12" />
                  </tr>
                </thead>
                <tbody>
                  {services.map((s) => (
                    <tr
                      key={s.id}
                      className="border-b border-[var(--color-border)] hover:bg-[var(--color-muted)]/50"
                    >
                      <td className="p-4">
                        <p className="font-medium">{s.client_name}</p>
                        <p className="text-xs text-[var(--color-muted-foreground)] md:hidden">
                          {s.brand} {s.phone_model}
                        </p>
                      </td>
                      <td className="p-4 hidden md:table-cell">
                        {s.brand} {s.phone_model}
                      </td>
                      <td className="p-4 hidden lg:table-cell max-w-[200px] truncate">
                        {s.description}
                      </td>
                      <td className="p-4 whitespace-nowrap">{formatDate(s.entry_date)}</td>
                      <td className="p-4">
                        <ServiceStatusBadge status={s.status} />
                      </td>
                      <td className="p-4 text-right font-semibold">
                        {formatCurrency(s.total_charged)}
                      </td>
                      <td className="p-4">
                        <Link
                          to={`/servicos/${s.id}`}
                          className="inline-flex p-2 rounded-lg hover:bg-[var(--color-muted)] text-[var(--color-accent)]"
                          title="Ver detalhes"
                        >
                          <Eye className="h-4 w-4" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <ServiceFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        onSaved={() => loadServices()}
      />
    </div>
  );
}
