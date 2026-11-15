// Database backup utility exporting table schemas and records to JSON.
const mysql = require("mysql2/promise");
const fs = require("fs");
const path = require("path");

async function backup() {
  const conn = await mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "",
    database: "bantug_university_db"
  });

  const [tables] = await conn.query("SHOW TABLES");
  const tableNames = tables.map(t => Object.values(t)[0]);

  console.log("Found tables:", tableNames);

  const backupDir = path.join(__dirname, '../../database/backups');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupFile = path.join(backupDir, `bantug_university_db_backup_${timestamp}.json`);

  const dump = {
    database: "bantug_university_db",
    createdAt: new Date().toISOString(),
    schema: {},
    data: {}
  };

  for (const table of tableNames) {
    const [createRes] = await conn.query(`SHOW CREATE TABLE \`${table}\``);
    dump.schema[table] = createRes[0]["Create Table"];

    const [rows] = await conn.query(`SELECT * FROM \`${table}\``);
    dump.data[table] = rows;
    console.log(`Table ${table}: ${rows.length} rows`);
  }

  fs.writeFileSync(backupFile, JSON.stringify(dump, null, 2), "utf8");
  console.log(`\nBackup successfully written to: ${backupFile}`);

  await conn.end();
}

backup().catch(console.error);

