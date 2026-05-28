import { useEffect, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Wrench, DollarSign, TrendingUp, Wallet, Shield } from 'lucide-react';
import { StatCard } from '@/components/StatCard';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { api } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/format';
import type { DashboardData } from '@/types';
import { ServiceStatusBadge } from '@/components/services/ServiceStatusBadge';
import { Link } from 'react-router-dom';

export function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<DashboardData>('/dashboard')
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-[var(--color-muted-foreground)]">Carregando dashboard...</p>
      </div>
    );
  }

  if (!data) return null;

  const { summary, chartData, recentServices, upcomingWarranties } = data;
  const monthName = new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">Dashboard</h1>
        <p className="text-[var(--color-muted-foreground)] mt-1">
          Visão geral — {monthName.charAt(0).toUpperCase() + monthName.slice(1)}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          title="Serviços do mês"
          value={String(summary.servicesCount)}
          icon={Wrench}
          variant="accent"
        />
        <StatCard
          title="Faturamento do mês"
          value={formatCurrency(summary.revenue)}
          icon={DollarSign}
        />
        <StatCard
          title="Lucro líquido do mês"
          value={formatCurrency(summary.netProfit)}
          icon={TrendingUp}
          variant="success"
        />
        <StatCard
          title="Saldo em caixa"
          value={formatCurrency(summary.cashBalance)}
          icon={Wallet}
          variant="warning"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Ganhos vs Gastos</CardTitle>
          <CardDescription>Últimos 6 meses</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-72 w-full min-h-[288px] min-w-0">
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <BarChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis
                  tick={{ fontSize: 12 }}
                  tickFormatter={(v) =>
                    new Intl.NumberFormat('pt-BR', {
                      notation: 'compact',
                      compactDisplay: 'short',
                    }).format(v)
                  }
                />
                <Tooltip
                  formatter={(value) => formatCurrency(Number(value))}
                  labelStyle={{ color: '#0f172a' }}
                />
                <Legend />
                <Bar dataKey="ganhos" name="Ganhos" fill="#06b6d4" radius={[4, 4, 0, 0]} />
                <Bar dataKey="gastos" name="Gastos" fill="#0c4a6e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Últimos serviços</CardTitle>
            <CardDescription>5 serviços mais recentes</CardDescription>
          </CardHeader>
          <CardContent>
            {recentServices.length === 0 ? (
              <p className="text-sm text-[var(--color-muted-foreground)]">Nenhum serviço registrado.</p>
            ) : (
              <ul className="space-y-3">
                {recentServices.map((s) => (
                  <li key={s.id}>
                    <Link
                      to={`/servicos/${s.id}`}
                      className="flex items-center justify-between gap-3 p-3 rounded-lg bg-[var(--color-muted)] hover:opacity-90 transition-opacity"
                    >
                      <div className="min-w-0">
                        <p className="font-medium truncate">{s.client_name}</p>
                        <p className="text-sm text-[var(--color-muted-foreground)] truncate">
                          {s.brand} {s.phone_model} — {s.description}
                        </p>
                        <p className="text-xs text-[var(--color-muted-foreground)]">
                          {formatDate(s.entry_date)}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <ServiceStatusBadge status={s.status} />
                        <p className="mt-1 text-sm font-semibold">
                          {formatCurrency(s.total_charged)}
                        </p>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-[var(--color-accent)]" />
              Vencimentos de garantia
            </CardTitle>
            <CardDescription>Próximas garantias a vencer</CardDescription>
          </CardHeader>
          <CardContent>
            {upcomingWarranties.length === 0 ? (
              <p className="text-sm text-[var(--color-muted-foreground)]">
                Nenhuma garantia ativa no momento.
              </p>
            ) : (
              <ul className="space-y-3">
                {upcomingWarranties.slice(0, 5).map((w) => (
                  <li
                    key={w.id}
                    className="flex items-center justify-between gap-3 p-3 rounded-lg border border-[var(--color-border)]"
                  >
                    <div>
                      <p className="font-medium">{w.client_name}</p>
                      <p className="text-sm text-[var(--color-muted-foreground)]">
                        {w.brand} {w.phone_model}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-semibold text-[var(--color-accent)]">
                        {formatDate(w.warranty_end)}
                      </p>
                      <p className="text-xs text-[var(--color-muted-foreground)]">vencimento</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
