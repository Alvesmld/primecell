import { Router } from 'express';
import { db } from '../db.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();
router.use(authMiddleware);

const listQuery = `
  SELECT c.id, c.name, c.phone, c.cpf, c.email, c.address, c.notes, c.created_at,
    COUNT(s.id) as services_count,
    COALESCE(SUM(CASE WHEN s.status != 'cancelado' THEN s.total_charged ELSE 0 END), 0) as total_spent
  FROM clients c
  LEFT JOIN services s ON s.client_id = c.id
`;

router.get('/', (req, res) => {
  const q = (req.query.q as string)?.trim();
  if (q) {
    const pattern = `%${q}%`;
    const clients = db
      .prepare(
        `${listQuery}
         WHERE c.name LIKE ? OR c.phone LIKE ? OR c.cpf LIKE ?
         GROUP BY c.id
         ORDER BY c.name LIMIT 50`
      )
      .all(pattern, pattern, pattern);
    return res.json(clients);
  }
  const clients = db
    .prepare(`${listQuery} GROUP BY c.id ORDER BY c.name`)
    .all();
  res.json(clients);
});

router.get('/:id', (req, res) => {
  const id = Number(req.params.id);
  const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(id);
  if (!client) return res.status(404).json({ error: 'Cliente não encontrado' });

  const services = db
    .prepare(
      `SELECT id, description, status, entry_date, delivery_date, total_charged,
              brand, phone_model, warranty_end
       FROM services WHERE client_id = ? ORDER BY entry_date DESC`
    )
    .all(id);

  const totalSpent = db
    .prepare(
      `SELECT COALESCE(SUM(total_charged), 0) as total
       FROM services WHERE client_id = ? AND status != 'cancelado'`
    )
    .get(id) as { total: number };

  const devices = db
    .prepare(
      `SELECT DISTINCT brand, phone_model, color
       FROM services WHERE client_id = ?
       AND (brand IS NOT NULL OR phone_model IS NOT NULL)`
    )
    .all(id);

  res.json({
    ...client,
    services,
    total_spent: totalSpent.total,
    devices,
  });
});

router.post('/', (req, res) => {
  const { name, phone, cpf, email, address, notes } = req.body;
  if (!name?.trim() || !phone?.trim()) {
    return res.status(400).json({ error: 'Nome e telefone são obrigatórios' });
  }
  const result = db
    .prepare(
      `INSERT INTO clients (name, phone, cpf, email, address, notes)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(name.trim(), phone.trim(), cpf || null, email || null, address || null, notes || null);
  const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(client);
});

router.put('/:id', (req, res) => {
  const id = Number(req.params.id);
  const existing = db.prepare('SELECT id FROM clients WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: 'Cliente não encontrado' });

  const { name, phone, cpf, email, address, notes } = req.body;
  if (!name?.trim() || !phone?.trim()) {
    return res.status(400).json({ error: 'Nome e telefone são obrigatórios' });
  }
  db.prepare(
    `UPDATE clients SET name = ?, phone = ?, cpf = ?, email = ?, address = ?, notes = ?
     WHERE id = ?`
  ).run(name.trim(), phone.trim(), cpf || null, email || null, address || null, notes || null, id);

  const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(id);
  res.json(client);
});

router.delete('/:id', (req, res) => {
  const id = Number(req.params.id);
  const existing = db.prepare('SELECT id FROM clients WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: 'Cliente não encontrado' });

  const servicesCount = db
    .prepare('SELECT COUNT(*) as c FROM services WHERE client_id = ?')
    .get(id) as { c: number };
  if (servicesCount.c > 0) {
    return res.status(400).json({
      error: 'Cliente possui serviços vinculados. Exclua os serviços antes.',
    });
  }

  db.prepare('DELETE FROM clients WHERE id = ?').run(id);
  res.json({ message: 'Cliente excluído com sucesso' });
});

export default router;
