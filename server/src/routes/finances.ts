import { Router } from 'express';
import { db } from '../db.js';
import { authMiddleware } from '../middleware/auth.js';
import { parsePeriod, lastNMonths } from '../utils/dates.js';

const router = Router();
router.use(authMiddleware);

function sumServicesRevenue(start: string, end: string) {
  const row = db
    .prepare(
      `SELECT COALESCE(SUM(total_charged), 0) as total
       FROM services WHERE status != 'cancelado'
       AND date(entry_date) >= date(?) AND date(entry_date) <= date(?)`
    )
    .get(start, end) as { total: number };
  return row.total;
}

function sumExtraRevenue(start: string, end: string) {
  const row = db
    .prepare(
      `SELECT COALESCE(SUM(amount), 0) as total FROM extra_revenues
       WHERE date(date) >= date(?) AND date(date) <= date(?)`
    )
    .get(start, end) as { total: number };
  return row.total;
}

function sumExpenses(start: string, end: string) {
  const row = db
    .prepare(
      `SELECT COALESCE(SUM(amount), 0) as total FROM expenses
       WHERE date(date) >= date(?) AND date(date) <= date(?)`
    )
    .get(start, end) as { total: number };
  return row.total;
}

function getCashBalance() {
  const servicesRevenue = db
    .prepare(
      `SELECT COALESCE(SUM(total_charged), 0) as t FROM services WHERE status != 'cancelado'`
    )
    .get() as { t: number };
  const extra = db.prepare(`SELECT COALESCE(SUM(amount), 0) as t FROM extra_revenues`).get() as {
    t: number;
  };
  const expenses = db.prepare(`SELECT COALESCE(SUM(amount), 0) as t FROM expenses`).get() as {
    t: number;
  };
  return servicesRevenue.t + extra.t - expenses.t;
}

router.get('/', (req, res) => {
  const period = (req.query.period as string) || 'mes';
  const start = req.query.start as string | undefined;
  const end = req.query.end as string | undefined;
  const { start: rangeStart, end: rangeEnd } = parsePeriod(period, start, end);

  const grossRevenue = sumServicesRevenue(rangeStart, rangeEnd) + sumExtraRevenue(rangeStart, rangeEnd);
  const totalExpenses = sumExpenses(rangeStart, rangeEnd);
  const netProfit = grossRevenue - totalExpenses;
  const cashBalance = getCashBalance();

  const expensesByCategory = db
    .prepare(
      `SELECT category, SUM(amount) as total FROM expenses
       WHERE date(date) >= date(?) AND date(date) <= date(?)
       GROUP BY category ORDER BY total DESC`
    )
    .all(rangeStart, rangeEnd) as { category: string; total: number }[];

  const months = lastNMonths(6);
  const profitEvolution = months.map(({ label, year, month }) => {
    const rs = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const re = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    const rev = sumServicesRevenue(rs, re) + sumExtraRevenue(rs, re);
    const exp = sumExpenses(rs, re);
    return { month: label, lucro: rev - exp };
  });

  const expensesList = db
    .prepare(
      `SELECT * FROM expenses
       WHERE date(date) >= date(?) AND date(date) <= date(?)
       ORDER BY date DESC`
    )
    .all(rangeStart, rangeEnd);

  const revenuesList = db
    .prepare(
      `SELECT * FROM extra_revenues
       WHERE date(date) >= date(?) AND date(date) <= date(?)
       ORDER BY date DESC`
    )
    .all(rangeStart, rangeEnd);

  res.json({
    period: { start: rangeStart, end: rangeEnd, type: period },
    summary: {
      totalExpenses,
      grossRevenue,
      netProfit,
      cashBalance,
    },
    expensesByCategory,
    profitEvolution,
    expensesList,
    revenuesList,
  });
});

router.post('/expenses', (req, res) => {
  const { description, amount, date, category } = req.body;
  if (!description || amount == null || !date || !category) {
    return res.status(400).json({ error: 'Preencha todos os campos obrigatórios' });
  }
  const result = db
    .prepare(
      `INSERT INTO expenses (description, amount, date, category) VALUES (?, ?, ?, ?)`
    )
    .run(description, Number(amount), date, category);
  const expense = db.prepare('SELECT * FROM expenses WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(expense);
});

router.delete('/expenses/:id', (req, res) => {
  const id = Number(req.params.id);
  const existing = db.prepare('SELECT id FROM expenses WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: 'Gasto não encontrado' });
  db.prepare('DELETE FROM expenses WHERE id = ?').run(id);
  res.json({ message: 'Gasto excluído com sucesso' });
});

router.post('/revenues', (req, res) => {
  const { description, amount, date } = req.body;
  if (!description || amount == null || !date) {
    return res.status(400).json({ error: 'Preencha todos os campos obrigatórios' });
  }
  const result = db
    .prepare(`INSERT INTO extra_revenues (description, amount, date) VALUES (?, ?, ?)`)
    .run(description, Number(amount), date);
  const revenue = db
    .prepare('SELECT * FROM extra_revenues WHERE id = ?')
    .get(result.lastInsertRowid);
  res.status(201).json(revenue);
});

router.delete('/revenues/:id', (req, res) => {
  const id = Number(req.params.id);
  const existing = db.prepare('SELECT id FROM extra_revenues WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: 'Receita não encontrada' });
  db.prepare('DELETE FROM extra_revenues WHERE id = ?').run(id);
  res.json({ message: 'Receita excluída com sucesso' });
});

export default router;
