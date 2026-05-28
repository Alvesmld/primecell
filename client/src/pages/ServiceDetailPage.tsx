import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Pencil,
  Printer,
  Shield,
  Trash2,
  CheckCircle2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ServiceFormDialog } from '@/components/services/ServiceFormDialog';
import { ServiceStatusBadge } from '@/components/services/ServiceStatusBadge';
import { api } from '@/lib/api';
import {
  formatCurrency,
  formatDate,
  PAYMENT_METHOD_LABELS,
  INSTALLMENT_STATUS_LABELS,
} from '@/lib/format';
import { exportServiceOrder, exportWarrantyCertificate } from '@/lib/pdf';
import { useToast } from '@/components/ui/toast';
import type { Service } from '@/types';

export function ServiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [service, setService] = useState<Service | null>(null);
  const [store, setStore] = useState<{
    store_name?: string;
    address?: string;
    cnpj?: string;
    warranty_template?: string;
  }>({});
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);

  const load = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [svc, me] = await Promise.all([
        api<Service>(`/services/${id}`),
        api<{ store: typeof store }>('/auth/me'),
      ]);
      setService(svc);
      setStore(me.store || {});
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Erro ao carregar', 'error');
      navigate('/servicos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [id]);

  const handleDelete = async () => {
    if (!service || !confirm('Deseja excluir este serviço permanentemente?')) return;
    try {
      await api(`/services/${service.id}`, { method: 'DELETE' });
      toast('Serviço excluído com sucesso!');
      navigate('/servicos');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Erro ao excluir', 'error');
    }
  };

  const toggleInstallment = async (installmentId: number, current: string) => {
    if (!service) return;
    const next = current === 'pago' ? 'pendente' : 'pago';
    try {
      const updated = await api<Service>(
        `/services/${service.id}/installments/${installmentId}`,
        { method: 'PATCH', body: JSON.stringify({ status: next }) }
      );
      setService(updated);
      toast('Status da parcela atualizado!');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Erro', 'error');
    }
  };

  if (loading || !service) {
    return (
      <p className="text-center py-12 text-[var(--color-muted-foreground)]">
        {loading ? 'Carregando...' : 'Serviço não encontrado'}
      </p>
    );
  }

  const DetailRow = ({ label, value }: { label: string; value?: string | null }) =>
    value ? (
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-1 py-2 border-b border-[var(--color-border)] last:border-0">
        <dt className="text-sm text-[var(--color-muted-foreground)]">{label}</dt>
        <dd className="sm:col-span-2 text-sm whitespace-pre-wrap">{value}</dd>
      </div>
    ) : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4">
        <Link
          to="/servicos"
          className="inline-flex items-center gap-2 text-sm text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] w-fit"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar para serviços
        </Link>

        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold">OS #{service.id}</h1>
              <ServiceStatusBadge status={service.status} />
            </div>
            <p className="text-[var(--color-muted-foreground)] mt-1">
              {service.client_name} · {service.brand} {service.phone_model}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
              <Pencil className="h-4 w-4" />
              Editar
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportServiceOrder(service, store.store_name)}
            >
              <Printer className="h-4 w-4" />
              Imprimir OS
            </Button>
            {(service.status === 'concluido' || service.status === 'entregue') && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => exportWarrantyCertificate(service, store)}
              >
                <Shield className="h-4 w-4" />
                Garantia PDF
              </Button>
            )}
            <Button variant="destructive" size="sm" onClick={handleDelete}>
              <Trash2 className="h-4 w-4" />
              Excluir
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Cliente e aparelho</CardTitle>
          </CardHeader>
          <CardContent>
            <dl>
              <DetailRow label="Cliente" value={service.client_name} />
              <DetailRow label="Telefone" value={service.client_phone} />
              <DetailRow label="CPF" value={service.client_cpf} />
              <DetailRow label="Aparelho" value={`${service.brand} ${service.phone_model}`} />
              <DetailRow label="Cor" value={service.color} />
              <DetailRow label="IMEI" value={service.imei} />
              <DetailRow label="Senha" value={service.device_password} />
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Valores e pagamento</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Custo da peça</span>
              <span>{formatCurrency(service.part_cost)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Mão de obra</span>
              <span>{formatCurrency(service.labor_cost)}</span>
            </div>
            <div className="flex justify-between font-bold text-lg border-t pt-2">
              <span>Total</span>
              <span className="text-[var(--color-accent)]">
                {formatCurrency(service.total_charged)}
              </span>
            </div>
            <div className="flex justify-between text-sm text-emerald-600">
              <span>Lucro</span>
              <span>{formatCurrency(service.profit)}</span>
            </div>
            <p className="text-sm text-[var(--color-muted-foreground)]">
              Pagamento:{' '}
              {PAYMENT_METHOD_LABELS[service.payment_method || ''] || service.payment_method}
              {service.paid_in_full ? ' · À vista' : ' · Parcelado'}
            </p>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Serviço</CardTitle>
          </CardHeader>
          <CardContent>
            <dl>
              <DetailRow label="Descrição" value={service.description} />
              <DetailRow label="Conserto realizado" value={service.repair_details} />
              <DetailRow label="Peças utilizadas" value={service.parts_used} />
              <DetailRow
                label="Defeitos pré-existentes"
                value={service.pre_existing_defects}
              />
              <DetailRow label="Observações técnicas" value={service.technical_notes} />
              <DetailRow label="Entrada" value={formatDate(service.entry_date)} />
              <DetailRow label="Entrega" value={formatDate(service.delivery_date)} />
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Garantia
            </CardTitle>
          </CardHeader>
          <CardContent>
            <dl>
              <DetailRow label="Período" value={`${service.warranty_days} dias`} />
              <DetailRow label="Início" value={formatDate(service.warranty_start)} />
              <DetailRow label="Término" value={formatDate(service.warranty_end)} />
            </dl>
            {service.warranty_file && (
              <a
                href={`/uploads/${service.warranty_file}`}
                target="_blank"
                rel="noreferrer"
                className="text-sm text-[var(--color-accent)] hover:underline mt-2 inline-block"
              >
                Ver termo de garantia
              </a>
            )}
          </CardContent>
        </Card>

        {!service.paid_in_full && service.installments?.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Parcelas</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {service.installments.map((inst) => (
                  <li
                    key={inst.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-[var(--color-muted)]"
                  >
                    <div>
                      <p className="font-medium">
                        Parcela {inst.number} — {formatCurrency(inst.amount)}
                      </p>
                      <p className="text-xs text-[var(--color-muted-foreground)]">
                        Vencimento: {formatDate(inst.due_date)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => inst.id && toggleInstallment(inst.id, inst.status)}
                      className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full ${
                        inst.status === 'pago'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      <CheckCircle2 className="h-3 w-3" />
                      {INSTALLMENT_STATUS_LABELS[inst.status]}
                    </button>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {service.photos?.length > 0 && (
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Fotos do serviço</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {service.photos.map((photo) => (
                  <a
                    key={photo.id}
                    href={`/uploads/${photo.file_path}`}
                    target="_blank"
                    rel="noreferrer"
                    className="block aspect-square rounded-lg overflow-hidden border border-[var(--color-border)]"
                  >
                    <img
                      src={`/uploads/${photo.file_path}`}
                      alt="Foto do serviço"
                      className="w-full h-full object-cover"
                    />
                  </a>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <ServiceFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        service={service}
        onSaved={(s) => {
          setService(s);
          setEditOpen(false);
        }}
      />
    </div>
  );
}
