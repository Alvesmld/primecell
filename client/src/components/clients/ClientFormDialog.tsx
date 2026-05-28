import { useEffect, useState } from 'react';
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
import { api } from '@/lib/api';
import { useToast } from '@/components/ui/toast';
import type { Client } from '@/types';

interface ClientFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client?: Client | null;
  onSaved: () => void;
}

function emptyForm() {
  return {
    name: '',
    phone: '',
    cpf: '',
    email: '',
    address: '',
    notes: '',
  };
}

export function ClientFormDialog({
  open,
  onOpenChange,
  client,
  onSaved,
}: ClientFormDialogProps) {
  const { toast } = useToast();
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);
  const isEdit = !!client?.id;

  useEffect(() => {
    if (open) {
      if (client) {
        setForm({
          name: client.name,
          phone: client.phone,
          cpf: client.cpf || '',
          email: client.email || '',
          address: client.address || '',
          notes: client.notes || '',
        });
      } else {
        setForm(emptyForm());
      }
    }
  }, [open, client]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.phone.trim()) {
      toast('Nome e telefone são obrigatórios', 'error');
      return;
    }
    setSaving(true);
    try {
      if (isEdit) {
        await api(`/clients/${client!.id}`, {
          method: 'PUT',
          body: JSON.stringify(form),
        });
        toast('Cliente atualizado com sucesso!');
      } else {
        await api('/clients', {
          method: 'POST',
          body: JSON.stringify(form),
        });
        toast('Cliente adicionado com sucesso!');
      }
      onSaved();
      onOpenChange(false);
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Erro ao salvar', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar Cliente' : 'Adicionar Cliente'}</DialogTitle>
          <DialogDescription>Dados de contato do cliente</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Nome completo *</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label>Telefone / WhatsApp *</Label>
            <Input
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              placeholder="(11) 99999-9999"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>CPF (opcional)</Label>
              <Input
                value={form.cpf}
                onChange={(e) => setForm((f) => ({ ...f, cpf: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>E-mail (opcional)</Label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Endereço (opcional)</Label>
            <Input
              value={form.address}
              onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label>Observações</Label>
            <Textarea
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              rows={3}
            />
          </div>
          <Button type="submit" className="w-full" variant="accent" disabled={saving}>
            {saving ? 'Salvando...' : isEdit ? 'Salvar' : 'Adicionar'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
