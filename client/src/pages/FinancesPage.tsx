import { useCallback, useEffect, useState } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import {
  TrendingDown,
  TrendingUp,
  Wallet,
  PiggyBank,
  Plus,
  FileDown,
  Trash2,
} from 'lucide-react';
import { StatCard } from '@/components/StatCard';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { api } from '@/lib/api';
import {
  formatCurrency,
  formatDate,
  EXPENSE_CATEGORIES,
  toInputDate,
} from '@/lib/format';
import { exportFinanceReport } from '@/lib/pdf';
import { useToast } from '@/components/ui/toast';
import type { FinancesData } from '@/types';

const PIE_COLORS = ['#0c4a6e', '#06b6d4', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444'];

const PERIOD_OPTIONS = [
  { value: 'hoje', label: 'Hoje' },
  { value: 'semana', label: 'Esta semana' },
  { value: 'mes', label: 'Este mês' },
  { value: 'ano', label: 'Este ano' },
  { value: 'personalizado', label: 'Personalizado' },
];

export function FinancesPage() {
  const { toast } = useToast();
  const [data, setData] = useState<FinancesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('mes');
  const [customStart, setCustomStart] = useState(toInputDate());
  const [customEnd, setCustomEnd] = useState(toInputDate());

  const [expenseOpen, setExpenseOpen] = useState(false);
  const [revenueOpen, setRevenueOpen] = useState(false);
  const [expenseForm, setExpenseForm] = useState({
    description: '',
    amount: '',
    date: toInputDate(),
    category: 'pecas',
  });
  const [revenueForm, setRevenueForm] = useState({
    description: '',
    amount: '',
    date: toInputDate(),
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ period });
      if (period === 'personalizado') {
        params.set('start', customStart);
        params.set('end', customEnd);
      }
      const result = await api<FinancesData>(`/finances?${params}`);
      setData(result);
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Erro ao carregar finanças', 'error');
    } finally {
      setLoading(false);
    }
  }, [period, customStart, customEnd, toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseForm.description || !expenseForm.amount) {
      toast('Preencha todos os campos', 'error');
      return;
    }
    try {
      await api('/finances/expenses', {
        method: 'POST',
        body: JSON.stringify({
          ...expenseForm,
          amount: parseFloat(expenseForm.amount),
        }),
      });
      toast('Gasto adicionado com sucesso!');
      setExpenseOpen(false);
      setExpenseForm({ description: '', amount: '', date: toInputDate(), category: 'pecas' });
      loadData();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Erro ao salvar', 'error');
    }
  };

  const handleAddRevenue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!revenueForm.description || !revenueForm.amount) {
      toast('Preencha todos os campos', 'error');
      return;
    }
    try {
      await api('/finances/revenues', {
        method: 'POST',
        body: JSON.stringify({
          ...revenueForm,
          amount: parseFloat(revenueForm.amount),
        }),
      });
      toast('Receita adicionada com sucesso!');
      setRevenueOpen(false);
      setRevenueForm({ description: '', amount: '', date: toInputDate() });
      loadData();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Erro ao salvar', 'error');
    }
  };

  const handleDeleteExpense = async (id: number) => {
    if (!confirm('Deseja excluir este gasto?')) return;
    try {
      await api(`/finances/expenses/${id}`, { method: 'DELETE' });
      toast('Gasto excluído com sucesso!');
      loadData();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Erro ao excluir', 'error');
    }
  };

  const handleDeleteRevenue = async (id: number) => {
    if (!confirm('Deseja excluir esta receita?')) return;
    try {
      await api(`/finances/revenues/${id}`, { method: 'DELETE' });
      toast('Receita excluída com sucesso!');
      loadData();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Erro ao excluir', 'error');
    }
  };

  const handleExportPdf = () => {
    if (!data) return;
    exportFinanceReport({
      period: data.period,
      summary: data.summary,
      expensesList: data.expensesList,
      revenuesList: data.revenuesList,
    });
    toast('Relatório PDF gerado!');
  };

  const pieData =
    data?.expensesByCategory.map((e) => ({
      name: EXPENSE_CATEGORIES[e.category] || e.category,
      value: e.total,
    })) ?? [];

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Finanças</h1>
          <p className="text-[var(--color-muted-foreground)] mt-1">
            Controle de gastos, receitas e lucro
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setExpenseOpen(true)}>
            <Plus className="h-4 w-4" />
            Adicionar Gasto
          </Button>
          <Button variant="accent" onClick={() => setRevenueOpen(true)}>
            <Plus className="h-4 w-4" />
            Receita Avulsa
          </Button>
          <Button variant="outline" onClick={handleExportPdf} disabled={!data}>
            <FileDown className="h-4 w-4" />
            Exportar PDF
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4 items-end">
            <div className="flex-1 space-y-2">
              <Label>Período</Label>
              <Select value={period} onValueChange={setPeriod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PERIOD_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {period === 'personalizado' && (
              <>
                <div className="space-y-2">
                  <Label>De</Label>
                  <Input
                    type="date"
                    value={customStart}
                    onChange={(e) => setCustomStart(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Até</Label>
                  <Input
                    type="date"
                    value={customEnd}
                    onChange={(e) => setCustomEnd(e.target.value)}
                  />
                </div>
              </>
            )}
            {data && (
              <p className="text-sm text-[var(--color-muted-foreground)] pb-2">
                {formatDate(data.period.start)} — {formatDate(data.period.end)}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <p className="text-center py-12 text-[var(--color-muted-foreground)]">Carregando...</p>
      ) : data ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <StatCard
              title="Gastos totais"
              value={formatCurrency(data.summary.totalExpenses)}
              icon={TrendingDown}
              variant="warning"
            />
            <StatCard
              title="Ganho bruto"
              value={formatCurrency(data.summary.grossRevenue)}
              icon={TrendingUp}
            />
            <StatCard
              title="Lucro líquido"
              value={formatCurrency(data.summary.netProfit)}
              icon={PiggyBank}
              variant="success"
            />
            <StatCard
              title="Saldo em caixa"
              value={formatCurrency(data.summary.cashBalance)}
              icon={Wallet}
              variant="accent"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Gastos por categoria</CardTitle>
                <CardDescription>Distribuição no período selecionado</CardDescription>
              </CardHeader>
              <CardContent>
                {pieData.length === 0 ? (
                  <p className="text-sm text-[var(--color-muted-foreground)] text-center py-12">
                    Sem gastos no período
                  </p>
                ) : (
                  <div className="h-64 min-h-[256px] min-w-0">
                    <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={80}
                          paddingAngle={3}
                          dataKey="value"
                          label={({ name, percent }) =>
                            `${name} ${((percent ?? 0) * 100).toFixed(0)}%`
                          }
                        >
                          {pieData.map((_, i) => (
                            <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(v) => formatCurrency(Number(v))} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Evolução do lucro</CardTitle>
                <CardDescription>Últimos 6 meses</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64 min-h-[256px] min-w-0">
                  <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                    <LineChart data={data.profitEvolution}>
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
                      <Tooltip formatter={(v) => formatCurrency(Number(v))} />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="lucro"
                        name="Lucro"
                        stroke="#06b6d4"
                        strokeWidth={2}
                        dot={{ fill: '#0c4a6e' }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Gastos registrados</CardTitle>
              </CardHeader>
              <CardContent>
                {data.expensesList.length === 0 ? (
                  <p className="text-sm text-[var(--color-muted-foreground)]">Nenhum gasto.</p>
                ) : (
                  <ul className="space-y-2">
                    {data.expensesList.map((e) => (
                      <li
                        key={e.id}
                        className="flex items-center justify-between p-3 rounded-lg bg-[var(--color-muted)]"
                      >
                        <div>
                          <p className="font-medium">{e.description}</p>
                          <p className="text-xs text-[var(--color-muted-foreground)]">
                            {EXPENSE_CATEGORIES[e.category] || e.category} · {formatDate(e.date)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-red-600 dark:text-red-400">
                            -{formatCurrency(e.amount)}
                          </span>
                          <button
                            onClick={() => handleDeleteExpense(e.id)}
                            className="p-1 text-[var(--color-muted-foreground)] hover:text-red-500"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Receitas avulsas</CardTitle>
              </CardHeader>
              <CardContent>
                {data.revenuesList.length === 0 ? (
                  <p className="text-sm text-[var(--color-muted-foreground)]">Nenhuma receita avulsa.</p>
                ) : (
                  <ul className="space-y-2">
                    {data.revenuesList.map((r) => (
                      <li
                        key={r.id}
                        className="flex items-center justify-between p-3 rounded-lg bg-[var(--color-muted)]"
                      >
                        <div>
                          <p className="font-medium">{r.description}</p>
                          <p className="text-xs text-[var(--color-muted-foreground)]">
                            {formatDate(r.date)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                            +{formatCurrency(r.amount)}
                          </span>
                          <button
                            onClick={() => handleDeleteRevenue(r.id)}
                            className="p-1 text-[var(--color-muted-foreground)] hover:text-red-500"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      ) : null}

      <Dialog open={expenseOpen} onOpenChange={setExpenseOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Gasto</DialogTitle>
            <DialogDescription>Registre uma despesa da loja</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddExpense} className="space-y-4">
            <div className="space-y-2">
              <Label>Descrição *</Label>
              <Input
                value={expenseForm.description}
                onChange={(e) =>
                  setExpenseForm((f) => ({ ...f, description: e.target.value }))
                }
                placeholder="Ex: Peças iPhone"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Valor (R$) *</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={expenseForm.amount}
                  onChange={(e) => setExpenseForm((f) => ({ ...f, amount: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Data *</Label>
                <Input
                  type="date"
                  value={expenseForm.date}
                  onChange={(e) => setExpenseForm((f) => ({ ...f, date: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Categoria *</Label>
              <Select
                value={expenseForm.category}
                onValueChange={(v) => setExpenseForm((f) => ({ ...f, category: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(EXPENSE_CATEGORIES).map(([k, v]) => (
                    <SelectItem key={k} value={k}>
                      {v}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" className="w-full" variant="accent">
              Salvar gasto
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={revenueOpen} onOpenChange={setRevenueOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Receita Avulsa</DialogTitle>
            <DialogDescription>Receita fora dos serviços cadastrados</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddRevenue} className="space-y-4">
            <div className="space-y-2">
              <Label>Descrição *</Label>
              <Input
                value={revenueForm.description}
                onChange={(e) =>
                  setRevenueForm((f) => ({ ...f, description: e.target.value }))
                }
                placeholder="Ex: Venda de acessório"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Valor (R$) *</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={revenueForm.amount}
                  onChange={(e) => setRevenueForm((f) => ({ ...f, amount: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Data *</Label>
                <Input
                  type="date"
                  value={revenueForm.date}
                  onChange={(e) => setRevenueForm((f) => ({ ...f, date: e.target.value }))}
                />
              </div>
            </div>
            <Button type="submit" className="w-full" variant="accent">
              Salvar receita
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
