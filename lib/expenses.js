function normalizePence(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return null;
  }

  return Math.round(numeric);
}

function parseSplitInput(splits = []) {
  if (!Array.isArray(splits) || splits.length === 0) {
    return { error: 'At least one split is required.' };
  }

  const normalized = [];
  for (const split of splits) {
    const userId = Number(split?.userId);
    const amountPence = normalizePence(split?.amountPence);

    if (!Number.isInteger(userId) || userId <= 0) {
      return { error: 'Each split must include a valid userId.' };
    }
    if (!Number.isInteger(amountPence) || amountPence < 0) {
      return { error: 'Split amounts must be zero or greater.' };
    }

    normalized.push({ userId, amountPence });
  }

  const aggregated = new Map();
  for (const split of normalized) {
    aggregated.set(split.userId, (aggregated.get(split.userId) || 0) + split.amountPence);
  }

  const mergedSplits = [...aggregated.entries()].map(([userId, amountPence]) => ({
    userId,
    amountPence
  }));

  const totalPence = mergedSplits.reduce((sum, split) => sum + split.amountPence, 0);

  return { splits: mergedSplits, totalPence };
}

async function getUserBalances(db) {
  const rows = await db.all(
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
     SELECT u.id AS user_id,
            u.name,
            COALESCE(owed.owed_pence, 0) AS owed_pence,
            COALESCE(paid.paid_pence, 0) AS paid_pence,
            COALESCE(paid.paid_pence, 0) - COALESCE(owed.owed_pence, 0) AS balance_pence
     FROM users u
     LEFT JOIN owed ON owed.user_id = u.id
     LEFT JOIN paid ON paid.user_id = u.id
     ORDER BY u.name COLLATE NOCASE ASC`
  );

  return rows;
}

async function getUserMoneySummary(db, userId) {
  const summary =
    (await db.get(
      `WITH owed AS (
         SELECT COALESCE(SUM(es.amount_pence), 0) AS owed_pence
         FROM expense_splits es
         JOIN expenses e ON e.id = es.expense_id
         WHERE es.user_id = ?
           AND e.deleted_at IS NULL
       ),
       paid AS (
         SELECT COALESCE(SUM(amount_pence), 0) AS paid_pence
         FROM payments
         WHERE user_id = ?
           AND deleted_at IS NULL
       )
       SELECT owed.owed_pence AS owed_pence,
              paid.paid_pence AS paid_pence,
              (paid.paid_pence - owed.owed_pence) AS balance_pence
       FROM owed, paid`,
      [userId, userId]
    )) || { owed_pence: 0, paid_pence: 0, balance_pence: 0 };

  const recentExpenses = await db.all(
    `SELECT e.id,
            e.title,
            e.notes,
            e.expense_date,
            es.amount_pence
     FROM expense_splits es
     JOIN expenses e ON e.id = es.expense_id
     WHERE es.user_id = ?
       AND e.deleted_at IS NULL
     ORDER BY datetime(e.expense_date) DESC, e.id DESC
     LIMIT 5`,
    [userId]
  );

  const recentPayments = await db.all(
    `SELECT p.id,
            p.amount_pence,
            p.notes,
            p.payment_date,
            p.expense_id,
            e.title AS expense_title
     FROM payments p
     LEFT JOIN expenses e ON e.id = p.expense_id
     WHERE p.user_id = ?
       AND p.deleted_at IS NULL
     ORDER BY datetime(p.payment_date) DESC, p.id DESC
     LIMIT 5`,
    [userId]
  );

  return {
    summary,
    recentExpenses,
    recentPayments
  };
}

async function getExpensesWithSplitsAndPayments(db) {
  const expenses = await db.all(
    `SELECT id, title, notes, expense_date, created_at, updated_at
     FROM expenses
     WHERE deleted_at IS NULL
     ORDER BY datetime(expense_date) DESC, id DESC`
  );

  for (const expense of expenses) {
    expense.splits = await db.all(
      `SELECT es.id, es.user_id AS userId, u.name AS userName, es.amount_pence AS amountPence
       FROM expense_splits es
       JOIN users u ON u.id = es.user_id
       WHERE es.expense_id = ?
       ORDER BY u.name COLLATE NOCASE ASC`,
      [expense.id]
    );

    expense.totalPence = expense.splits.reduce((sum, split) => sum + split.amountPence, 0);

    expense.payments = await db.all(
      `SELECT p.id,
              p.user_id AS userId,
              u.name AS userName,
              p.amount_pence AS amountPence,
              p.notes,
              p.payment_date AS paymentDate
       FROM payments p
       JOIN users u ON u.id = p.user_id
       WHERE p.expense_id = ?
         AND p.deleted_at IS NULL
       ORDER BY datetime(p.payment_date) DESC, p.id DESC`,
      [expense.id]
    );
  }

  return expenses;
}

function formatPoundsFromPence(pence = 0) {
  const pounds = Number(pence || 0) / 100;
  return `£${pounds.toFixed(2)}`;
}

export {
  normalizePence,
  parseSplitInput,
  getUserBalances,
  getUserMoneySummary,
  getExpensesWithSplitsAndPayments,
  formatPoundsFromPence
};
