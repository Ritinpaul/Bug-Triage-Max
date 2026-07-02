import "dotenv/config";
const token = process.env.LEMMA_TOKEN;
const podId = process.env.LEMMA_POD_ID;
const base = process.env.LEMMA_BASE_URL || "https://api.lemma.work";

async function createTable(name) {
  const r = await fetch(`${base}/pods/${podId}/tables`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ name, enable_rls: false }),
  });
  const j = await r.json();
  console.log(`[${r.status}] Table '${name}':`, j.id || j.code || j.message || JSON.stringify(j).slice(0, 120));
  return j;
}

async function listTables() {
  const r = await fetch(`${base}/pods/${podId}/tables`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const j = await r.json();
  const items = j.items || j;
  console.log("Existing tables:", Array.isArray(items) ? items.map(t => t.name).join(", ") : JSON.stringify(j).slice(0, 200));
  return j;
}

async function run() {
  console.log("Pod ID:", podId);
  console.log("Base URL:", base);
  console.log("Token prefix:", token ? token.slice(0, 20) + "..." : "MISSING");
  console.log("\n--- Listing existing tables ---");
  await listTables();
  console.log("\n--- Creating tables ---");
  await createTable("bug_reports");
  await createTable("agent_activities");
  await createTable("triage_results");
  console.log("\n--- Final table list ---");
  await listTables();
}
run().catch(console.error);
