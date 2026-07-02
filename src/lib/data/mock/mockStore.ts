import fs from "fs";
import path from "path";
import { Rule, RepartitionExecution, UserProfile, Plan, RuleTarget } from "../../types/domain";

const FIXTURES_PATH = path.join(process.cwd(), "src/lib/data/mock/fixtures.json");

export interface MockDatabase {
  user: UserProfile;
  plan: Plan;
  rules: (Rule & { targets: RuleTarget[] })[];
  executions: RepartitionExecution[];
  connections: any[];
}

// Lit les données depuis le fichier JSON
export function getDb(): MockDatabase {
  if (!fs.existsSync(FIXTURES_PATH)) {
    throw new Error(`Fixtures file not found at ${FIXTURES_PATH}`);
  }
  const data = fs.readFileSync(FIXTURES_PATH, "utf8");
  return JSON.parse(data);
}

// Écrit les données dans le fichier JSON
export function saveDb(db: MockDatabase) {
  fs.writeFileSync(FIXTURES_PATH, JSON.stringify(db, null, 2), "utf8");
}
