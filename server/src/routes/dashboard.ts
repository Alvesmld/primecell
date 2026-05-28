import { Router } from 'express';
import { db } from '../db.js';
import { authMiddleware } from '../middleware/auth.js';
import { getCurrentMonthRange, lastNMonths } from '../utils/dates.js';

const router = Router();
router.use(authMiddleware);

function sumServicesRevenue(start: string, end: string) {
  const row = db
    .prepare(
      `SELECT COALESCE(SUM(total_charged), 0) as total
       FROM services
       WHERE status != 'cancelado'
         AND date(entry_date) >= date(?)
         AND date(entry_date) <= date(?)`
    )
    .get(start, end) as { total: number };
  return row.total;
}

function sumExtraRevenue(start: string, end: string) {
  const row = db
    .prepare(
      `SELECT COALESCE(SUM(amount), 0) as total
       FROM extra_revenues
       WHERE date(date) >= date(?) AND date(date) <= date(?)`
    )
    .get(start, end) as { total: number };
  return row.total;
}

function sumExpenses(start: string, end: string) {
  const row = db
    .prepare(
      `SELECT COALESCE(SUM(amount), 0) as total
       FROM expenses
       WHERE date(date) >= date(?) AND date(date) <= date(?)`
    )
    .get(start, end) as { total: number };
  return row.total;
}

function countServicesMonth(start: string, end: string) {
  const row = db
    .prepare(
      `SELECT COUNT(*) as count FROM services
       WHERE date(entry_date) >= date(?) AND date(entry_date) <= date(?)`
    )
    .get(start, end) as { count: number };
  return row.count;
}

function getCashBalance() {
  const servicesRevenue = db
    .prepare(
      `SELECT COALESCE(SUM(total_charged), 0) as t FROM services WHERE status != 'cancelado'`
    )
    .get() as { t: number };
  const extra = db
    .prepare(`SELECT COALESCE(SUM(amount), 0) as t FROM extra_revenues`)
    .get() as { t: number };
  const expenses = db
    .prepare(`SELECT COALESCE(SUM(amount), 0) as t FROM expenses`)
    .get() as { t: number };
  return servicesRevenue.t + extra.t - expenses.t;
}

router.get('/', (_req, res) => {
  const { start, end } = getCurrentMonthRange();

  const servicesCount = countServicesMonth(start, end);
  const revenue = sumServicesRevenue(start, end) + sumExtraRevenue(start, end);
  const expenses = sumExpenses(start, end);
  const netProfit = revenue - expenses;
  const cashBalance = getCashBalance();

  const months = lastNMonths(6);
  const chartData = months.map(({ label, year, month }) => {
    const rangeStart = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const rangeEnd = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    const gains =
      sumServicesRevenue(rangeStart, rangeEnd) + sumExtraRevenue(rangeStart, rangeEnd);
    const costs = sumExpenses(rangeStart, rangeEnd);
    return { month: label, ganhos: gains, gastos: costs };
  });

  const recentServices = db
    .prepare(
      `SELECT s.id, s.description, s.status, s.entry_date, s.total_charged,
              c.name as client_name, s.brand, s.phone_model
       FROM services s
       JOIN clients c ON c.id = s.client_id
       ORDER BY s.created_at DESC
       LIMIT 5`
    )
    .all();

  const upcomingWarranties = db
    .prepare(
      `SELECT s.id, s.warranty_end, s.phone_model, s.brand, c.name as client_name, c.phone
       FROM services s
       JOIN clients c ON c.id = s.client_id
       WHERE s.warranty_end IS NOT NULL
         AND s.status IN ('concluido', 'entregue')
         AND date(s.warranty_end) >= date('now')
       ORDER BY s.warranty_end ASC
       LIMIT 10`
    )
    .all();

  res.json({
    summary: {
      servicesCount,
      revenue,
      netProfit,
      cashBalance,
    },
    chartData,
    recentServices,
    upcomingWarranties,
  });
});

export default router;
