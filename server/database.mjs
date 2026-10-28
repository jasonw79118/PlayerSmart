import pg from 'pg'

const { Pool } = pg
let pool

export function getPool() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is required by the server')
  }
  pool ??= new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 3,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 8_000,
    ssl: { require: true },
  })
  return pool
}

export async function checkDatabase() {
  const result = await getPool().query('select 1 as connected')
  return result.rows[0]?.connected === 1
}

export async function closeDatabase() {
  if (pool) {
    await pool.end()
    pool = undefined
  }
}
