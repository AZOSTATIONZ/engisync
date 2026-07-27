import { describe, expect, it } from "vitest";
import {
  checkDeclaration,
  computeTotals,
  formatCents,
  isBlocked,
  isPlausibleReference,
  normaliseReference,
  parseAmountToCents,
  requiresReference,
  toBaseCents,
  type ContributionLike,
  type DeclarationContext,
  type DeclarationInput,
} from "./finance";

const NOW = new Date("2026-07-27T12:00:00Z");
const DAY = 24 * 60 * 60 * 1000;
const daysAgo = (n: number) => new Date(NOW.getTime() - n * DAY);

const declaration: DeclarationInput = {
  method: "ECOCASH",
  reference: "MP250727ABCD",
  amountCents: 1500,
  paidAt: daysAgo(1),
  currency: "USD",
  receiptHash: "hash-1",
  hasReceipt: true,
};

const context: DeclarationContext = {
  now: NOW,
  expectedCents: 1500,
  duplicateReceipt: false,
  duplicateReference: false,
};

describe("money parsing", () => {
  it("parses valid amounts to cents", () => {
    expect(parseAmountToCents("15")).toBe(1500);
    expect(parseAmountToCents("15.50")).toBe(1550);
    expect(parseAmountToCents("15.5")).toBe(1550);
    expect(parseAmountToCents("1,234.50")).toBe(123450);
    expect(parseAmountToCents("0.01")).toBe(1);
    expect(parseAmountToCents(15.5)).toBe(1550);
  });

  it("rejects anything that isn't a clean positive amount", () => {
    expect(parseAmountToCents("")).toBeNull();
    expect(parseAmountToCents("abc")).toBeNull();
    expect(parseAmountToCents("-5")).toBeNull();
    expect(parseAmountToCents("1.234")).toBeNull();
  });

  it("avoids floating point drift (0.1 + 0.2 === 0.3)", () => {
    const sum = parseAmountToCents("0.10")! + parseAmountToCents("0.20")!;
    expect(sum).toBe(parseAmountToCents("0.30"));
  });
});

describe("money formatting", () => {
  it("always shows two decimals with thousands separators", () => {
    expect(formatCents(1500, "USD")).toBe("USD 15.00");
    expect(formatCents(1234550, "USD")).toBe("USD 12,345.50");
    expect(formatCents(5, "ZWG")).toBe("ZWG 0.05");
    expect(formatCents(-1500, "USD")).toBe("-USD 15.00");
  });
});

describe("currency conversion", () => {
  it("applies the rate and rounds half-up", () => {
    expect(toBaseCents(1500, 1)).toBe(1500);
    expect(toBaseCents(1500, 0.5)).toBe(750);
    expect(toBaseCents(1501, 0.5)).toBe(751);
  });

  it("converts negatives as the exact mirror of positives", () => {
    // Guards the Math.round(-0.5) asymmetry, which would stop equal credits
    // and debits from cancelling out.
    expect(toBaseCents(-1501, 0.5)).toBe(-toBaseCents(1501, 0.5));
  });

  it("passes the amount through unchanged for a nonsense rate", () => {
    expect(toBaseCents(1500, 0)).toBe(1500);
    expect(toBaseCents(1500, Number.NaN)).toBe(1500);
  });
});

describe("transaction references", () => {
  it("knows which methods need one", () => {
    expect(requiresReference("ECOCASH")).toBe(true);
    expect(requiresReference("ZIPIT")).toBe(true);
    expect(requiresReference("CASH")).toBe(false);
  });

  it("validates mobile money references strictly, others loosely", () => {
    expect(isPlausibleReference("ECOCASH", "MP250727ABCD")).toBe(true);
    expect(isPlausibleReference("ECOCASH", "AB12")).toBe(false);
    expect(isPlausibleReference("ECOCASH", "MP-2507-27AB")).toBe(false);
    expect(isPlausibleReference("BANK", "TRX-2025.07-27")).toBe(true);
    expect(isPlausibleReference("ECOCASH", "")).toBe(false);
  });

  it("normalises for comparison", () => {
    expect(normaliseReference("  mp250727 abcd ")).toBe("MP250727ABCD");
  });
});

describe("declaration checks", () => {
  it("passes a clean declaration with no flags", () => {
    expect(checkDeclaration(declaration, context)).toHaveLength(0);
  });

  it("blocks a missing reference where one is required", () => {
    const flags = checkDeclaration({ ...declaration, reference: null }, context);
    expect(flags.some((f) => f.code === "REFERENCE_MISSING")).toBe(true);
    expect(isBlocked(flags)).toBe(true);
  });

  it("allows cash with no reference", () => {
    const flags = checkDeclaration(
      { ...declaration, method: "CASH", reference: null },
      context,
    );
    expect(isBlocked(flags)).toBe(false);
  });

  it("blocks a reused transaction reference", () => {
    const flags = checkDeclaration(declaration, {
      ...context,
      duplicateReference: true,
    });
    expect(flags.some((f) => f.code === "REFERENCE_DUPLICATE")).toBe(true);
    expect(isBlocked(flags)).toBe(true);
  });

  it("warns but does not block on a reused receipt file", () => {
    const flags = checkDeclaration(declaration, {
      ...context,
      duplicateReceipt: true,
    });
    expect(flags.some((f) => f.code === "RECEIPT_DUPLICATE")).toBe(true);
    expect(isBlocked(flags)).toBe(false);
  });

  it("blocks impossible values", () => {
    expect(isBlocked(checkDeclaration({ ...declaration, amountCents: 0 }, context))).toBe(true);
    expect(
      isBlocked(
        checkDeclaration(
          { ...declaration, paidAt: new Date(NOW.getTime() + DAY) },
          context,
        ),
      ),
    ).toBe(true);
  });

  it("treats amount mismatches as information, not obstruction", () => {
    const short = checkDeclaration({ ...declaration, amountCents: 1000 }, context);
    expect(short.some((f) => f.code === "AMOUNT_SHORT")).toBe(true);
    expect(isBlocked(short)).toBe(false);

    const over = checkDeclaration({ ...declaration, amountCents: 2000 }, context);
    expect(over.some((f) => f.code === "AMOUNT_OVER")).toBe(true);
  });

  it("warns on an odd reference format without blocking the payment", () => {
    // Providers change formats; rejecting a real payment is worse than
    // flagging an odd-looking one for a human.
    const flags = checkDeclaration({ ...declaration, reference: "AB" }, context);
    expect(flags.some((f) => f.code === "REFERENCE_FORMAT")).toBe(true);
    expect(isBlocked(flags)).toBe(false);
  });
});

describe("OCR cross-checks are advisory only", () => {
  it("flags a mismatched amount but never blocks", () => {
    const flags = checkDeclaration(declaration, {
      ...context,
      ocr: { amountCents: 2000, reference: "MP250727ABCD" },
    });
    expect(flags.some((f) => f.code === "OCR_AMOUNT_MISMATCH")).toBe(true);
    expect(isBlocked(flags)).toBe(false);
  });

  it("flags a mismatched reference", () => {
    const flags = checkDeclaration(declaration, {
      ...context,
      ocr: { amountCents: 1500, reference: "OTHER123456" },
    });
    expect(flags.some((f) => f.code === "OCR_REFERENCE_MISMATCH")).toBe(true);
  });

  it("stays silent when OCR agrees", () => {
    expect(
      checkDeclaration(declaration, {
        ...context,
        ocr: { amountCents: 1500, reference: "MP250727ABCD" },
      }),
    ).toHaveLength(0);
  });
});

describe("flag wording", () => {
  it("never accuses anyone of fraud", () => {
    // These strings are shown to students. Stating a fact is fine; making an
    // accusation the system cannot substantiate is not.
    const inputs: DeclarationInput[] = [
      { ...declaration, reference: null },
      { ...declaration, amountCents: 0 },
      { ...declaration, reference: "AB" },
      { ...declaration, hasReceipt: false },
    ];
    const messages = inputs.flatMap((i) =>
      checkDeclaration(i, {
        ...context,
        duplicateReceipt: true,
        duplicateReference: true,
      }).map((f) => f.message),
    );
    expect(messages.length).toBeGreaterThan(0);
    for (const m of messages) {
      expect(m).not.toMatch(/forg|fraud|fake|manipulat|tamper/i);
    }
  });
});

describe("totals", () => {
  const contributions: ContributionLike[] = [
    { baseAmountCents: 1500, status: "VERIFIED" },
    { baseAmountCents: 1500, status: "VERIFIED" },
    { baseAmountCents: 1500, status: "DECLARED" },
    { baseAmountCents: 1500, status: "REJECTED" },
    { baseAmountCents: 900, status: "DISPUTED" },
  ];

  it("counts only verified money as collected", () => {
    const t = computeTotals(contributions, [1000, 500], 12000);
    expect(t.verifiedCents).toBe(3000);
    expect(t.pendingCents).toBe(1500);
    expect(t.contestedCents).toBe(2400);
    expect(t.spentCents).toBe(1500);
    expect(t.balanceCents).toBe(1500);
    expect(t.outstandingCents).toBe(9000);
    expect(t.percentOfTarget).toBe(25);
  });

  it("allows a negative balance when someone fronted money", () => {
    const t = computeTotals([], [5000], 0);
    expect(t.balanceCents).toBe(-5000);
    expect(t.percentOfTarget).toBe(0);
  });

  it("clamps outstanding at zero and progress at 100%", () => {
    const t = computeTotals(
      [{ baseAmountCents: 20000, status: "VERIFIED" }],
      [],
      10000,
    );
    expect(t.outstandingCents).toBe(0);
    expect(t.percentOfTarget).toBe(100);
  });
});
