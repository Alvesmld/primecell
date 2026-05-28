const TOKEN_KEY = 'primecell_token';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

export async function api<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };
  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }

  let res: Response;
  try {
    res = await fetch(`/api${endpoint}`, { ...options, headers });
  } catch {
    throw new Error(
      'Não foi possível conectar ao servidor. Verifique sua internet ou se a API está no ar.'
    );
  }

  if (res.status === 401) {
    clearToken();
    window.location.href = '/login';
    throw new Error('Não autorizado');
  }

  const contentType = res.headers.get('content-type') || '';
  const isJson = contentType.includes('application/json');
  const data = isJson ? await res.json().catch(() => ({})) : {};

  if (!res.ok) {
    if (!isJson) {
      throw new Error(
        `Servidor retornou erro ${res.status}. A API pode estar indisponível — faça um novo deploy na Vercel.`
      );
    }
    throw new Error((data as { error?: string }).error || 'Erro na requisição');
  }
  return data as T;
}

export async function uploadFiles(
  endpoint: string,
  formData: FormData
): Promise<unknown> {
  const token = getToken();
  const headers: HeadersInit = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`/api${endpoint}`, {
    method: 'POST',
    headers,
    body: formData,
  });

  if (res.status === 401) {
    clearToken();
    window.location.href = '/login';
    throw new Error('Não autorizado');
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || 'Erro no upload');
  }
  return data;
}

export async function downloadFile(endpoint: string, filename: string) {
  const token = getToken();
  const headers: HeadersInit = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`/api${endpoint}`, { headers });
  if (res.status === 401) {
    clearToken();
    window.location.href = '/login';
    throw new Error('Não autorizado');
  }
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Erro no download');
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
