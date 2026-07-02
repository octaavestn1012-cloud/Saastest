import { describe, it, expect } from "vitest";
import { computeRepartition } from "../../src/lib/rules-engine/compute";
import { RuleTarget } from "../../src/lib/types/domain";

describe("Rules Engine - Compute Repartition", () => {
  it("should calculate correct amounts for a mix of percentages and fixed amounts", () => {
    // 100,000 FCFA total, 1% commission = 1,000 FCFA
    // Distributable = 99,000 FCFA
    const targets: RuleTarget[] = [
      { id: "t1", ruleId: "r1", label: "Fixed", mode: "fixed_amount", value: 40000, isRemainder: false, position: 1, momoMethod: "mtn", phoneNumber: "0" },
      { id: "t2", ruleId: "r1", label: "Percentage", mode: "percentage", value: 10, isRemainder: false, position: 2, momoMethod: "mtn", phoneNumber: "0" }, // 10% de 99,000 = 9,900
      { id: "t3", ruleId: "r1", label: "Rest", mode: "percentage", value: 0, isRemainder: true, position: 3, momoMethod: "mtn", phoneNumber: "0" }, // Reste: 99,000 - 40,000 - 9,900 = 49,100
    ];

    const result = computeRepartition(100000, 100, targets);

    expect(result.totalAmountFcfa).toBe(100000);
    expect(result.commissionAmountFcfa).toBe(1000);
    expect(result.unallocatedFcfa).toBe(0);
    expect(result.lines).toHaveLength(3);
    
    expect(result.lines.find(l => l.targetId === "t1")?.amountFcfa).toBe(40000);
    expect(result.lines.find(l => l.targetId === "t2")?.amountFcfa).toBe(9900);
    expect(result.lines.find(l => l.targetId === "t3")?.amountFcfa).toBe(49100);
  });

  it("should not distribute more than available if fixed amounts exceed total", () => {
    // 10,000 FCFA total, 1% commission = 100 FCFA
    // Distributable = 9,900 FCFA
    const targets: RuleTarget[] = [
      { id: "t1", ruleId: "r1", label: "Fixed", mode: "fixed_amount", value: 15000, isRemainder: false, position: 1, momoMethod: "mtn", phoneNumber: "0" },
      { id: "t2", ruleId: "r1", label: "Percentage", mode: "percentage", value: 10, isRemainder: false, position: 2, momoMethod: "mtn", phoneNumber: "0" },
      { id: "t3", ruleId: "r1", label: "Rest", mode: "percentage", value: 0, isRemainder: true, position: 3, momoMethod: "mtn", phoneNumber: "0" },
    ];

    const result = computeRepartition(10000, 100, targets);

    expect(result.commissionAmountFcfa).toBe(100);
    expect(result.lines).toHaveLength(1); // Only t1 gets something, and it's capped
    
    expect(result.lines.find(l => l.targetId === "t1")?.amountFcfa).toBe(9900);
  });

  it("should leave unallocated money if there is no remainder target and percentages don't reach 100", () => {
    // 100,000 FCFA total, 1% commission = 1,000 FCFA
    // Distributable = 99,000 FCFA
    const targets: RuleTarget[] = [
      { id: "t1", ruleId: "r1", label: "Percentage", mode: "percentage", value: 50, isRemainder: false, position: 1, momoMethod: "mtn", phoneNumber: "0" }, // 50% = 49,500
    ];

    const result = computeRepartition(100000, 100, targets);

    expect(result.commissionAmountFcfa).toBe(1000);
    expect(result.lines).toHaveLength(1);
    expect(result.lines[0].amountFcfa).toBe(49500);
    expect(result.unallocatedFcfa).toBe(49500);
  });
});
