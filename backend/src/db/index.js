const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const DATABASE_PATH = process.env.DATABASE_PATH || './data/kinakana.sqlite';
const fullPath = path.resolve(__dirname, '../../', DATABASE_PATH);

// Garante que a pasta de dados existe
fs.mkdirSync(path.dirname(fullPath), { recursive: true });

const db = new Database(fullPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

function initSchema() {
  const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf-8');
  db.exec(schema);
}

module.exports = { db, initSchema, fullPath };
