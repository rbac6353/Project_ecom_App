/**
 * สร้างบัญชีทดสอบ 4 บัญชี:
 * - admin@gmail.com / 12345678 (role: admin)
 * - user@gmail.com / 12345678 (role: user)
 * - seller1@gmail.com / 12345678 (role: seller)
 * - courier@gmail.com / 12345678 (role: courier)
 *
 * รัน: npx ts-node -r tsconfig-paths/register scripts/seed-test-accounts.ts
 * หรือ: npm run seed:test-accounts
 */

import 'dotenv/config';
import * as mysql from 'mysql2/promise';
import * as bcrypt from 'bcrypt';

const TEST_ACCOUNTS = [
  { email: 'admin@gmail.com', password: '12345678', name: 'Admin', role: 'admin' },
  { email: 'user@gmail.com', password: '12345678', name: 'User', role: 'user' },
  { email: 'seller1@gmail.com', password: '12345678', name: 'Seller', role: 'seller' },
  { email: 'sellermall1@gmail.com', password: '12345678', name: 'Seller Mall', role: 'seller' },
  { email: 'courier@gmail.com', password: '12345678', name: 'Courier', role: 'courier' },
];

async function getConnectionConfig(): Promise<mysql.ConnectionOptions> {
  const url = process.env.DATABASE_URL;
  if (url) {
    // Parse DATABASE_URL (e.g. mysql://user:pass@host:3306/dbname)
    const match = url.match(/mysql:\/\/([^:]+):([^@]*)@([^:]+):(\d+)\/(.+)/);
    if (match) {
      const [, user, password, host, port, database] = match;
      return {
        host: host || 'localhost',
        port: parseInt(port || '3306', 10),
        user: user || 'root',
        password: password || '',
        database: database || 'ecom1',
      };
    }
  }
  return {
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'ecom1',
  };
}

async function seedTestAccounts() {
  const config = await getConnectionConfig();
  const connection = await mysql.createConnection(config);

  const hashedPassword = await bcrypt.hash('12345678', 12);

  console.log('สร้างบัญชีทดสอบ...\n');

  for (const acc of TEST_ACCOUNTS) {
    try {
      const [existing] = await connection.execute(
        'SELECT id FROM user WHERE email = ?',
        [acc.email],
      );
      const rows = existing as { id: number }[];

      if (rows.length > 0) {
        await connection.execute(
          `UPDATE user SET password = ?, name = ?, role = ?, enabled = 1, isEmailVerified = 1, verificationToken = NULL, updatedAt = NOW() WHERE email = ?`,
          [hashedPassword, acc.name, acc.role, acc.email],
        );
        console.log(`  ✓ อัปเดตแล้ว: ${acc.email} (${acc.role})`);
      } else {
        await connection.execute(
          `INSERT INTO user (email, password, name, role, enabled, isEmailVerified, createdAt, updatedAt)
           VALUES (?, ?, ?, ?, 1, 1, NOW(), NOW())`,
          [acc.email, hashedPassword, acc.name, acc.role],
        );
        console.log(`  ✓ สร้างใหม่: ${acc.email} (${acc.role})`);
      }
    } catch (err) {
      console.error(`  ✗ ล้มเหลว ${acc.email}:`, err);
    }
  }

  await connection.end();
  console.log('\nเสร็จสิ้น บัญชีทั้งหมดใช้รหัสผ่าน: 12345678');
}

seedTestAccounts().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
