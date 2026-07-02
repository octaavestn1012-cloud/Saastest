"use server";

import { getDb, saveDb } from "./mock/mockStore";
import { RepartitionExecution } from "../types/domain";

export async function getUserExecutions(userId: string): Promise<RepartitionExecution[]> {
  const db = getDb();
  return db.executions.filter(e => e.userId === userId).sort((a, b) => {
    // Trier par date décroissante (le plus récent en premier)
    return new Date(b.confirmedAt || Date.now()).getTime() - new Date(a.confirmedAt || Date.now()).getTime();
  });
}

export async function createExecution(execution: RepartitionExecution): Promise<void> {
  const db = getDb();
  db.executions.push(execution);
  saveDb(db);
}

export async function updateExecutionStatus(
  executionId: string, 
  status: RepartitionExecution["status"]
): Promise<void> {
  const db = getDb();
  const exec = db.executions.find(e => e.id === executionId);
  if (exec) {
    exec.status = status;
    saveDb(db);
  }
}
