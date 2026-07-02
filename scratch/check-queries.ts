import 'dotenv/config';
import postgres from 'postgres';

const sql = postgres(process.env.DATABASE_URL!, { ssl: 'require' });

// Simulate the exact failing query
try {
  const last7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const r = await sql`
    SELECT count(*), 
      sum(case when status = 'open' then 1 else 0 end),
      sum(case when status = 'in_progress' then 1 else 0 end),
      sum(case when status in ('resolved', 'closed') and updated_at >= ${last7d} then 1 else 0 end),
      avg(case when resolution_time is not null then resolution_time end)
    FROM bug_reports
  `;
  console.log('bugStats OK:', JSON.stringify(r));
} catch (e: any) {
  console.error('bugStats ERROR:', e.message);
}

// Test message stats
try {
  const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const r = await sql`
    SELECT count(*), source FROM messages WHERE created_at >= ${last24h} GROUP BY source
  `;
  console.log('messageStats OK:', JSON.stringify(r));
} catch (e: any) {
  console.error('messageStats ERROR:', e.message);
}

await sql.end();
