import { authRouter } from "./auth-router";
import { createRouter, publicQuery } from "./middleware";
import { messageRouter } from "./routers/messages";
import { bugRouter } from "./routers/bugs";
import { agentRouter } from "./routers/agents";
import { analyticsRouter } from "./routers/analytics";
import { integrationRouter } from "./routers/integrations";
import { teamRouter } from "./routers/team";
import { releaseNotesRouter } from "./routers/release-notes";

export const appRouter = createRouter({
  ping: publicQuery.query(() => ({ ok: true, ts: Date.now() })),
  auth: authRouter,
  messages: messageRouter,
  bugs: bugRouter,
  agents: agentRouter,
  analytics: analyticsRouter,
  integrations: integrationRouter,
  team: teamRouter,
  releaseNotes: releaseNotesRouter,
});

export type AppRouter = typeof appRouter;
