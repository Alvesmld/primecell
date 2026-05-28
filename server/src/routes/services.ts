import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { db, uploadsDir } from '../db.js';
import { authMiddleware } from '../middleware/auth.js';
import { parsePeriod } from '../utils/dates.js';
import { calcProfit, resolveWarrantyDates } from '../utils/serviceHelpers.js';

const router = Router();
router.use(authMiddleware);

const storage = multer.diskStorage({
  destination: (req, _file, cb) => {
    const dir = path.join(uploadsDir, 'services', String(req.params.id || 'temp'));
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || '.bin';
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = /\.(pdf|jpg|jpeg|png|webp)$/i;
    if (allowed.test(file.originalname)) cb(null, true);
    else cb(new Error('Tipo de arquivo não permitido'));
  },
});

interface InstallmentInput {
  number: number;
  amount: number;
  due_date: string;
  status?: string;
}

function getServiceWithRelations(id: number) {
  const service = db
    .prepare(
      `SELECT s.*, c.name as client_name, c.phone as client_phone, c.cpf as client_cpf
       FROM services s
       JOIN clients c ON c.id = s.client_id
       WHERE s.id = ?`
    )
    .get(id) as Record<string, unknown> | undefined;

  if (!service) return null;

  const installments = db
    .prepare('SELECT * FROM installments WHERE service_id = ? ORDER BY number')
    .all(id);

  const photos = db
    .prepare('SELECT * FROM service_photos WHERE service_id = ? ORDER BY id')
    .all(id);

  return { ...service, installments, photos };
}

function upsertClient(data: {
  client_id?: number;
  client_name: string;
  client_phone: string;
  client_cpf?: string;
}): number {
  if (data.client_id) {
    db.prepare(
      `UPDATE clients SET name = ?, phone = ?, cpf = COALESCE(?, cpf) WHERE id = ?`
    ).run(data.client_name, data.client_phone, data.client_cpf || null, data.client_id);
    return data.client_id;
  }
  const existing = db
    .prepare('SELECT id FROM clients WHERE phone = ?')
    .get(data.client_phone) as { id: number } | undefined;
  if (existing) {
    db.prepare('UPDATE clients SET name = ?, cpf = COALESCE(?, cpf) WHERE id = ?').run(
      data.client_name,
      data.client_cpf || null,
      existing.id
    );
    return existing.id;
  }
  const r = db
    .prepare('INSERT INTO clients (name, phone, cpf) VALUES (?, ?, ?)')
    .run(data.client_name, data.client_phone, data.client_cpf || null);
  return Number(r.lastInsertRowid);
}

function saveInstallments(serviceId: number, installments: InstallmentInput[], paidInFull: boolean) {
  db.prepare('DELETE FROM installments WHERE service_id = ?').run(serviceId);
  if (paidInFull || !installments?.length) return;
  const insert = db.prepare(
    `INSERT INTO installments (service_id, number, amount, due_date, status)
     VALUES (?, ?, ?, ?, ?)`
  );
  for (const inst of installments) {
    insert.run(
      serviceId,
      inst.number,
      inst.amount,
      inst.due_date,
      inst.status || 'pendente'
    );
  }
}

router.get('/', (req, res) => {
  const status = req.query.status as string | undefined;
  const clientId = req.query.client_id as string | undefined;
  const q = (req.query.q as string)?.trim();
  const period = (req.query.period as string) || '';
  const start = req.query.start as string | undefined;
  const end = req.query.end as string | undefined;

  let sql = `
    SELECT s.id, s.description, s.status, s.entry_date, s.delivery_date,
           s.total_charged, s.profit, s.brand, s.phone_model, s.warranty_end,
           c.name as client_name, c.phone as client_phone
    FROM services s
    JOIN clients c ON c.id = s.client_id
    WHERE 1=1
  `;
  const params: (string | number)[] = [];

  if (status) {
    sql += ' AND s.status = ?';
    params.push(status);
  }
  if (clientId) {
    sql += ' AND s.client_id = ?';
    params.push(Number(clientId));
  }
  if (q) {
    sql += ` AND (c.name LIKE ? OR c.phone LIKE ? OR s.description LIKE ?
              OR s.brand LIKE ? OR s.phone_model LIKE ?)`;
    const pattern = `%${q}%`;
    params.push(pattern, pattern, pattern, pattern, pattern);
  }
  if (period) {
    const range = parsePeriod(period, start, end);
    sql += ' AND date(s.entry_date) >= date(?) AND date(s.entry_date) <= date(?)';
    params.push(range.start, range.end);
  }

  sql += ' ORDER BY s.created_at DESC';
  const services = db.prepare(sql).all(...params);
  res.json(services);
});

router.get('/:id', (req, res) => {
  const service = getServiceWithRelations(Number(req.params.id));
  if (!service) return res.status(404).json({ error: 'Serviço não encontrado' });
  res.json(service);
});

router.post('/', (req, res) => {
  const body = req.body;
  const {
    client_name,
    client_phone,
    client_cpf,
    client_id,
    phone_model,
    brand,
    color,
    imei,
    device_password,
    description,
    repair_details,
    parts_used,
    pre_existing_defects,
    technical_notes,
    entry_date,
    delivery_date,
    status = 'em_andamento',
    warranty_days = 30,
    warranty_start,
    part_cost = 0,
    labor_cost = 0,
    total_charged = 0,
    payment_method,
    paid_in_full = true,
    installments = [],
  } = body;

  if (!client_name?.trim() || !client_phone?.trim()) {
    return res.status(400).json({ error: 'Nome e telefone do cliente são obrigatórios' });
  }

  const clientId = upsertClient({
    client_id,
    client_name: client_name.trim(),
    client_phone: client_phone.trim(),
    client_cpf,
  });

  const profit = calcProfit(Number(total_charged), Number(part_cost));
  const warranty = resolveWarrantyDates(
    status,
    Number(warranty_days),
    entry_date,
    delivery_date,
    warranty_start
  );

  const result = db.prepare(`
    INSERT INTO services (
      client_id, phone_model, brand, color, imei, device_password,
      description, repair_details, parts_used, pre_existing_defects, technical_notes,
      entry_date, delivery_date, status, warranty_days, warranty_start, warranty_end,
      part_cost, labor_cost, total_charged, profit, payment_method, paid_in_full,
      installments_count
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
    )
  `).run(
    clientId, phone_model, brand, color, imei, device_password,
    description, repair_details, parts_used, pre_existing_defects, technical_notes,
    entry_date, delivery_date, status, warranty_days, warranty.warranty_start, warranty.warranty_end,
    part_cost, labor_cost, total_charged, profit, payment_method,
    paid_in_full ? 1 : 0,
    paid_in_full ? 1 : installments.length
  );

  const serviceId = Number(result.lastInsertRowid);
  saveInstallments(serviceId, installments, paid_in_full);

  const service = getServiceWithRelations(serviceId);
  res.status(201).json(service);
});

router.put('/:id', (req, res) => {
  const id = Number(req.params.id);
  const existing = db.prepare('SELECT * FROM services WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: 'Serviço não encontrado' });

  const body = req.body;
  const {
    client_name,
    client_phone,
    client_cpf,
    client_id,
    phone_model,
    brand,
    color,
    imei,
    device_password,
    description,
    repair_details,
    parts_used,
    pre_existing_defects,
    technical_notes,
    entry_date,
    delivery_date,
    status,
    warranty_days,
    warranty_start,
    part_cost,
    labor_cost,
    total_charged,
    payment_method,
    paid_in_full,
    installments = [],
  } = body;

  const clientId = upsertClient({
    client_id: client_id || (existing as { client_id: number }).client_id,
    client_name: client_name?.trim(),
    client_phone: client_phone?.trim(),
    client_cpf,
  });

  const profit = calcProfit(Number(total_charged), Number(part_cost));
  const warranty = resolveWarrantyDates(
    status,
    Number(warranty_days),
    entry_date,
    delivery_date,
    warranty_start || (existing as { warranty_start: string }).warranty_start
  );

  db.prepare(`
    UPDATE services SET
      client_id = ?, phone_model = ?, brand = ?, color = ?, imei = ?, device_password = ?,
      description = ?, repair_details = ?, parts_used = ?, pre_existing_defects = ?,
      technical_notes = ?, entry_date = ?, delivery_date = ?, status = ?,
      warranty_days = ?, warranty_start = ?, warranty_end = ?,
      part_cost = ?, labor_cost = ?, total_charged = ?, profit = ?,
      payment_method = ?, paid_in_full = ?, installments_count = ?,
      updated_at = datetime('now')
    WHERE id = ?
  `).run(
    clientId, phone_model, brand, color, imei, device_password,
    description, repair_details, parts_used, pre_existing_defects, technical_notes,
    entry_date, delivery_date, status, warranty_days, warranty.warranty_start, warranty.warranty_end,
    part_cost, labor_cost, total_charged, profit, payment_method,
    paid_in_full ? 1 : 0,
    paid_in_full ? 1 : installments.length,
    id
  );

  saveInstallments(id, installments, paid_in_full);
  res.json(getServiceWithRelations(id));
});

router.delete('/:id', (req, res) => {
  const id = Number(req.params.id);
  const existing = db.prepare('SELECT id FROM services WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: 'Serviço não encontrado' });

  const photos = db.prepare('SELECT file_path FROM service_photos WHERE service_id = ?').all(id) as {
    file_path: string;
  }[];
  const service = db.prepare('SELECT warranty_file FROM services WHERE id = ?').get(id) as {
    warranty_file: string | null;
  };

  db.prepare('DELETE FROM services WHERE id = ?').run(id);

  const dir = path.join(uploadsDir, 'services', String(id));
  if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });

  res.json({ message: 'Serviço excluído com sucesso' });
});

router.post('/:id/warranty-file', upload.single('file'), (req, res) => {
  const id = Number(req.params.id);
  if (!db.prepare('SELECT id FROM services WHERE id = ?').get(id)) {
    return res.status(404).json({ error: 'Serviço não encontrado' });
  }
  if (!req.file) return res.status(400).json({ error: 'Arquivo não enviado' });

  const relativePath = path.join('services', String(id), req.file.filename).replace(/\\/g, '/');
  db.prepare('UPDATE services SET warranty_file = ? WHERE id = ?').run(relativePath, id);
  res.json({ warranty_file: relativePath });
});

router.post('/:id/photos', upload.array('photos', 10), (req, res) => {
  const id = Number(req.params.id);
  if (!db.prepare('SELECT id FROM services WHERE id = ?').get(id)) {
    return res.status(404).json({ error: 'Serviço não encontrado' });
  }
  const files = req.files as Express.Multer.File[];
  if (!files?.length) return res.status(400).json({ error: 'Nenhuma foto enviada' });

  const insert = db.prepare(
    'INSERT INTO service_photos (service_id, file_path) VALUES (?, ?)'
  );
  const inserted = [];
  for (const file of files) {
    const relativePath = path.join('services', String(id), file.filename).replace(/\\/g, '/');
    const r = insert.run(id, relativePath);
    inserted.push(
      db.prepare('SELECT * FROM service_photos WHERE id = ?').get(r.lastInsertRowid)
    );
  }
  res.status(201).json(inserted);
});

router.delete('/:id/photos/:photoId', (req, res) => {
  const photo = db
    .prepare('SELECT * FROM service_photos WHERE id = ? AND service_id = ?')
    .get(req.params.photoId, req.params.id) as { file_path: string } | undefined;
  if (!photo) return res.status(404).json({ error: 'Foto não encontrada' });

  const fullPath = path.join(uploadsDir, photo.file_path);
  if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
  db.prepare('DELETE FROM service_photos WHERE id = ?').run(req.params.photoId);
  res.json({ message: 'Foto removida' });
});

router.patch('/:id/installments/:installmentId', (req, res) => {
  const { status } = req.body;
  if (!['pago', 'pendente'].includes(status)) {
    return res.status(400).json({ error: 'Status inválido' });
  }
  const result = db
    .prepare(
      `UPDATE installments SET status = ?
       WHERE id = ? AND service_id = ?`
    )
    .run(status, req.params.installmentId, req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Parcela não encontrada' });
  res.json(getServiceWithRelations(Number(req.params.id)));
});

export default router;
