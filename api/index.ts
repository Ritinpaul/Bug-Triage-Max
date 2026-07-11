import { handle } from "hono/vercel";
import app from "../server/boot.ts";

export const config = { runtime: "nodejs" };
export default handle(app);
