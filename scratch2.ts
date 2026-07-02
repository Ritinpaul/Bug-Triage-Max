import { appRouter } from './server/router';

async function run() {
  try {
    const caller = appRouter.createCaller({ req: new Request('http://localhost'), resHeaders: new Headers() });
    
    const result = await caller.bugs.list({ status: 'all', severity: 'all', limit: 50, offset: 0 });
    console.log('Result length:', result.items.length);
  } catch (err) {
    console.error('ERROR in bugs.list:', err);
  }
  process.exit(0);
}
run();
