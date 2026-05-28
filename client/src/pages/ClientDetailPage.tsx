import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Pencil,
  Trash2,
  MessageCircle,
  Smartphone,
  Wrench,
  DollarSign,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ClientFormDialog } from '@/components/clients/ClientFormDialog';
import { ServiceStatusBadge } from '@/components/services/ServiceStatusBadge';
import { StatCard } from '@/components/StatCard';
import { api } from '@/lib/api';
import { formatCurrency, formatDate, whatsappUrl } from '@/lib/format';
import { useToast } from '@/components/ui/toast';
import type { ClientDetail } from '@/types';

export function ClientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [client, setClient] = useState<ClientDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);

  const load = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await api<ClientDetail>(`/clients/${id}`);
      setClient(data);
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Erro ao carregar', 'error');
      navigate('/clientes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [id]);

  const handleDelete = async () => {
    if (!client || !confirm('Deseja excluir este cliente?')) return;
    try {
      await api(`/clients/${client.id}`, { method: 'DELETE' });
      toast('Cliente excluído com sucesso!');
      navigate('/clientes');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Erro ao excluir', 'error');
    }
  };

  if (loading || !client) {
    return (
      <p className="text-center py-12 text-[var(--color-muted-foreground)]">
        {loading ? 'Carregando...' : 'Cliente não encontrado'}
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <Link
        to="/clientes"
        className="inline-flex items-center gap-2 text-sm text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar para clientes
      </Link>

      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{client.name}</h1>
          <p className="text-[var(--color-muted-foreground)]">{client.phone}</p>
          {client.email && (
            <p className="text-sm text-[var(--color-muted-foreground)]">{client.email}</p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <a
            href={whatsappUrl(
              client.phone,
              `Olá ${client.name.split(' ')[0]}! Aqui é da PrimeCell. `
            )}
            target="_blank"
            rel="noreferrer"
          >
            <Button variant="accent" size="sm" className="bg-emerald-600 hover:bg-emerald-700">
              <MessageCircle className="h-4 w-4" />
              WhatsApp
            </Button>
          </a>
          <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
            <Pencil className="h-4 w-4" />
            Editar
          </Button>
          <Button variant="destructive" size="sm" onClick={handleDelete}>
            <Trash2 className="h-4 w-4" />
            Excluir
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <StatCard
          title="Total gasto"
          value={formatCurrency(client.total_spent)}
          icon={DollarSign}
          variant="success"
        />
        <StatCard
          title="Serviços realizados"
          value={String(client.services.length)}
          icon={Wrench}
          variant="accent"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Dados pessoais</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {client.cpf && (
              <p>
                <span className="text-[var(--color-muted-foreground)]">CPF: </span>
                {client.cpf}
              </p>
            )}
            {client.address && (
              <p>
                <span className="text-[var(--color-muted-foreground)]">Endereço: </span>
                {client.address}
              </p>
            )}
            {client.notes && (
              <p>
                <span className="text-[var(--color-muted-foreground)]">Observações: </span>
                {client.notes}
              </p>
            )}
            {!client.cpf && !client.address && !client.notes && (
              <p className="text-[var(--color-muted-foreground)]">Sem dados adicionais.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Smartphone className="h-5 w-5" />
              Aparelhos atendidos
            </CardTitle>
          </CardHeader>
          <CardContent>
            {client.devices.length === 0 ? (
              <p className="text-sm text-[var(--color-muted-foreground)]">Nenhum aparelho.</p>
            ) : (
              <ul className="space-y-2">
                {client.devices.map((d, i) => (
                  <li
                    key={i}
                    className="p-2 rounded-lg bg-[var(--color-muted)] text-sm"
                  >
                    {d.brand} {d.phone_model}
                    {d.color ? ` · ${d.color}` : ''}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5" />
            Histórico de serviços
          </CardTitle>
        </CardHeader>
        <CardContent>
          {client.services.length === 0 ? (
            <p className="text-sm text-[var(--color-muted-foreground)]">
              Nenhum serviço registrado para este cliente.
            </p>
          ) : (
            <ul className="space-y-3">
              {client.services.map((s) => (
                <li key={s.id}>
                  <Link
                    to={`/servicos/${s.id}`}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-4 rounded-lg border border-[var(--color-border)] hover:bg-[var(--color-muted)]/50"
                  >
                    <div>
                      <p className="font-medium">
                        {s.brand} {s.phone_model} — {s.description}
                      </p>
                      <p className="text-xs text-[var(--color-muted-foreground)]">
                        Entrada: {formatDate(s.entry_date)}
                        {s.delivery_date && ` · Entrega: ${formatDate(s.delivery_date)}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <ServiceStatusBadge status={s.status} />
                      <span className="font-semibold">{formatCurrency(s.total_charged)}</span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <ClientFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        client={client}
        onSaved={() => {
          load();
          setEditOpen(false);
        }}
      />
    </div>
  );
}
