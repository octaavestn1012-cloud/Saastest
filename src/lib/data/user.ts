"use server";

import { getDb } from "./mock/mockStore";
import { UserProfile, Plan } from "../types/domain";

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const db = getDb();
  if (db.user.id === userId) return db.user;
  return null;
}

export async function getUserPlan(userId: string): Promise<Plan | null> {
  const db = getDb();
  // Dans le mock, on retourne toujours le plan global simulé pour le user
  return db.plan;
}
