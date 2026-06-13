const fs = require('fs/promises');
const path = require('path');
const {pgPool} = require('./db');

const migrationsDir = path.join(__dirname, 'migrations');

const ensureMigrationsTable = async (client) => {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      name TEXT PRIMARY KEY,
      executed_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
};

const getAppliedMigrations = async (client) => {
  const result = await client.query('SELECT name FROM schema_migrations ORDER BY name ASC');
  return new Set(result.rows.map(({name}) => name));
};

const getMigrationFiles = async () => {
  const files = await fs.readdir(migrationsDir);
  return files
    .filter((file) => file.endsWith('.sql'))
    .sort();
};

const runMigration = async (client, file) => {
  const sql = await fs.readFile(path.join(migrationsDir, file), 'utf8');

  await client.query('BEGIN');
  try {
    await client.query(sql);
    await client.query('INSERT INTO schema_migrations (name) VALUES ($1)', [file]);
    await client.query('COMMIT');
    console.info(`Applied migration: ${file}`);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  }
};

const migrate = async () => {
  const client = await pgPool.connect();

  try {
    await ensureMigrationsTable(client);
    const appliedMigrations = await getAppliedMigrations(client);
    const migrationFiles = await getMigrationFiles();
    const pendingMigrations = migrationFiles.filter((file) => !appliedMigrations.has(file));

    if (!pendingMigrations.length) {
      console.info('No pending migrations.');
      return;
    }

    for (const file of pendingMigrations) {
      await runMigration(client, file);
    }
  } finally {
    client.release();
    await pgPool.end();
  }
};

migrate().catch((err) => {
  console.error(err);
  process.exit(1);
});
