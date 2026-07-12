
import { config } from "dotenv";
config({ path: ".env.local" });
import { GET } from "./src/app/api/cron/master/route.ts";

async function test() {
  const req = new Request("http://localhost");
  const res = await GET(req);
  console.log("Status:", res.status);
  const json = await res.json();
  console.log("Response:", json);
}
test();

