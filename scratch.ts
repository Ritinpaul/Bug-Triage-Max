import { getDb } from './server/queries/connection';
import { bugReports, agentActivities, messages } from './db/schema';
import { desc } from 'drizzle-orm';

async function run() {
  const db = getDb();
  const bugs = await db.select().from(bugReports).limit(10);
  console.log('BUGS:', bugs);

  const activities = await db.select().from(agentActivities).orderBy(desc(agentActivities.createdAt)).limit(10);
  console.log('ACTIVITIES:', activities);
  
  const msgs = await db.select().from(messages).orderBy(desc(messages.createdAt)).limit(10);
  console.log('MESSAGES:', msgs);
  
  process.exit(0);
}
run();
