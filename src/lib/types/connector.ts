export interface AggregatorCredentials {
  connectionId: string;
  apiKeyCiphertext: string;
}

export interface IncomingEntry {
  providerTransactionId: string;
  amountFcfa: number;
  payerReference: string | null;
  receivedAt: string;
  raw: Record<string, unknown>;
}

export interface PayoutRequest {
  idempotencyKey: string;
  amountFcfa: number;
  momoMethod: "mtn" | "moov";
  phoneNumber: string;
  reference: string;
}

export interface PayoutResult {
  status: "succeeded" | "failed" | "pending";
  providerPayoutId: string | null;
  failureReason: string | null;
}

export interface AggregatorConnector {
  readonly provider: "kkiapay" | "fedapay" | "cinetpay" | "moneroo" | "mock";
  verifyCredentials(creds: AggregatorCredentials): Promise<{ valid: boolean; reason?: string }>;
  getAvailableBalance(creds: AggregatorCredentials): Promise<number>;
  listIncomingEntries(creds: AggregatorCredentials, since: string): Promise<IncomingEntry[]>;
  sendPayout(creds: AggregatorCredentials, request: PayoutRequest): Promise<PayoutResult>;
  getPayoutStatus(creds: AggregatorCredentials, providerPayoutId: string): Promise<PayoutResult>;
}
