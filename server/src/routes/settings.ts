import { Router } from 'express';
import bcrypt from 'bcryptjs';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { db, uploadsDir } from '../db.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();
router.use(authMiddleware);

const logoDir = path.join(uploadsDir, 'store');
if (!fs.existsSync(logoDir)) fs.mkdirSync(logoDir, { recursive: true });

const logoUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, logoDir),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname) || '.png';
      cb(null, `logo${ext}`);
    },
  }),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (/\.(jpg|jpeg|png|webp|svg)$/i.test(file.originalname)) cb(null, true);
    else cb(new Error('Formato de imagem inválido'));
  },
});

router.get('/', (_req, res) => {
  const store = db.prepare('SELECT * FROM store_settings WHERE id = 1').get();
  const user = db.prepare('SELECT id, username FROM users LIMIT 1').get();
  res.json({ store, user });
});

router.put('/store', (req, res) => {
  const { store_name, address, cnpj, warranty_template } = req.body;
  db.prepare(
    `UPDATE store_settings SET
      store_name = COALESCE(?, store_name),
      address = COALESCE(?, address),
      cnpj = COALESCE(?, cnpj),
      warranty_template = COALESCE(?, warranty_template)
     WHERE id = 1`
  ).run(store_name, address, cnpj, warranty_template);
  const store = db.prepare('SELECT * FROM store_settings WHERE id = 1').get();
  res.json(store);
});

router.put('/password', (req, res) => {
  const { current_password, new_password } = req.body;
  if (!current_password || !new_password || new_password.length < 6) {
    return res.status(400).json({
      error: 'Senha atual e nova senha são obrigatórias (mínimo 6 caracteres)',
    });
  }
  const user = db
    .prepare('SELECT id, password_hash FROM users WHERE id = ?')
    .get(req.user!.userId) as { id: number; password_hash: string };

  if (!user || !bcrypt.compareSync(current_password, user.password_hash)) {
    return res.status(401).json({ error: 'Senha atual incorreta' });
  }
  const hash = bcrypt.hashSync(new_password, 10);
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hash, user.id);
  res.json({ message: 'Senha alterada com sucesso' });
});

router.post('/logo', logoUpload.single('logo'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Arquivo não enviado' });
  const relativePath = path.join('store', req.file.filename).replace(/\\/g, '/');
  db.prepare('UPDATE store_settings SET logo_path = ? WHERE id = 1').run(relativePath);
  res.json({ logo_path: relativePath });
});

router.get('/backup', (_req, res) => {
  const backup = {
    version: 1,
    exported_at: new Date().toISOString(),
    store_settings: db.prepare('SELECT * FROM store_settings').all(),
    clients: db.prepare('SELECT * FROM clients').all(),
    services: db.prepare('SELECT * FROM services').all(),
    installments: db.prepare('SELECT * FROM installments').all(),
    expenses: db.prepare('SELECT * FROM expenses').all(),
    extra_revenues: db.prepare('SELECT * FROM extra_revenues').all(),
    service_photos: db.prepare('SELECT * FROM service_photos').all(),
    users: db.prepare('SELECT id, username, password_hash FROM users').all(),
  };
  res.setHeader('Content-Type', 'application/json');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="primecell-backup-${new Date().toISOString().slice(0, 10)}.json"`
  );
  res.json(backup);
});

router.post('/restore', (req, res) => {
  const data = req.body;
  if (!data?.clients || !data?.services) {
    return res.status(400).json({ error: 'Arquivo de backup inválido' });
  }

  const restore = db.transaction(() => {
    db.prepare('DELETE FROM service_photos').run();
    db.prepare('DELETE FROM installments').run();
    db.prepare('DELETE FROM services').run();
    db.prepare('DELETE FROM expenses').run();
    db.prepare('DELETE FROM extra_revenues').run();
    db.prepare('DELETE FROM clients').run();

    if (data.store_settings?.[0]) {
      const s = data.store_settings[0];
      db.prepare(
        `UPDATE store_settings SET store_name = ?, address = ?, cnpj = ?,
         logo_path = ?, warranty_template = ? WHERE id = 1`
      ).run(s.store_name, s.address, s.cnpj, s.logo_path || '', s.warranty_template || '');
    }

    const insertClient = db.prepare(
      `INSERT INTO clients (id, name, phone, cpf, email, address, notes, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    );
    for (const c of data.clients) {
      insertClient.run(
        c.id, c.name, c.phone, c.cpf, c.email, c.address, c.notes, c.created_at
      );
    }

    const insertService = db.prepare(`
      INSERT INTO services (
        id, client_id, phone_model, brand, color, imei, device_password,
        description, repair_details, parts_used, pre_existing_defects, technical_notes,
        entry_date, delivery_date, status, warranty_days, warranty_start, warranty_end,
        warranty_file, part_cost, labor_cost, total_charged, profit, payment_method,
        paid_in_full, installments_count, created_at, updated_at
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
      )
    `);
    for (const s of data.services) {
      insertService.run(
        s.id, s.client_id, s.phone_model, s.brand, s.color, s.imei, s.device_password,
        s.description, s.repair_details, s.parts_used, s.pre_existing_defects, s.technical_notes,
        s.entry_date, s.delivery_date, s.status, s.warranty_days, s.warranty_start, s.warranty_end,
        s.warranty_file, s.part_cost, s.labor_cost, s.total_charged, s.profit, s.payment_method,
        s.paid_in_full, s.installments_count, s.created_at, s.updated_at
      );
    }

    if (data.installments) {
      const insertInst = db.prepare(
        `INSERT INTO installments (id, service_id, number, amount, due_date, status)
         VALUES (?, ?, ?, ?, ?, ?)`
      );
      for (const i of data.installments) {
        insertInst.run(i.id, i.service_id, i.number, i.amount, i.due_date, i.status);
      }
    }

    if (data.expenses) {
      const insertExp = db.prepare(
        `INSERT INTO expenses (id, description, amount, date, category, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`
      );
      for (const e of data.expenses) {
        insertExp.run(e.id, e.description, e.amount, e.date, e.category, e.created_at);
      }
    }

    if (data.extra_revenues) {
      const insertRev = db.prepare(
        `INSERT INTO extra_revenues (id, description, amount, date, created_at)
         VALUES (?, ?, ?, ?, ?)`
      );
      for (const r of data.extra_revenues) {
        insertRev.run(r.id, r.description, r.amount, r.date, r.created_at);
      }
    }

    if (data.service_photos) {
      const insertPhoto = db.prepare(
        `INSERT INTO service_photos (id, service_id, file_path, created_at)
         VALUES (?, ?, ?, ?)`
      );
      for (const p of data.service_photos) {
        insertPhoto.run(p.id, p.service_id, p.file_path, p.created_at);
      }
    }
  });

  try {
    restore();
    res.json({ message: 'Backup restaurado com sucesso' });
  } catch (err) {
    res.status(500).json({
      error: err instanceof Error ? err.message : 'Erro ao restaurar backup',
    });
  }
});

export default router;
