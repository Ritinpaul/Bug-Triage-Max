const fs = require('fs');
let c = fs.readFileSync('db/seed-direct.ts', 'utf8');

c = c.replace('import mysql from "mysql2/promise";', 'import postgres from "postgres";');

c = c.replace(/const url = new URL\(dbUrl\);[\s\S]*?database: url.pathname.slice\(1\),\n\s*\}\);/, 'const sql = postgres(dbUrl);');

c = c.replace(/await connection\.execute\("DELETE FROM (.*?)"\);/g, 'await sql`DELETE FROM $1`;');

c = c.replace(/await connection\.execute\(`([\s\S]*?)`\);/g, 'await sql.unsafe(`$1`);');

c = c.replace(/await connection\.execute\(\n\s*`([\s\S]*?)`,\n\s*\[(.*?)\]\n\s*\);/g, 'await sql.unsafe(`$1`, [$2]);');

c = c.replace(/await connection\.end\(\);/g, 'await sql.end();');

fs.writeFileSync('db/seed-direct.ts', c);
