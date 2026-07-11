import { handle } from "hono/adapter/vercel";
import app from "../server/boot";

export const config = { runtime: "nodejs20.x" };
export default handle(app);
