/**
 * Verification script: Sign up via API and confirm user exists in PostgreSQL
 * Run: node verify-signup.js
 */

import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const API_URL = 'http://localhost:3000';
const { Pool } = pg;

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'dailydollar',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
});

async function verifySignup() {
  const testEmail = `verify_${Date.now()}@test.com`;
  const testUsername = `verifyuser_${Date.now().toString(36).slice(-6)}`;
  const testPassword = 'VerifyTest123';

  console.log('\n=== Signup Verification ===\n');
  console.log('1. Calling signup API...');
  console.log(`   Email: ${testEmail}`);
  console.log(`   Username: ${testUsername}\n`);

  const response = await fetch(`${API_URL}/api/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: testEmail,
      username: testUsername,
      password: testPassword,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    console.error('❌ Signup failed:', data);
    process.exit(1);
  }

  console.log('✅ Signup API success');
  console.log('   User ID:', data.user?.id);
  console.log('   Email:', data.user?.email);
  console.log('   Username:', data.user?.username);
  console.log('   Created:', data.user?.created_at);
  console.log('');

  // Verify in database
  console.log('2. Verifying user in PostgreSQL...\n');

  const result = await pool.query(
    'SELECT id, email, username, created_at, is_active FROM users WHERE id = $1',
    [data.user.id]
  );

  if (result.rows.length === 0) {
    console.error('❌ User NOT found in database!');
    process.exit(1);
  }

  const dbUser = result.rows[0];
  console.log('✅ User found in PostgreSQL:');
  console.log('   ID:', dbUser.id);
  console.log('   Email:', dbUser.email);
  console.log('   Username:', dbUser.username);
  console.log('   Created:', dbUser.created_at);
  console.log('   Active:', dbUser.is_active);
  console.log('');

  // Verify wallet was created
  const walletResult = await pool.query(
    'SELECT id, balance FROM wallets WHERE user_id = $1',
    [data.user.id]
  );

  if (walletResult.rows.length > 0) {
    console.log('✅ Wallet created:', walletResult.rows[0]);
  } else {
    console.log('⚠️  No wallet found (check trigger)');
  }

  console.log('\n=== Verification Complete ===\n');
  await pool.end();
}

verifySignup().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
