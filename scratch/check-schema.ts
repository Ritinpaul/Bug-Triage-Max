import 'dotenv/config';
import postgres from 'postgres';

const sql = postgres(process.env.DATABASE_URL!, { ssl: 'require' });

const cols = await sql`
  SELECT column_name 
  FROM information_schema.columns 
  WHERE table_name = 'bug_reports' 
  ORDER BY ordinal_position
`;
console.log('bug_reports columns:', cols.map((x: any) => x.column_name).join(', '));

// Also check messages table
const msgCols = await sql`
  SELECT column_name 
  FROM information_schema.columns 
  WHERE table_name = 'messages' 
  ORDER BY ordinal_position
`;
console.log('messages columns:', msgCols.map((x: any) => x.column_name).join(', '));

// Check actual trend data
const trend = await sql`
  SELECT DATE(timestamp) as day, COUNT(*) as cnt 
  FROM messages 
  WHERE timestamp >= NOW() - INTERVAL '7 days'
  GROUP BY DATE(timestamp)
  ORDER BY day
`;
console.log('messages trend data:', JSON.stringify(trend));

await sql.end();
