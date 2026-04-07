import { getDb } from '../../../lib/db';
import { getSessionUser } from '../../../lib/auth';
import { getExpensesWithSplitsAndPayments, parseSplitInput } from '../../../lib/expenses';

function validateExpenseInput(payload = {}) {
  const title = String(payload.title || '').trim();
  const notes = typeof payload.notes === 'string' ? payload.notes.trim() : '';
  const expenseDate = payload.expenseDate ? new Date(payload.expenseDate) : new Date();

  if (!title) {
    return { error: 'Title is required.' };
  }

  if (Number.isNaN(expenseDate.getTime())) {
    return { error: 'Invalid expense date.' };
  }

  const splitResult = parseSplitInput(payload.splits || []);
  if (splitResult.error) {
    return { error: splitResult.error };
  }

  return {
    title,
    notes,
    expenseDate: expenseDate.toISOString(),
    splits: splitResult.splits,
    totalPence: splitResult.totalPence
  };
}

export default async function handler(req, res) {
  const db = await getDb();
  const sessionUser = await getSessionUser(req, db);

  if (!sessionUser || !sessionUser.isAdmin) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method === 'GET') {
    const [expenses, balances] = await Promise.all([
      getExpensesWithSplitsAndPayments(db),
      db.all(
        `WITH owed AS (
           SELECT es.user_id, COALESCE(SUM(es.amount_pence), 0) AS owed_pence
           FROM expense_splits es
           JOIN expenses e ON e.id = es.expense_id
           WHERE e.deleted_at IS NULL
           GROUP BY es.user_id
         ),
         paid AS (
           SELECT p.user_id, COALESCE(SUM(p.amount_pence), 0) AS paid_pence
           FROM payments p
           WHERE p.deleted_at IS NULL
           GROUP BY p.user_id
         )
         SELECT u.id AS userId,
                u.name,
                COALESCE(owed.owed_pence, 0) AS owedPence,
                COALESCE(paid.paid_pence, 0) AS paidPence,
                COALESCE(paid.paid_pence, 0) - COALESCE(owed.owed_pence, 0) AS balancePence
         FROM users u
         LEFT JOIN owed ON owed.user_id = u.id
         LEFT JOIN paid ON paid.user_id = u.id
         ORDER BY u.name COLLATE NOCASE ASC`
      )
    ]);

    return res.status(200).json({ expenses, balances });
  }

  if (req.method === 'POST') {
    const validated = validateExpenseInput(req.body || {});
    if (validated.error) {
      return res.status(400).json({ error: validated.error });
    }

    const { title, notes, expenseDate, splits } = validated;

    await db.exec('BEGIN TRANSACTION');
    try {
      const insertExpense = await db.run(
        `INSERT INTO expenses (title, notes, expense_date, updated_at)
         VALUES (?, ?, ?, CURRENT_TIMESTAMP)`,
        [title, notes, expenseDate]
      );

      for (const split of splits) {
        await db.run(
          `INSERT INTO expense_splits (expense_id, user_id, amount_pence)
           VALUES (?, ?, ?)`,
          [insertExpense.lastID, split.userId, split.amountPence]
        );
      }

      await db.exec('COMMIT');
      return res.status(201).json({ id: insertExpense.lastID });
    } catch (err) {
      await db.exec('ROLLBACK');
      return res.status(500).json({ error: 'Failed to create expense.' });
    }
  }

  if (req.method === 'PATCH') {
    const expenseId = Number(req.body?.id);
    if (!Number.isInteger(expenseId) || expenseId <= 0) {
      return res.status(400).json({ error: 'Valid expense id is required.' });
    }

    const existing = await db.get('SELECT id FROM expenses WHERE id = ? AND deleted_at IS NULL', [expenseId]);
    if (!existing) {
      return res.status(404).json({ error: 'Expense not found.' });
    }

    const validated = validateExpenseInput(req.body || {});
    if (validated.error) {
      return res.status(400).json({ error: validated.error });
    }

    const { title, notes, expenseDate, splits } = validated;

    await db.exec('BEGIN TRANSACTION');
    try {
      await db.run(
        `UPDATE expenses
         SET title = ?, notes = ?, expense_date = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [title, notes, expenseDate, expenseId]
      );

      await db.run('DELETE FROM expense_splits WHERE expense_id = ?', [expenseId]);

      for (const split of splits) {
        await db.run(
          `INSERT INTO expense_splits (expense_id, user_id, amount_pence)
           VALUES (?, ?, ?)`,
          [expenseId, split.userId, split.amountPence]
        );
      }

      await db.exec('COMMIT');
      return res.status(200).json({ success: true });
    } catch (err) {
      await db.exec('ROLLBACK');
      return res.status(500).json({ error: 'Failed to update expense.' });
    }
  }

  if (req.method === 'DELETE') {
    const expenseId = Number(req.query.id);
    if (!Number.isInteger(expenseId) || expenseId <= 0) {
      return res.status(400).json({ error: 'Valid expense id is required.' });
    }

    await db.run(
      `UPDATE expenses
       SET deleted_at = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?
         AND deleted_at IS NULL`,
      [expenseId]
    );

    return res.status(200).json({ success: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
