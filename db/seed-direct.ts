/**
 * Direct seed script using postgres directly
 * Run: npx tsx db/seed-direct.ts
 */

import "dotenv/config";
import postgres from "postgres";

async function seed() {
  const dbUrl = process.env.DATABASE_URL || "";
  if (!dbUrl) throw new Error("DATABASE_URL is missing");

  // postgres will use ssl: require if specified in the URL or options
  const sql = postgres(dbUrl, { ssl: "require" });

  console.log("Seeding Bug Triage Max database...");

  // Clear existing data
  await sql`DELETE FROM similar_bug_matches`;
  await sql`DELETE FROM reproduction_steps`;
  await sql`DELETE FROM bug_reports`;
  await sql`DELETE FROM parsed_results`;
  await sql`DELETE FROM agent_activities`;
  await sql`DELETE FROM messages`;
  await sql`DELETE FROM team_members`;
  await sql`DELETE FROM analytics_snapshots`;
  await sql`DELETE FROM integration_status`;
  console.log("  Cleared existing data");

  // Team Members
  await sql.unsafe(`
    INSERT INTO team_members (name, handle, email, expertise, is_on_call) VALUES
    ('Alice Chen', '@alice', 'alice@company.com', '["auth","api"]', 0),
    ('Bob Martinez', '@bob', 'bob@company.com', '["billing","database"]', 1),
    ('Charlie Kim', '@charlie', 'charlie@company.com', '["ui","notifications"]', 0),
    ('Diana Park', '@diana', 'diana@company.com', '["database","api"]', 0),
    ('Evan Wright', '@evan', 'evan@company.com', '["auth","ui"]', 0)
  `);
  console.log("  Seeded 5 team members");

  // Integration Status
  await sql.unsafe(`
    INSERT INTO integration_status (service, status, response_time, metadata) VALUES
    ('github', 'online', 120, '{"rateLimit": "4999/5000", "version": "v3"}'),
    ('slack', 'online', 85, '{"botUser": "bug-triage-bot", "channels": 3}'),
    ('email', 'online', 200, '{"imapServer": "imap.company.com"}'),
    ('lemma', 'online', 150, '{"version": "0.5.3", "agents": 4}'),
    ('llm', 'online', 450, '{"provider": "openrouter", "model": "anthropic/claude-sonnet-4"}')
  `);
  console.log("  Seeded 5 integration statuses");

  // Messages with pipeline data — timestamps spread across last 7 days for trend charts
  const msgs = [
    { s: "slack", r: "wtf the login button is broken again, i click it and nothing happens", sid: "U12345", sn: "Sarah Johnson", se: "sarah@customer.com", ch: "#bugs", st: "reproduced", daysAgo: 0 },
    { s: "email", r: "Can't see my invoice for June. The billing page shows a blank screen after I log in. This is urgent as our accounting team needs it today.", sid: "acct@enterprise.com", sn: "Accounting Team", se: "acct@enterprise.com", ch: "Invoice Issue - June", st: "reproduced", daysAgo: 1 },
    { s: "form", r: "The API returns 500 errors when I try to create a new user with the /v1/users endpoint. This started happening after yesterday's deployment.", sid: "dev-456", sn: "Mike Ross", se: "mike@partner.com", ch: "API Bug Report", st: "reproduced", daysAgo: 1 },
    { s: "slack", r: "The notification bell icon is not showing the red badge even though I have unread messages. Refreshing the page doesn't help.", sid: "U67890", sn: "Emily Davis", se: "emily@company.com", ch: "#frontend", st: "triaged", daysAgo: 2 },
    { s: "email", r: "Database query timeout on the analytics dashboard. Loading the monthly report takes over 30 seconds and eventually fails. Our team uses this daily.", sid: "ops@company.com", sn: "Ops Team", se: "ops@company.com", ch: "Analytics Dashboard Timeout", st: "reproduced", daysAgo: 3 },
    { s: "slack", r: "Can you add dark mode to the dashboard? The current light theme is hard on the eyes during night shifts.", sid: "U11111", sn: "Night Shift Crew", se: "night@company.com", ch: "#feature-requests", st: "parsed", daysAgo: 3 },
    { s: "form", r: "The password reset email is not being sent. I've tried 3 times and checked my spam folder. This is blocking 5 users from accessing their accounts.", sid: "support-789", sn: "Support Team", se: "support@company.com", ch: "Password Reset Failure", st: "reproduced", daysAgo: 4 },
    { s: "slack", r: "The export to CSV button on the users table doesn't do anything when clicked. Chrome latest version.", sid: "U22222", sn: "Jane Smith", se: "jane@company.com", ch: "#ui-issues", st: "triaged", daysAgo: 5 },
    { s: "email", r: "Webhook deliveries are failing with SSL certificate errors since this morning. Our integration partners can't receive events.", sid: "integration@partner.com", sn: "Partner Integration", se: "integration@partner.com", ch: "Webhook SSL Errors", st: "reproduced", daysAgo: 5 },
    { s: "slack", r: "How do I set up two-factor authentication for my team? The docs mention it but I can't find the setting.", sid: "U33333", sn: "Team Lead", se: "lead@customer.com", ch: "#general", st: "parsed", daysAgo: 6 },
  ];

  for (const m of msgs) {
    const ts = new Date(Date.now() - m.daysAgo * 24 * 60 * 60 * 1000);
    ts.setHours(10, 0, 0, 0); // noon-ish so it's clearly within the day window
    await sql`INSERT INTO messages (source, raw_content, sender_id, sender_name, sender_email, channel, status, timestamp) VALUES (${m.s}, ${m.r}, ${m.sid}, ${m.sn}, ${m.se}, ${m.ch}, ${m.st}, ${ts})`;
  }
  console.log(`  Seeded ${msgs.length} messages`);


  // Parsed Results
  const parsedData = [
    { mid: 1, i: "bug_report", ic: 0.89, c: "auth", cc: 0.91, ss: 75, sl: "P1", oc: 0.89, kw: '["login","button","broken","nothing"]', fr: 0 },
    { mid: 2, i: "bug_report", ic: 0.93, c: "billing", cc: 0.89, ss: 65, sl: "P1", oc: 0.91, kw: '["invoice","billing","blank","urgent"]', fr: 0 },
    { mid: 3, i: "bug_report", ic: 0.96, c: "api", cc: 0.92, ss: 85, sl: "P0", oc: 0.94, kw: '["api","errors","create","endpoint"]', fr: 0 },
    { mid: 4, i: "bug_report", ic: 0.88, c: "notifications", cc: 0.86, ss: 35, sl: "P2", oc: 0.87, kw: '["notification","badge","showing","messages"]', fr: 0 },
    { mid: 5, i: "bug_report", ic: 0.90, c: "database", cc: 0.86, ss: 70, sl: "P1", oc: 0.88, kw: '["database","query","timeout","analytics"]', fr: 0 },
    { mid: 6, i: "feature_request", ic: 0.94, c: "ui", cc: 0.90, ss: 15, sl: "P3", oc: 0.92, kw: '["dark","mode","dashboard","theme"]', fr: 0 },
    { mid: 7, i: "bug_report", ic: 0.95, c: "auth", cc: 0.91, ss: 80, sl: "P0", oc: 0.93, kw: '["password","reset","email","blocking"]', fr: 0 },
    { mid: 8, i: "bug_report", ic: 0.86, c: "ui", cc: 0.84, ss: 40, sl: "P2", oc: 0.85, kw: '["export","csv","button","clicked"]', fr: 0 },
    { mid: 9, i: "bug_report", ic: 0.92, c: "api", cc: 0.90, ss: 90, sl: "P0", oc: 0.91, kw: '["webhook","ssl","certificate","failing"]', fr: 0 },
    { mid: 10, i: "question", ic: 0.84, c: "auth", cc: 0.80, ss: 10, sl: "P3", oc: 0.82, kw: '["factor","authentication","team","setting"]', fr: 0 },
  ];

  for (const p of parsedData) {
    await sql`INSERT INTO parsed_results (message_id, intent, intent_confidence, component, component_confidence, severity_score, severity_label, overall_confidence, keywords, flagged_for_review) VALUES (${p.mid}, ${p.i}, ${p.ic}, ${p.c}, ${p.cc}, ${p.ss}, ${p.sl}, ${p.oc}, ${p.kw}, ${p.fr})`;
  }
  console.log(`  Seeded ${parsedData.length} parsed results`);

  // Bug Reports — spread across last 7 days matching their source messages
  const bugData = [
    { mid: 1, prid: 1, t: "Login timeout — auth", d: "wtf the login button is broken again, i click it and nothing happens", s: "slack", c: "auth", sev: "P1", ps: 72, st: "open", ah: "@alice", daysAgo: 0 },
    { mid: 2, prid: 2, t: "Invoice page blank — billing", d: "Can't see my invoice for June. The billing page shows a blank screen after I log in.", s: "email", c: "billing", sev: "P1", ps: 68, st: "in_progress", ah: "@bob", daysAgo: 1 },
    { mid: 3, prid: 3, t: "User creation API 500 error — api", d: "The API returns 500 errors when I try to create a new user with the /v1/users endpoint.", s: "form", c: "api", sev: "P0", ps: 82, st: "open", ah: "@diana", daysAgo: 1 },
    { mid: 4, prid: 4, t: "Notification badge not updating — notifications", d: "The notification bell icon is not showing the red badge even though I have unread messages.", s: "slack", c: "notifications", sev: "P2", ps: 42, st: "open", ah: "@charlie", daysAgo: 2 },
    { mid: 5, prid: 5, t: "Analytics query timeout — database", d: "Database query timeout on the analytics dashboard. Loading the monthly report takes over 30 seconds.", s: "email", c: "database", sev: "P1", ps: 65, st: "open", ah: "@diana", daysAgo: 3 },
    { mid: 7, prid: 7, t: "Password reset email not sending — auth", d: "The password reset email is not being sent. I've tried 3 times and checked my spam folder.", s: "form", c: "auth", sev: "P0", ps: 78, st: "in_progress", ah: "@alice", daysAgo: 4 },
    { mid: 8, prid: 8, t: "CSV export button unresponsive — ui", d: "The export to CSV button on the users table doesn't do anything when clicked.", s: "slack", c: "ui", sev: "P2", ps: 45, st: "open", ah: "@charlie", daysAgo: 5 },
    { mid: 9, prid: 9, t: "Webhook SSL certificate error — api", d: "Webhook deliveries are failing with SSL certificate errors since this morning.", s: "email", c: "api", sev: "P0", ps: 88, st: "open", ah: "@diana", daysAgo: 5 },
  ];

  for (const b of bugData) {
    const ts = new Date(Date.now() - b.daysAgo * 24 * 60 * 60 * 1000);
    ts.setHours(11, 0, 0, 0);
    await sql`INSERT INTO bug_reports (message_id, parsed_result_id, title, description, source, component, severity, priority_score, status, assignee_handle, created_at) VALUES (${b.mid}, ${b.prid}, ${b.t}, ${b.d}, ${b.s}, ${b.c}, ${b.sev}, ${b.ps}, ${b.st}, ${b.ah}, ${ts})`;
  }
  console.log(`  Seeded ${bugData.length} bug reports`);


  // Reproduction Steps
  const reproData = [
    { bid: 1, stp: '["Navigate to /login page","Enter valid credentials (email + password)","Click Sign In button","Observe: Page hangs for 5+ seconds","Observe: No redirect occurs, silent failure"]', exp: "Redirect to dashboard within 2 seconds", act: "Page hangs indefinitely, no error message shown", err: "AuthService timeout after 5000ms", acc: 0.85 },
    { bid: 2, stp: '["Navigate to Billing / Subscription page","Click on Invoices tab","Select date range for June 2026","Observe: Page displays blank white screen"]', exp: "Invoice list displays with downloadable PDF links", act: "Blank page - no content rendered", err: "React render error: Cannot read properties of undefined", acc: 0.82 },
    { bid: 3, stp: '["Send POST request to /v1/users","Include valid JSON payload with user data","Include Authorization header with valid token","Observe: Response returns HTTP 500"]', exp: "201 Created with new user object", act: "500 Internal Server Error with no helpful message", err: "TypeError: Cannot destructure property email of req.body", acc: 0.90 },
    { bid: 5, stp: '["Navigate to Analytics Dashboard","Select Monthly Report view","Set date range to current month","Click Generate Report","Observe: Loading spinner for 30+ seconds","Observe: Request times out with error"]', exp: "Report generates within 5 seconds", act: "Query timeout after 30 seconds", err: "Connection timeout after 30000ms", acc: 0.78 },
    { bid: 7, stp: '["Navigate to /forgot-password","Enter registered email address","Click Send Reset Link","Check email inbox and spam folder","Observe: No email received after 10 minutes"]', exp: "Password reset email delivered within 2 minutes", act: "No email sent, SendGrid logs show 400 Bad Request", err: "SendGrid API error: invalid email format", acc: 0.88 },
    { bid: 9, stp: '["Trigger any event that fires a webhook","Observe webhook delivery attempt in logs","Observe: SSL handshake fails with CERT_INVALID"]', exp: "Webhook delivered successfully via HTTPS", act: "SSL certificate validation failure", err: "Error: unable to verify the first certificate", acc: 0.80 },
  ];

  for (const r of reproData) {
    await sql`INSERT INTO reproduction_steps (bug_report_id, steps, expected_behavior, actual_behavior, error_log_summary, accuracy_score) VALUES (${r.bid}, ${r.stp}, ${r.exp}, ${r.act}, ${r.err}, ${r.acc})`;
  }
  console.log(`  Seeded ${reproData.length} reproduction step sets`);

  // Similar Bug Matches
  await sql.unsafe(`
    INSERT INTO similar_bug_matches (bug_report_id, similar_bug_id, similarity_score, is_duplicate) VALUES
    (1, 6, 0.87, 0),
    (3, 8, 0.72, 0)
  `);
  console.log("  Seeded similar bug matches");

  // Agent Activities
  const actData = [
    { an: "parser", a: "Intent: bug_report, Component: auth, Severity: P1", tid: 1, tty: "message", st: "completed", dur: 420 },
    { an: "triage", a: "Priority: P1 (72/100), Assigned: @alice, 1 similar bug found", tid: 1, tty: "bug_report", st: "completed", dur: 680 },
    { an: "reproduction", a: "Generated 5 reproduction steps", tid: 1, tty: "bug_report", st: "completed", dur: 1200 },
    { an: "parser", a: "Intent: bug_report, Component: billing, Severity: P1", tid: 2, tty: "message", st: "completed", dur: 380 },
    { an: "triage", a: "Priority: P1 (68/100), Assigned: @bob, 0 similar bugs found", tid: 2, tty: "bug_report", st: "completed", dur: 520 },
    { an: "reproduction", a: "Generated 4 reproduction steps", tid: 2, tty: "bug_report", st: "completed", dur: 980 },
    { an: "parser", a: "Intent: bug_report, Component: api, Severity: P0", tid: 3, tty: "message", st: "completed", dur: 450 },
    { an: "triage", a: "Priority: P0 (82/100), Assigned: @diana, 0 similar bugs found", tid: 3, tty: "bug_report", st: "completed", dur: 610 },
    { an: "parser", a: "Intent: bug_report, Component: auth, Severity: P0", tid: 7, tty: "message", st: "completed", dur: 390 },
    { an: "triage", a: "Priority: P0 (78/100), Assigned: @alice, 1 similar bug found", tid: 7, tty: "bug_report", st: "completed", dur: 540 },
    { an: "reproduction", a: "Generated 5 reproduction steps", tid: 7, tty: "bug_report", st: "completed", dur: 1100 },
  ];

  for (const a of actData) {
    await sql`INSERT INTO agent_activities (agent_name, action, target_id, target_type, status, duration) VALUES (${a.an}, ${a.a}, ${a.tid}, ${a.tty}, ${a.st}, ${a.dur})`;
  }
  console.log(`  Seeded ${actData.length} agent activities`);

  // Analytics Snapshot
  await sql.unsafe(`
    INSERT INTO analytics_snapshots (total_messages, total_bugs, open_bugs, resolved_bugs, avg_resolution_time, bugs_by_component, bugs_by_severity, top_assignees) VALUES
    (10, 8, 6, 0, 0, '{"auth": 2, "billing": 1, "api": 2, "ui": 2, "database": 1}', '{"P0": 2, "P1": 3, "P2": 2, "P3": 1}', '[{"handle": "@alice", "count": 2}, {"handle": "@diana", "count": 3}, {"handle": "@bob", "count": 1}, {"handle": "@charlie", "count": 2}]')
  `);
  console.log("  Seeded analytics snapshot");

  await sql.end();
  console.log("\nSeed complete! The dashboard is ready with realistic demo data.");
  console.log("Run 'npm run dev' to start the application.");
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
