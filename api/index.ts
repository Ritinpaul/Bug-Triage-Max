import { handle } from "hono/adapter/vercel";
import app from "../server/boot";

export const config = { runtime: "nodejs" };
export default handle(app);
