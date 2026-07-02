"use server";

import { getDb } from "./mock/mockStore";

export async function getUserConnections(userId: string): Promise<any[]> {
  const db = getDb();
  // Simplification pour le mock
  return db.connections;
}
