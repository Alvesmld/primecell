export interface DashboardData {
  summary: {
    servicesCount: number;
    revenue: number;
    netProfit: number;
    cashBalance: number;
  };
  chartData: { month: string; ganhos: number; gastos: number }[];
  recentServices: RecentService[];
  upcomingWarranties: WarrantyItem[];
}

export interface RecentService {
  id: number;
  description: string;
  status: string;
  entry_date: string;
  total_charged: number;
  client_name: string;
  brand: string;
  phone_model: string;
}

export interface WarrantyItem {
  id: number;
  warranty_end: string;
  phone_model: string;
  brand: string;
  client_name: string;
  phone: string;
}

export interface FinancesData {
  period: { start: string; end: string; type: string };
  summary: {
    totalExpenses: number;
    grossRevenue: number;
    netProfit: number;
    cashBalance: number;
  };
  expensesByCategory: { category: string; total: number }[];
  profitEvolution: { month: string; lucro: number }[];
  expensesList: Expense[];
  revenuesList: ExtraRevenue[];
}

export interface Expense {
  id: number;
  description: string;
  amount: number;
  date: string;
  category: string;
}

export interface ExtraRevenue {
  id: number;
  description: string;
  amount: number;
  date: string;
}

export interface Client {
  id: number;
  name: string;
  phone: string;
  cpf?: string | null;
  email?: string | null;
  address?: string | null;
  notes?: string | null;
  created_at?: string;
}

export interface ClientListItem extends Client {
  services_count: number;
  total_spent: number;
}

export interface ClientDevice {
  brand: string | null;
  phone_model: string | null;
  color: string | null;
}

export interface ClientServiceHistory {
  id: number;
  description: string;
  status: string;
  entry_date: string;
  delivery_date: string | null;
  total_charged: number;
  brand: string;
  phone_model: string;
  warranty_end: string | null;
}

export interface ClientDetail extends Client {
  services: ClientServiceHistory[];
  total_spent: number;
  devices: ClientDevice[];
}

export interface StoreSettings {
  id: number;
  store_name: string;
  address: string;
  cnpj: string;
  logo_path: string;
  warranty_template: string;
}

export interface SettingsData {
  store: StoreSettings;
  user: { id: number; username: string };
}

export interface Installment {
  id?: number;
  service_id?: number;
  number: number;
  amount: number;
  due_date: string;
  status: 'pago' | 'pendente';
}

export interface ServicePhoto {
  id: number;
  service_id: number;
  file_path: string;
}

export interface ServiceListItem {
  id: number;
  description: string;
  status: string;
  entry_date: string;
  delivery_date: string | null;
  total_charged: number;
  profit: number;
  brand: string;
  phone_model: string;
  warranty_end: string | null;
  client_name: string;
  client_phone: string;
}

export interface Service extends ServiceListItem {
  client_id: number;
  client_cpf?: string | null;
  color?: string | null;
  imei?: string | null;
  device_password?: string | null;
  repair_details?: string | null;
  parts_used?: string | null;
  pre_existing_defects?: string | null;
  technical_notes?: string | null;
  warranty_days: number;
  warranty_start: string | null;
  warranty_file: string | null;
  part_cost: number;
  labor_cost: number;
  payment_method: string | null;
  paid_in_full: number;
  installments_count: number;
  installments: Installment[];
  photos: ServicePhoto[];
}

export interface ServiceFormData {
  client_id?: number;
  client_name: string;
  client_phone: string;
  client_cpf?: string;
  phone_model: string;
  brand: string;
  color: string;
  imei: string;
  device_password: string;
  description: string;
  repair_details: string;
  parts_used: string;
  pre_existing_defects: string;
  technical_notes: string;
  entry_date: string;
  delivery_date: string;
  status: string;
  warranty_days: number;
  warranty_start: string;
  part_cost: number;
  labor_cost: number;
  total_charged: number;
  payment_method: string;
  paid_in_full: boolean;
  installments: Installment[];
}
