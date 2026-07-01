import "dotenv/config";

function required(name: string): string {
  const value = process.env[name];
  if (!value && process.env.NODE_ENV === "production") {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value ?? "";
}

function optional(name: string): string {
  return process.env[name] ?? "";
}

export const env = {
  appId: required("APP_ID"),
  appSecret: required("APP_SECRET"),
  isProduction: process.env.NODE_ENV === "production",

  // Database (Supabase PostgreSQL)
  databaseUrl: required("DATABASE_URL"),

  // Supabase (for direct client access if needed)
  supabaseUrl: optional("SUPABASE_URL"),
  supabaseAnonKey: optional("SUPABASE_ANON_KEY"),
  supabaseServiceRoleKey: optional("SUPABASE_SERVICE_ROLE_KEY"),

  // Auth
  kimiAuthUrl: required("KIMI_AUTH_URL"),
  kimiOpenUrl: required("KIMI_OPEN_URL"),
  ownerUnionId: optional("OWNER_UNION_ID"),

  // AI
  geminiApiKey: optional("GEMINI_API_KEY"),

  // GitHub
  githubPat: optional("GITHUB_PAT"),
  githubRepoOwner: optional("GITHUB_REPO_OWNER"),
  githubRepoName: optional("GITHUB_REPO_NAME"),

  // Slack
  slackBotToken: optional("SLACK_BOT_TOKEN"),
  slackSigningSecret: optional("SLACK_SIGNING_SECRET"),

  // Email IMAP
  emailImapHost: optional("EMAIL_IMAP_HOST"),
  emailImapUser: optional("EMAIL_IMAP_USER"),
  emailImapPassword: optional("EMAIL_IMAP_PASSWORD"),
};
