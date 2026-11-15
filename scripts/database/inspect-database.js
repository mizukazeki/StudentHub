// Database inspection utility reporting table schema and record counts.
const mysql = require('mysql2/promise');

(async () => {
  const conn = await mysql.createConnection({
    host: '127.0.0.1',
    port: 3306,
    user: 'root',
    password: '',
    database: 'bantug_university_db'
  });

  const [cols] = await conn.query('SHOW COLUMNS FROM users');
  console.log('USERS COLUMNS:', cols.map(c => `${c.Field} (${c.Type})`));

  const [admins] = await conn.query("SELECT * FROM users WHERE role = 'admin' OR username = 'admin'");
  console.log('EXISTING ADMINS:', admins);

  const [tables] = await conn.query('SHOW TABLES');
  console.log('DATABASE TABLES:', tables.map(t => Object.values(t)[0]));

  await conn.end();
})().catch(console.error);

