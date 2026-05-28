import bcrypt from 'bcryptjs';
import { db, initDatabase } from './db.js';

initDatabase();

const existing = db.prepare('SELECT id FROM users WHERE username = ?').get('admin');
if (!existing) {
  const hash = bcrypt.hashSync('primecell123', 10);
  db.prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)').run('admin', hash);
  console.log('Usuário criado: admin / primecell123');
}

const clientCount = db.prepare('SELECT COUNT(*) as c FROM clients').get() as { c: number };
if (clientCount.c === 0) {
  const clients = [
    ['João Silva', '(11) 98765-4321', '123.456.789-00'],
    ['Maria Santos', '(11) 91234-5678', null],
    ['Carlos Oliveira', '(11) 99876-5432', '987.654.321-00'],
  ];
  const insertClient = db.prepare(
    'INSERT INTO clients (name, phone, cpf) VALUES (?, ?, ?)'
  );
  const clientIds: number[] = [];
  for (const c of clients) {
    const r = insertClient.run(...c);
    clientIds.push(Number(r.lastInsertRowid));
  }

  const now = new Date();
  const fmt = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  const services = [
    {
      client_id: clientIds[0],
      phone_model: 'Galaxy A54',
      brand: 'Samsung',
      description: 'Troca de tela',
      status: 'entregue',
      part_cost: 180,
      labor_cost: 120,
      total_charged: 350,
      entry_date: fmt(new Date(now.getFullYear(), now.getMonth(), 5)),
      warranty_days: 90,
    },
    {
      client_id: clientIds[1],
      phone_model: 'iPhone 12',
      brand: 'Apple',
      description: 'Troca de bateria',
      status: 'concluido',
      part_cost: 95,
      labor_cost: 80,
      total_charged: 220,
      entry_date: fmt(new Date(now.getFullYear(), now.getMonth(), 12)),
      warranty_days: 60,
    },
    {
      client_id: clientIds[2],
      phone_model: 'Moto G84',
      brand: 'Motorola',
      description: 'Conector de carga',
      status: 'em_andamento',
      part_cost: 45,
      labor_cost: 70,
      total_charged: 150,
      entry_date: fmt(new Date()),
      warranty_days: 30,
    },
  ];

  const insertService = db.prepare(`
    INSERT INTO services (
      client_id, phone_model, brand, description, status,
      part_cost, labor_cost, total_charged, profit, entry_date,
      warranty_days, warranty_start, warranty_end, payment_method, paid_in_full
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pix', 1)
  `);

  for (const s of services) {
    const profit = s.total_charged - s.part_cost;
    let warrantyStart: string | null = null;
    let warrantyEnd: string | null = null;
    if (s.status !== 'em_andamento') {
      warrantyStart = s.entry_date;
      const end = new Date(s.entry_date);
      end.setDate(end.getDate() + s.warranty_days);
      warrantyEnd = fmt(end);
    }
    insertService.run(
      s.client_id, s.phone_model, s.brand, s.description, s.status,
      s.part_cost, s.labor_cost, s.total_charged, profit, s.entry_date,
      s.warranty_days, warrantyStart, warrantyEnd
    );
  }

  const expenseCategories = [
    ['Peças Samsung', 450, 'pecas'],
    ['Aluguel', 1200, 'contas'],
    ['Material de limpeza', 85, 'despesas'],
    ['Energia elétrica', 180, 'contas'],
  ];
  const insertExpense = db.prepare(
    'INSERT INTO expenses (description, amount, date, category) VALUES (?, ?, ?, ?)'
  );
  for (const [desc, amount, cat] of expenseCategories) {
    insertExpense.run(desc, amount, fmt(new Date(now.getFullYear(), now.getMonth(), 1)), cat);
  }

  db.prepare(
    'INSERT INTO extra_revenues (description, amount, date) VALUES (?, ?, ?)'
  ).run('Venda de capinha', 35, fmt(new Date()));

  console.log('Dados de demonstração inseridos.');
}

console.log('Seed concluído.');
