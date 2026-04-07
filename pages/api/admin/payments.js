import { getDb } from '../../../lib/db';
import { getSessionUser } from '../../../lib/auth';
import { normalizePence } from '../../../lib/expenses';

function normalizePaymentInput(payload = {}) {
  const userId = Number(payload.userId);
  const expenseIdRaw = payload.expenseId;
  const expenseId = expenseIdRaw === null || expenseIdRaw === undefined || expenseIdRaw === '' ? null : Number(expenseIdRaw);
  const amountPence = normalizePence(payload.amountPence);
  const notes = typeof payload.notes === 'string' ? payload.notes.trim() : '';
  const paymentDate = payload.paymentDate ? new Date(payload.paymentDate) : new Date();

  if (!Number.isInteger(userId) || userId <= 0) {
    return { error: 'Valid userId is required.' };
  }

  if (!Number.isInteger(amountPence) || amountPence < 0) {
    return { error: 'Payment amount must be zero or greater.' };
  }

  if (expenseId !== null && (!Number.isInteger(expenseId) || expenseId <= 0)) {
    return { error: 'expenseId must be null or a valid id.' };
  }

  if (Number.isNaN(paymentDate.getTime())) {
    return { error: 'Invalid payment date.' };
  }

  return {
    userId,
    expenseId,
    amountPence,
    notes,
    paymentDate: paymentDate.toISOString()
  };
}

export default async function handler(req, res) {
  const db = await getDb();
  const sessionUser = await getSessionUser(req, db);

  if (!sessionUser || !sessionUser.isAdmin) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method === 'GET') {
    const payments = await db.all(
      `SELECT p.id,
              p.user_id AS userId,
              u.name AS userName,
              p.expense_id AS expenseId,
              e.title AS expenseTitle,
              p.amount_pence AS amountPence,
              p.notes,
              p.payment_date AS paymentDate,
              p.created_at AS createdAt
       FROM payments p
       JOIN users u ON u.id = p.user_id
       LEFT JOIN expenses e ON e.id = p.expense_id
       WHERE p.deleted_at IS NULL
       ORDER BY datetime(p.payment_date) DESC, p.id DESC`
    );

    return res.status(200).json(payments);
  }

  if (req.method === 'POST') {
    const validated = normalizePaymentInput(req.body || {});
    if (validated.error) {
      return res.status(400).json({ error: validated.error });
    }

    const { userId, expenseId, amountPence, notes, paymentDate } = validated;

    if (expenseId !== null) {
      const expense = await db.get('SELECT id FROM expenses WHERE id = ? AND deleted_at IS NULL', [expenseId]);
      if (!expense) {
        return res.status(400).json({ error: 'Linked expense not found.' });
      }
    }

    const result = await db.run(
      `INSERT INTO payments (user_id, expense_id, amount_pence, notes, payment_date)
       VALUES (?, ?, ?, ?, ?)`,
      [userId, expenseId, amountPence, notes, paymentDate]
    );

    return res.status(201).json({ id: result.lastID });
  }

  if (req.method === 'DELETE') {
    const paymentId = Number(req.query.id);

    if (!Number.isInteger(paymentId) || paymentId <= 0) {
      return res.status(400).json({ error: 'Valid payment id is required.' });
    }

    await db.run(
      `UPDATE payments
       SET deleted_at = CURRENT_TIMESTAMP
       WHERE id = ?
         AND deleted_at IS NULL`,
      [paymentId]
    );

    return res.status(200).json({ success: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
