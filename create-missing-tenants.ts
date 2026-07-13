import { getDb } from './server/queries/connection';
import { users, tenants, tenantMembers } from './db/schema';
import { eq, notInArray } from 'drizzle-orm';
import crypto from 'crypto';

async function main() {
  const db = getDb();
  
  // Find all tenant members
  const members = await db.select().from(tenantMembers);
  const userIdsWithTenants = members.map(m => m.userId);

  // Find users without tenants
  const usersWithoutTenants = await db.select().from(users).where(
    userIdsWithTenants.length > 0 
      ? notInArray(users.id, userIdsWithTenants) 
      : undefined
  );

  console.log(`Found ${usersWithoutTenants.length} users without tenants`);

  for (const user of usersWithoutTenants) {
    const tenantName = `${user.name || 'User'}'s Workspace`;
    const tenantSlug = tenantName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + crypto.randomUUID().slice(0, 6);
    
    const [tenant] = await db.insert(tenants).values({
      name: tenantName,
      slug: tenantSlug,
    }).returning({ id: tenants.id });

    await db.insert(tenantMembers).values({
      tenantId: tenant.id,
      userId: user.id,
      role: 'admin'
    });
    console.log(`Created workspace for user: ${user.name}`);
  }
  
  console.log('Done');
  process.exit(0);
}

main().catch(console.error);