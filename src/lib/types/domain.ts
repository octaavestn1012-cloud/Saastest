export interface UserProfile {
  id: string;
  fullName: string;
  phone: string;
  commissionPhone: string;
  language: string;
  onboardingStep: number;
  role: 'user' | 'admin';
}

export type PlanId = "gratuit" | "pro" | "business";

export interface Plan {
  id: PlanId;
  name: string;
  monthlyPriceFcfa: number;
  commissionRateBps: number;
  monthlyCapFcfa: number | null;
  enforcesCap: boolean;
}

export interface Rule {
  id: string;
  userId: string;
  connectionId: string;
  name: string;
  type: "percentage" | "fixed" | "conditional";
  status: "active" | "paused";
  triggerType: "manual" | "immediate" | "daily" | "weekly" | "monthly" | "conditional";
  triggerConfig: Record<string, unknown>;
  condition: Record<string, unknown> | null;
  remainderTargetId: string | null;
  priority: number;
  autoExecuteAuthorized: boolean;
}

export interface RuleTarget {
  id: string;
  ruleId: string;
  label: string;
  mode: "percentage" | "fixed_amount";
  value: number;
  momoMethod: "mtn" | "moov";
  phoneNumber: string;
  isRemainder: boolean;
  position: number;
}

export interface RepartitionExecution {
  id: string;
  userId: string;
  ruleId: string;
  triggerSource: "manual" | "immediate" | "scheduled" | "conditional";
  status: "draft" | "awaiting_confirmation" | "processing" | "completed" | "partially_failed" | "failed" | "canceled";
  idempotencyKey: string;
  sourceEntryIds: string[];
  totalAmountFcfa: number;
  commissionAmountFcfa: number;
  commissionRateBpsSnapshot: number;
  planIdSnapshot: PlanId;
  confirmedAt: string | null;
  confirmedBy: string | null;
}

export interface ExecutionLine {
  id: string;
  executionId: string;
  targetLabel: string;
  isCommissionLine: boolean;
  momoMethod: "mtn" | "moov";
  phoneNumber: string;
  amountFcfa: number;
  status: "pending" | "processing" | "succeeded" | "failed";
  providerPayoutId: string | null;
  failureReason: string | null;
  attemptedAt: string | null;
  succeededAt: string | null;
  retryOfLineId: string | null;
}
