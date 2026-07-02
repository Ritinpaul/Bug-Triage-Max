import { getPg } from './server/queries/connection.ts'; 
const pg = getPg(); 
pg`SELECT * FROM bug_reports LIMIT 1`
  .then(async (res) => { 
    const ids = res.map((r: any) => r.id); 
    console.log(ids); 
    if(ids.length > 0) { 
      const repros = await pg`SELECT * FROM reproduction_steps WHERE bug_report_id IN ${pg(ids)}`; 
      console.log('repros', repros); 
    } 
  })
  .catch(console.error)
  .finally(() => process.exit(0));
