const mysql = require('mysql2/promise');
(async () => {
  const c = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'ecom1',
  });
  const [rows] = await c.query("SHOW COLUMNS FROM product_variant LIKE 'sku'");
  if (rows.length) {
    console.log('sku column already exists');
    await c.end();
    return;
  }
  await c.query(
    'ALTER TABLE product_variant ADD COLUMN sku VARCHAR(64) NULL, ADD INDEX idx_sku (sku)',
  );
  console.log('Added sku column to product_variant');
  await c.end();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
