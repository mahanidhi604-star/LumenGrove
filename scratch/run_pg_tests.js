const { PGlite } = require('@electric-sql/pglite');
const { pgcrypto } = require('@electric-sql/pglite/contrib/pgcrypto');
const fs = require('fs');
const path = require('path');

async function run() {
  const db = new PGlite({
    extensions: { pgcrypto }
  });

  console.log('--- 1. Initializing Auth Schema and Roles ---');
  await db.exec(`
    CREATE SCHEMA IF NOT EXISTS auth;
    CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
      SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid;
    $$;
    CREATE TABLE IF NOT EXISTS auth.users (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      email text UNIQUE,
      raw_app_meta_data jsonb DEFAULT '{}'::jsonb,
      raw_user_meta_data jsonb DEFAULT '{}'::jsonb,
      created_at timestamptz DEFAULT now(),
      updated_at timestamptz DEFAULT now()
    );
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'anon') THEN
        CREATE ROLE anon NOLOGIN;
      END IF;
      IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'authenticated') THEN
        CREATE ROLE authenticated NOLOGIN;
      END IF;
    END $$;
    GRANT USAGE ON SCHEMA public TO anon, authenticated;
    GRANT USAGE ON SCHEMA auth TO anon, authenticated;
    GRANT SELECT ON auth.users TO anon, authenticated;
  `);

  console.log('--- 2. Applying Migrations ---');
  const migrations = [
    'supabase/migrations/20261108000001_create_schema.sql',
    'supabase/migrations/20261108000002_auth_hooks_and_roles.sql',
    'supabase/migrations/20261108000003_enable_rls.sql',
    'supabase/migrations/20261108000004_atomic_rental_functions.sql',
    'supabase/seed.sql'
  ];

  for (const m of migrations) {
    console.log(`Executing ${m}...`);
    const sql = fs.readFileSync(path.resolve(m), 'utf8');
    await db.exec(sql);
  }
  console.log('Migrations and Seed successfully applied!');

  console.log('--- 3. Running RLS & Security Test Suite ---');
  const testSql = fs.readFileSync(path.resolve('supabase/tests/test_rls_security.sql'), 'utf8');
  await db.exec(testSql);

  const res = await db.query('SELECT id, test_name, status, details FROM public.test_results ORDER BY id;');
  console.log('\n=== REAL POSTGRESQL TEST EXECUTION RESULTS ===\n');
  console.table(res.rows);
}

run().catch(err => {
  console.error('Fatal error during test execution:', err);
  process.exit(1);
});
