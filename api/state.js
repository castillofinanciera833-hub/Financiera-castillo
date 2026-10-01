const { neon } = require('@neondatabase/serverless');

const sql = neon(process.env.DATABASE_URL);

async function ensureTable() {
  await sql`CREATE TABLE IF NOT EXISTS fc_state (
    id SMALLINT PRIMARY KEY,
    state JSONB NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`;
}

function validState(state) {
  return state && Array.isArray(state.clients) && Array.isArray(state.payments) &&
    (!state.cuts || Array.isArray(state.cuts));
}

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'GET,PUT,OPTIONS');

  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    if (!process.env.DATABASE_URL) {
      return res.status(500).json({ ok: false, error: 'DATABASE_URL no está configurada en Vercel.' });
    }

    await ensureTable();

    if (req.method === 'GET') {
      if (req.query && req.query.reset === '1') { await sql`DELETE FROM fc_state WHERE id = 1`; return res.status(200).json({ ok: true, reset: true }); }
      const rows = await sql`SELECT state, updated_at FROM fc_state WHERE id = 1`;
      if (!rows.length) return res.status(200).json({ ok: true, exists: false, state: null });
      return res.status(200).json({ ok: true, exists: true, state: rows[0].state, updatedAt: rows[0].updated_at });
    }

    if (req.method === 'PUT') {
      const state = req.body;
      if (!validState(state)) return res.status(400).json({ ok: false, error: 'Datos inválidos.' });
      await sql`INSERT INTO fc_state (id, state, updated_at)
        VALUES (1, ${JSON.stringify(state)}::jsonb, NOW())
        ON CONFLICT (id) DO UPDATE SET state = EXCLUDED.state, updated_at = NOW()`;
      return res.status(200).json({ ok: true, savedAt: new Date().toISOString() });
    }

    return res.status(405).json({ ok: false, error: 'Método no permitido.' });
  } catch (error) {
    console.error('fc_state error', error);
    return res.status(500).json({ ok: false, error: 'Error de base de datos.' });
  }
};
