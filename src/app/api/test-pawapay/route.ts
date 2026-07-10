import { NextResponse } from "next/server";
import { processQuickPayouts } from "@/lib/payout-engine";

export async function GET() {
  const userId = 'dc14e556-87d1-4074-99c0-d854ab0bff68';
  const amount = 100;
  const targets = [
    { label: 'test pawa', method: 'MTN BJ', phone: '2290151345089', value: 50 },
    { label: 'test feda', method: 'Orange CI', phone: '2250734567890', value: 50 }
  ];
  
  const res = await processQuickPayouts(userId, amount, targets, 'montant_fixe');
  return NextResponse.json(res);
}
