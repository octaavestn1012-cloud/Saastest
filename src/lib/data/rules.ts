"use server";

import { getDb, saveDb } from "./mock/mockStore";
import { Rule, RuleTarget } from "../types/domain";

export async function getUserRules(userId: string): Promise<(Rule & { targets: RuleTarget[] })[]> {
  const db = getDb();
  return db.rules.filter(r => r.userId === userId);
}

export async function getRuleById(ruleId: string): Promise<(Rule & { targets: RuleTarget[] }) | null> {
  const db = getDb();
  return db.rules.find(r => r.id === ruleId) || null;
}

export async function toggleRuleStatus(ruleId: string, status: "active" | "paused"): Promise<void> {
  const db = getDb();
  const rule = db.rules.find(r => r.id === ruleId);
  if (rule) {
    rule.status = status;
    saveDb(db);
  }
}
