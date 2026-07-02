import app from "../server/boot";
import { handle } from "@hono/vercel";

export default handle(app);
