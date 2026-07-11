import { handle } from "hono/vercel";
import app from "../server/boot.js";

export const config = { runtime: "nodejs" };
export default handle(app);
