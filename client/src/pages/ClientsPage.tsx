import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Eye, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ClientFormDialog } from '@/components/clients/ClientFormDialog';
import { api } from '@/lib/api';
import { formatCurrency, whatsappUrl } from '@/lib/format';
import { useToast } from '@/components/ui/toast';
import type { ClientListItem } from '@/types';

export function ClientsPage() {
  const { toast } = useToast();
  const [clients, setClients] = useState<ClientListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);

  const loadClients = useCallback(async () => {
    setLoading(true);
    try {
      const params = search ? `?q=${encodeURIComponent(search)}` : '';
      const data = await api<ClientListItem[]>(`/clients${params}`);
      setClients(data);
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Erro ao carregar', 'error');
    } finally {
      setLoading(false);
    }
  }, [search, toast]);

  useEffect(() => {
    const t = setTimeout(loadClients, 300);
    return () => clearTimeout(t);
  }, [loadClients]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Clientes</h1>
          <p className="text-[var(--color-muted-foreground)] mt-1">
            Cadastro e histórico de atendimentos
          </p>
        </div>
        <Button variant="accent" onClick={() => setFormOpen(true)}>
          <Plus className="h-4 w-4" />
          Adicionar Cliente
        </Button>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="space-y-2 max-w-md">
            <Label>Buscar por nome ou telefone</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--color-muted-foreground)]" />
              <Input
                className="pl-10"
                placeholder="Nome, telefone ou CPF..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            {loading ? 'Carregando...' : `${clients.length} cliente(s)`}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {clients.length === 0 && !loading ? (
            <p className="p-6 text-sm text-center text-[var(--color-muted-foreground)]">
              Nenhum cliente encontrado.
            </p>
          ) : (
            <div className="divide-y divide-[var(--color-border)]">
              {clients.map((c) => (
                <div
                  key={c.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 hover:bg-[var(--color-muted)]/50"
                >
                  <div className="min-w-0">
                    <p className="font-semibold">{c.name}</p>
                    <p className="text-sm text-[var(--color-muted-foreground)]">{c.phone}</p>
                    <p className="text-xs text-[var(--color-muted-foreground)] mt-1">
                      {c.services_count} serviço(s) · Total: {formatCurrency(c.total_spent)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <a
                      href={whatsappUrl(
                        c.phone,
                        `Olá ${c.name.split(' ')[0]}! Aqui é da PrimeCell. `
                      )}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium bg-emerald-600 text-white hover:bg-emerald-700"
                    >
                      <MessageCircle className="h-4 w-4" />
                      WhatsApp
                    </a>
                    <Link to={`/clientes/${c.id}`}>
                      <Button variant="outline" size="sm">
                        <Eye className="h-4 w-4" />
                        Ver
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <ClientFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        onSaved={loadClients}
      />
    </div>
  );
}
