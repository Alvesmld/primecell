import { useEffect, useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { api, uploadFiles } from '@/lib/api';
import {
  formatCurrency,
  formatDate,
  calcWarrantyEndDate,
  toInputDate,
  PAYMENT_METHOD_LABELS,
  WARRANTY_OPTIONS,
  STATUS_LABELS,
} from '@/lib/format';
import { useToast } from '@/components/ui/toast';
import type { Client, Installment, Service, ServiceFormData } from '@/types';

interface ServiceFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  service?: Service | null;
  onSaved: (service: Service) => void;
}

function emptyForm(): ServiceFormData {
  const today = toInputDate();
  return {
    client_name: '',
    client_phone: '',
    client_cpf: '',
    phone_model: '',
    brand: '',
    color: '',
    imei: '',
    device_password: '',
    description: '',
    repair_details: '',
    parts_used: '',
    pre_existing_defects: '',
    technical_notes: '',
    entry_date: today,
    delivery_date: '',
    status: 'em_andamento',
    warranty_days: 30,
    warranty_start: today,
    part_cost: 0,
    labor_cost: 0,
    total_charged: 0,
    payment_method: 'pix',
    paid_in_full: true,
    installments: [],
  };
}

function serviceToForm(s: Service): ServiceFormData {
  return {
    client_id: s.client_id,
    client_name: s.client_name,
    client_phone: s.client_phone,
    client_cpf: s.client_cpf || '',
    phone_model: s.phone_model || '',
    brand: s.brand || '',
    color: s.color || '',
    imei: s.imei || '',
    device_password: s.device_password || '',
    description: s.description || '',
    repair_details: s.repair_details || '',
    parts_used: s.parts_used || '',
    pre_existing_defects: s.pre_existing_defects || '',
    technical_notes: s.technical_notes || '',
    entry_date: s.entry_date || toInputDate(),
    delivery_date: s.delivery_date || '',
    status: s.status,
    warranty_days: s.warranty_days || 30,
    warranty_start: s.warranty_start || s.entry_date || toInputDate(),
    part_cost: s.part_cost || 0,
    labor_cost: s.labor_cost || 0,
    total_charged: s.total_charged || 0,
    payment_method: s.payment_method || 'pix',
    paid_in_full: !!s.paid_in_full,
    installments: s.installments || [],
  };
}

export function ServiceFormDialog({
  open,
  onOpenChange,
  service,
  onSaved,
}: ServiceFormDialogProps) {
  const { toast } = useToast();
  const [form, setForm] = useState<ServiceFormData>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [customWarranty, setCustomWarranty] = useState(false);
  const [installmentCount, setInstallmentCount] = useState(2);
  const [warrantyFile, setWarrantyFile] = useState<File | null>(null);
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);

  const isEdit = !!service?.id;

  useEffect(() => {
    if (open) {
      if (service) {
        setForm(serviceToForm(service));
        setCustomWarranty(![30, 60, 90].includes(service.warranty_days));
      } else {
        setForm(emptyForm());
        setCustomWarranty(false);
      }
      setWarrantyFile(null);
      setPhotoFiles([]);
    }
  }, [open, service]);

  useEffect(() => {
    if (form.client_name.length >= 2) {
      api<Client[]>(`/clients?q=${encodeURIComponent(form.client_name)}`)
        .then(setClients)
        .catch(() => setClients([]));
    } else {
      setClients([]);
    }
  }, [form.client_name]);

  const profit = useMemo(
    () => Math.max(0, (form.total_charged || 0) - (form.part_cost || 0)),
    [form.total_charged, form.part_cost]
  );

  const warrantyEnd = useMemo(
    () =>
      form.warranty_start
        ? calcWarrantyEndDate(form.warranty_start, form.warranty_days)
        : '',
    [form.warranty_start, form.warranty_days]
  );

  const selectClient = (c: Client) => {
    setForm((f) => ({
      ...f,
      client_id: c.id,
      client_name: c.name,
      client_phone: c.phone,
      client_cpf: c.cpf || '',
    }));
    setClients([]);
  };

  const generateInstallments = () => {
    const total = form.total_charged || 0;
    const count = Math.max(1, installmentCount);
    const amount = Math.round((total / count) * 100) / 100;
    const items: Installment[] = [];
    const base = new Date();
    for (let i = 0; i < count; i++) {
      const d = new Date(base);
      d.setMonth(d.getMonth() + i + 1);
      items.push({
        number: i + 1,
        amount: i === count - 1 ? total - amount * (count - 1) : amount,
        due_date: toInputDate(d),
        status: 'pendente',
      });
    }
    setForm((f) => ({ ...f, installments: items }));
  };

  const uploadPendingFiles = async (serviceId: number) => {
    if (warrantyFile) {
      const fd = new FormData();
      fd.append('file', warrantyFile);
      await uploadFiles(`/services/${serviceId}/warranty-file`, fd);
    }
    if (photoFiles.length) {
      const fd = new FormData();
      photoFiles.forEach((f) => fd.append('photos', f));
      await uploadFiles(`/services/${serviceId}/photos`, fd);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.client_name.trim() || !form.client_phone.trim()) {
      toast('Nome e telefone do cliente são obrigatórios', 'error');
      return;
    }
    if (!form.description.trim()) {
      toast('Descrição do serviço é obrigatória', 'error');
      return;
    }

    setSaving(true);
    try {
      const payload = { ...form, profit };
      let saved: Service;
      if (isEdit) {
        saved = await api<Service>(`/services/${service!.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
      } else {
        saved = await api<Service>('/services', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }
      if (warrantyFile || photoFiles.length) {
        await uploadPendingFiles(saved.id);
        saved = await api<Service>(`/services/${saved.id}`);
      }
      toast(isEdit ? 'Serviço atualizado com sucesso!' : 'Serviço criado com sucesso!');
      onSaved(saved);
      onOpenChange(false);
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Erro ao salvar', 'error');
    } finally {
      setSaving(false);
    }
  };

  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="space-y-3 border-t border-[var(--color-border)] pt-4 first:border-0 first:pt-0">
      <h3 className="text-sm font-semibold text-[var(--color-primary)]">{title}</h3>
      {children}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[92vh]">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar Serviço' : 'Novo Serviço'}</DialogTitle>
          <DialogDescription>Ordem de serviço completa</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Section title="Dados do Cliente">
            <div className="relative space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Nome *</Label>
                  <Input
                    value={form.client_name}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, client_name: e.target.value, client_id: undefined }))
                    }
                    placeholder="Nome do cliente"
                    autoComplete="off"
                  />
                  {clients.length > 0 && (
                    <ul className="absolute z-50 mt-1 w-full max-h-40 overflow-auto rounded-lg border bg-[var(--color-card)] shadow-lg">
                      {clients.map((c) => (
                        <li key={c.id}>
                          <button
                            type="button"
                            className="w-full px-3 py-2 text-left text-sm hover:bg-[var(--color-muted)]"
                            onClick={() => selectClient(c)}
                          >
                            {c.name} — {c.phone}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div className="space-y-1">
                  <Label>Telefone *</Label>
                  <Input
                    value={form.client_phone}
                    onChange={(e) => setForm((f) => ({ ...f, client_phone: e.target.value }))}
                    placeholder="(11) 99999-9999"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label>CPF (opcional)</Label>
                <Input
                  value={form.client_cpf}
                  onChange={(e) => setForm((f) => ({ ...f, client_cpf: e.target.value }))}
                />
              </div>
            </div>
          </Section>

          <Section title="Dados do Aparelho">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Marca</Label>
                <Input value={form.brand} onChange={(e) => setForm((f) => ({ ...f, brand: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Modelo</Label>
                <Input
                  value={form.phone_model}
                  onChange={(e) => setForm((f) => ({ ...f, phone_model: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label>Cor</Label>
                <Input value={form.color} onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>IMEI (opcional)</Label>
                <Input value={form.imei} onChange={(e) => setForm((f) => ({ ...f, imei: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Senha de acesso (opcional)</Label>
              <Input
                value={form.device_password}
                onChange={(e) => setForm((f) => ({ ...f, device_password: e.target.value }))}
              />
            </div>
          </Section>

          <Section title="Dados do Serviço">
            <div className="space-y-1">
              <Label>Descrição solicitada *</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                rows={2}
              />
            </div>
            <div className="space-y-1">
              <Label>O que foi consertado</Label>
              <Textarea
                value={form.repair_details}
                onChange={(e) => setForm((f) => ({ ...f, repair_details: e.target.value }))}
                rows={2}
              />
            </div>
            <div className="space-y-1">
              <Label>Peças trocadas/utilizadas</Label>
              <Input
                value={form.parts_used}
                onChange={(e) => setForm((f) => ({ ...f, parts_used: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label>Defeitos pré-existentes *</Label>
              <Textarea
                value={form.pre_existing_defects}
                onChange={(e) => setForm((f) => ({ ...f, pre_existing_defects: e.target.value }))}
                placeholder="O que já estava quebrado/danificado antes do conserto"
                rows={2}
              />
            </div>
            <div className="space-y-1">
              <Label>Observações técnicas</Label>
              <Textarea
                value={form.technical_notes}
                onChange={(e) => setForm((f) => ({ ...f, technical_notes: e.target.value }))}
                rows={2}
              />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label>Data entrada</Label>
                <Input
                  type="date"
                  value={form.entry_date}
                  onChange={(e) => setForm((f) => ({ ...f, entry_date: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label>Data entrega</Label>
                <Input
                  type="date"
                  value={form.delivery_date}
                  onChange={(e) => setForm((f) => ({ ...f, delivery_date: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(STATUS_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>
                        {v}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </Section>

          <Section title="Garantia">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label>Tempo de garantia</Label>
                <Select
                  value={customWarranty ? 'custom' : String(form.warranty_days)}
                  onValueChange={(v) => {
                    if (v === 'custom') {
                      setCustomWarranty(true);
                    } else {
                      setCustomWarranty(false);
                      setForm((f) => ({ ...f, warranty_days: Number(v) }));
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {WARRANTY_OPTIONS.map((o) => (
                      <SelectItem key={String(o.value)} value={String(o.value)}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {customWarranty && (
                <div className="space-y-1">
                  <Label>Dias personalizados</Label>
                  <Input
                    type="number"
                    min={1}
                    value={form.warranty_days}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, warranty_days: Number(e.target.value) || 30 }))
                    }
                  />
                </div>
              )}
              <div className="space-y-1">
                <Label>Início da garantia</Label>
                <Input
                  type="date"
                  value={form.warranty_start}
                  onChange={(e) => setForm((f) => ({ ...f, warranty_start: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label>Término (automático)</Label>
                <Input value={warrantyEnd ? formatDate(warrantyEnd) : ''} disabled />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Termo de garantia (PDF, JPG, PNG)</Label>
              <Input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.webp"
                onChange={(e) => setWarrantyFile(e.target.files?.[0] || null)}
              />
            </div>
            <div className="space-y-1">
              <Label>Fotos do serviço (múltiplas)</Label>
              <Input
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => setPhotoFiles(Array.from(e.target.files || []))}
              />
            </div>
          </Section>

          <Section title="Valores e Pagamento">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="space-y-1">
                <Label>Custo peça (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min={0}
                  value={form.part_cost || ''}
                  onChange={(e) => setForm((f) => ({ ...f, part_cost: Number(e.target.value) || 0 }))}
                />
              </div>
              <div className="space-y-1">
                <Label>Mão de obra (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min={0}
                  value={form.labor_cost || ''}
                  onChange={(e) => setForm((f) => ({ ...f, labor_cost: Number(e.target.value) || 0 }))}
                />
              </div>
              <div className="space-y-1">
                <Label>Total cobrado (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min={0}
                  value={form.total_charged || ''}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, total_charged: Number(e.target.value) || 0 }))
                  }
                />
              </div>
              <div className="space-y-1">
                <Label>Lucro</Label>
                <Input value={formatCurrency(profit)} disabled className="font-semibold text-emerald-600" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Forma de pagamento</Label>
                <Select
                  value={form.payment_method}
                  onValueChange={(v) => setForm((f) => ({ ...f, payment_method: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(PAYMENT_METHOD_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>
                        {v}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Pago à vista?</Label>
                <Select
                  value={form.paid_in_full ? 'sim' : 'nao'}
                  onValueChange={(v) => setForm((f) => ({ ...f, paid_in_full: v === 'sim' }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sim">Sim</SelectItem>
                    <SelectItem value="nao">Não (parcelado)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {!form.paid_in_full && (
              <div className="space-y-3 p-3 rounded-lg bg-[var(--color-muted)]">
                <div className="flex flex-wrap gap-2 items-end">
                  <div className="space-y-1">
                    <Label>Qtd. parcelas</Label>
                    <Input
                      type="number"
                      min={2}
                      max={24}
                      className="w-24"
                      value={installmentCount}
                      onChange={(e) => setInstallmentCount(Number(e.target.value) || 2)}
                    />
                  </div>
                  <Button type="button" variant="outline" size="sm" onClick={generateInstallments}>
                    Gerar parcelas
                  </Button>
                </div>
                {form.installments.map((inst, idx) => (
                  <div key={idx} className="grid grid-cols-3 gap-2">
                    <Input
                      type="number"
                      step="0.01"
                      value={inst.amount}
                      onChange={(e) => {
                        const installments = [...form.installments];
                        installments[idx] = { ...inst, amount: Number(e.target.value) };
                        setForm((f) => ({ ...f, installments }));
                      }}
                    />
                    <Input
                      type="date"
                      value={inst.due_date}
                      onChange={(e) => {
                        const installments = [...form.installments];
                        installments[idx] = { ...inst, due_date: e.target.value };
                        setForm((f) => ({ ...f, installments }));
                      }}
                    />
                    <Select
                      value={inst.status}
                      onValueChange={(v) => {
                        const installments = [...form.installments];
                        installments[idx] = { ...inst, status: v as 'pago' | 'pendente' };
                        setForm((f) => ({ ...f, installments }));
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pendente">Pendente</SelectItem>
                        <SelectItem value="pago">Pago</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            )}
          </Section>

          <Button type="submit" className="w-full" variant="accent" disabled={saving}>
            {saving ? 'Salvando...' : isEdit ? 'Salvar alterações' : 'Criar serviço'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
