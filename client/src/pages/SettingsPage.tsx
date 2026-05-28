import { useEffect, useState } from 'react';
import {
  Store,
  Lock,
  FileText,
  Download,
  Upload,
  ImageIcon,
  Save,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Logo } from '@/components/Logo';
import { api, downloadFile, uploadFiles } from '@/lib/api';
import { useToast } from '@/components/ui/toast';
import type { SettingsData, StoreSettings } from '@/types';

const DEFAULT_WARRANTY_TEMPLATE = `Certificamos que o serviço realizado no aparelho {aparelho}, de propriedade de {cliente}, possui garantia de {dias} dias, válida de {inicio} até {fim}.

Durante este período, garantimos o reparo realizado conforme descrito na ordem de serviço, exceto danos por mau uso, queda ou contato com líquidos.

PrimeCell — Assistência Técnica de Celulares`;

export function SettingsPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState('');
  const [store, setStore] = useState<Partial<StoreSettings>>({
    store_name: 'PrimeCell',
    address: '',
    cnpj: '',
    warranty_template: DEFAULT_WARRANTY_TEMPLATE,
  });
  const [passwordForm, setPasswordForm] = useState({
    current: '',
    new: '',
    confirm: '',
  });
  const [savingStore, setSavingStore] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [restoring, setRestoring] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await api<SettingsData>('/settings');
      setUsername(data.user.username);
      setStore({
        ...data.store,
        warranty_template:
          data.store.warranty_template || DEFAULT_WARRANTY_TEMPLATE,
      });
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Erro ao carregar', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleSaveStore = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingStore(true);
    try {
      const updated = await api<StoreSettings>('/settings/store', {
        method: 'PUT',
        body: JSON.stringify(store),
      });
      setStore(updated);
      toast('Dados da loja salvos com sucesso!');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Erro ao salvar', 'error');
    } finally {
      setSavingStore(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordForm.new !== passwordForm.confirm) {
      toast('As senhas não coincidem', 'error');
      return;
    }
    if (passwordForm.new.length < 6) {
      toast('A nova senha deve ter no mínimo 6 caracteres', 'error');
      return;
    }
    setSavingPassword(true);
    try {
      await api('/settings/password', {
        method: 'PUT',
        body: JSON.stringify({
          current_password: passwordForm.current,
          new_password: passwordForm.new,
        }),
      });
      toast('Senha alterada com sucesso!');
      setPasswordForm({ current: '', new: '', confirm: '' });
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Erro ao alterar senha', 'error');
    } finally {
      setSavingPassword(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const fd = new FormData();
      fd.append('logo', file);
      const result = (await uploadFiles('/settings/logo', fd)) as { logo_path: string };
      setStore((s) => ({ ...s, logo_path: result.logo_path }));
      toast('Logo atualizada com sucesso!');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Erro no upload', 'error');
    }
  };

  const handleBackup = async () => {
    try {
      await downloadFile(
        '/settings/backup',
        `primecell-backup-${new Date().toISOString().slice(0, 10)}.json`
      );
      toast('Backup baixado com sucesso!');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Erro no backup', 'error');
    }
  };

  const handleRestore = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (
      !confirm(
        'ATENÇÃO: Restaurar o backup substituirá TODOS os dados atuais (clientes, serviços, finanças). Deseja continuar?'
      )
    ) {
      e.target.value = '';
      return;
    }
    setRestoring(true);
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      await api('/settings/restore', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      toast('Backup restaurado! Recarregue a página.');
      setTimeout(() => window.location.reload(), 1500);
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Erro ao restaurar', 'error');
    } finally {
      setRestoring(false);
      e.target.value = '';
    }
  };

  if (loading) {
    return (
      <p className="text-center py-12 text-[var(--color-muted-foreground)]">Carregando...</p>
    );
  }

  return (
    <div className="space-y-8 max-w-3xl">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">Configurações</h1>
        <p className="text-[var(--color-muted-foreground)] mt-1">
          Dados da loja, segurança e backup
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Store className="h-5 w-5" />
            Dados da loja
          </CardTitle>
          <CardDescription>Informações exibidas em documentos e comprovantes</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSaveStore} className="space-y-4">
            <div className="flex items-center gap-4">
              {store.logo_path ? (
                <img
                  src={`/uploads/${store.logo_path}`}
                  alt="Logo"
                  className="h-16 w-16 object-contain rounded-lg border"
                />
              ) : (
                <Logo size="lg" />
              )}
              <div className="space-y-2 flex-1">
                <Label>Logo da loja</Label>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Nome da loja</Label>
              <Input
                value={store.store_name || ''}
                onChange={(e) => setStore((s) => ({ ...s, store_name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Endereço</Label>
              <Input
                value={store.address || ''}
                onChange={(e) => setStore((s) => ({ ...s, address: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>CNPJ</Label>
              <Input
                value={store.cnpj || ''}
                onChange={(e) => setStore((s) => ({ ...s, cnpj: e.target.value }))}
              />
            </div>
            <Button type="submit" variant="accent" disabled={savingStore}>
              <Save className="h-4 w-4" />
              {savingStore ? 'Salvando...' : 'Salvar dados da loja'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Login e senha
          </CardTitle>
          <CardDescription>
            Usuário atual: <strong>{username}</strong>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div className="space-y-2">
              <Label>Senha atual</Label>
              <Input
                type="password"
                value={passwordForm.current}
                onChange={(e) =>
                  setPasswordForm((f) => ({ ...f, current: e.target.value }))
                }
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nova senha</Label>
                <Input
                  type="password"
                  value={passwordForm.new}
                  onChange={(e) => setPasswordForm((f) => ({ ...f, new: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Confirmar nova senha</Label>
                <Input
                  type="password"
                  value={passwordForm.confirm}
                  onChange={(e) =>
                    setPasswordForm((f) => ({ ...f, confirm: e.target.value }))
                  }
                />
              </div>
            </div>
            <Button type="submit" variant="outline" disabled={savingPassword}>
              {savingPassword ? 'Alterando...' : 'Alterar senha'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Termo de garantia
          </CardTitle>
          <CardDescription>
            Personalize o texto do PDF de garantia. Variáveis: {'{cliente}'}, {'{aparelho}'},{' '}
            {'{dias}'}, {'{inicio}'}, {'{fim}'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSaveStore} className="space-y-4">
            <Textarea
              value={store.warranty_template || ''}
              onChange={(e) =>
                setStore((s) => ({ ...s, warranty_template: e.target.value }))
              }
              rows={10}
              className="font-mono text-sm"
            />
            <Button type="submit" variant="accent" disabled={savingStore}>
              <Save className="h-4 w-4" />
              Salvar termo
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Backup dos dados
          </CardTitle>
          <CardDescription>
            Exporte ou restaure todos os dados do sistema em arquivo JSON
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col sm:flex-row gap-4">
          <Button variant="outline" onClick={handleBackup}>
            <Download className="h-4 w-4" />
            Baixar backup
          </Button>
          <label
            className={`inline-flex items-center justify-center gap-2 h-10 px-4 rounded-lg border border-[var(--color-border)] text-sm font-medium cursor-pointer hover:bg-[var(--color-muted)] ${restoring ? 'opacity-50 pointer-events-none' : ''}`}
          >
            <Upload className="h-4 w-4" />
            {restoring ? 'Restaurando...' : 'Restaurar backup'}
            <input
              type="file"
              accept=".json,application/json"
              className="hidden"
              onChange={handleRestore}
              disabled={restoring}
            />
          </label>
        </CardContent>
      </Card>

      <Card className="border-dashed">
        <CardContent className="p-6 flex items-center gap-4 text-sm text-[var(--color-muted-foreground)]">
          <ImageIcon className="h-8 w-8 shrink-0 text-[var(--color-accent)]" />
          <p>
            Mantenha backups regulares dos seus dados. A restauração substitui clientes,
            serviços, finanças e configurações da loja (exceto senha do usuário).
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
