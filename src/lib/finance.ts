/**
 * Project finance — money arithmetic and deterministic payment checks.
 *
 * ARCHITECTURAL POSITION
 * ----------------------
 * EngiSync is a financial *collaboration and verification* layer. It never
 * touches money. Members pay through EcoCash/OneMoney/ZIPIT/banks as they
 * already do; this module records what was promised, what was declared, what a
 * leader confirmed, and what was spent.
 *
 * That is a deliberate legal position as much as a technical one: holding or
 * transmitting third-party funds in Zimbabwe would make this a money
 * transmission business under RBZ supervision.
 *
 * WHY THE CHECKS HERE ARE NOT AI
 * ------------------------------
 * A vision model cannot reliably detect an edited screenshot. It fails in both
 * directions, and both are harmful: a false positive accuses a named student of
 * financial fraud in front of their group, and a false negative stamps
 * "AI verified" on a forgery, manufacturing trust that isn't there.
 *
 * So every check in this file is deterministic, reproducible and explainable:
 *
 *   1. Transaction reference uniqueness (enforced by a DB constraint)  ← strongest
 *   2. Reference format validation per payment method
 *   3. Exact-duplicate receipt detection via SHA-256 of the file bytes
 *   4. Cross-check of OCR-extracted values against what the member typed
 *
 * OCR, when AI is enabled, only ever *pre-fills fields*. It never decides.
 */

/** Currencies in practical circulation for these projects. */
export const CURRENCIES = ["USD", "ZWG"] as const;
export type Currency = (typeof CURRENCIES)[number];

export function isCurrency(v: string): v is Currency {
  return (CURRENCIES as readonly string[]).includes(v);
}

/* ────────────────────────────────────────────────────────────────────────
 * Money
 *
 * All arithmetic goes through integer minor units (cents). Doing money maths
 * in floating point is the classic way to lose a cent per transaction and end
 * up with a ledger that does not balance: 0.1 + 0.2 !== 0.3.
 * ──────────────────────────────────────────────────────────────────────── */

/** Parse a user-entered amount into integer cents. Returns null if invalid. */
export function parseAmountToCents(input: string | number): number | null {
  const raw = typeof input === "number" ? String(input) : input.trim();
  if (!raw) return null;
  // Allow "1,234.50" and "1234.5"; reject anything else.
  const cleaned = raw.replace(/,/g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;
  const [whole, frac = ""] = cleaned.split(".");
  const cents = Number(whole) * 100 + Number(frac.padEnd(2, "0"));
  return Number.isSafeInteger(cents) ? cents : null;
}

/** Cents → display string, always two decimals. */
export function formatCents(cents: number, currency: string = "USD"): string {
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(cents);
  const whole = Math.floor(abs / 100).toLocaleString();
  const frac = String(abs % 100).padStart(2, "0");
  return `${sign}${currency} ${whole}.${frac}`;
}

/**
 * Convert an amount into the project's base currency.
 *
 * Rounds half-up on the absolute value so that converting a negative amount is
 * the exact mirror of converting its positive counterpart — without this,
 * JavaScript's Math.round rounds -0.5 towards zero and credits and debits of
 * the same size stop cancelling out.
 */
export function toBaseCents(cents: number, rate: number): number {
  if (!Number.isFinite(rate) || rate <= 0) return cents;
  const sign = cents < 0 ? -1 : 1;
  return sign * Math.round(Math.abs(cents) * rate);
}

/* ────────────────────────────────────────────────────────────────────────
 * Transaction reference validation
 * ──────────────────────────────────────────────────────────────────────── */

export type PaymentMethod =
  | "ECOCASH"
  | "ONEMONEY"
  | "INNBUCKS"
  | "ZIPIT"
  | "CASH"
  | "BANK"
  | "OTHER";

/** Methods that must carry a transaction reference to be verifiable. */
const REFERENCE_REQUIRED: ReadonlySet<PaymentMethod> = new Set<PaymentMethod>([
  "ECOCASH",
  "ONEMONEY",
  "INNBUCKS",
  "ZIPIT",
  "BANK",
]);

export function requiresReference(method: PaymentMethod): boolean {
  return REFERENCE_REQUIRED.has(method);
}

/**
 * Shape check for a transaction reference.
 *
 * Deliberately permissive: providers change their formats, and rejecting a
 * genuine payment because a format shifted is worse than accepting an odd-
 * looking one for a human to confirm. This flags "that doesn't look right",
 * it does not decide.
 */
export function isPlausibleReference(
  method: PaymentMethod,
  reference: string,
): boolean {
  const ref = reference.trim().toUpperCase();
  if (!ref) return false;
  if (ref.length < 6 || ref.length > 40) return false;
  if (!/^[A-Z0-9][A-Z0-9._-]*$/.test(ref)) return false;

  switch (method) {
    case "ECOCASH":
    case "ONEMONEY":
    case "INNBUCKS":
      // Mobile money references are alphanumeric and at least 8 characters.
      return /^[A-Z0-9]{8,}$/.test(ref);
    default:
      return true;
  }
}

/** Normalised form used for duplicate comparison and storage. */
export function normaliseReference(reference: string): string {
  return reference.trim().toUpperCase().replace(/\s+/g, "");
}

/* ────────────────────────────────────────────────────────────────────────
 * Verification flags
 * ──────────────────────────────────────────────────────────────────────── */

export type FlagSeverity = "info" | "warn" | "block";

export type VerificationFlag = {
  code: string;
  severity: FlagSeverity;
  /** Shown to the leader and to the member. Must be neutral, never accusatory. */
  message: string;
};

export type DeclarationInput = {
  method: PaymentMethod;
  reference: string | null;
  amountCents: number;
  paidAt: Date | null;
  currency: string;
  /** SHA-256 of the uploaded receipt, if any. */
  receiptHash: string | null;
  hasReceipt: boolean;
};

export type DeclarationContext = {
  now: Date;
  /** Expected share for this member, if the request specifies one. */
  expectedCents: number | null;
  /** True when another contribution in this project already used this hash. */
  duplicateReceipt: boolean;
  /** True when another contribution in this project already used this reference. */
  duplicateReference: boolean;
  /** Values OCR pulled off the receipt, when AI is enabled. Advisory only. */
  ocr?: {
    amountCents: number | null;
    reference: string | null;
  };
};

/**
 * Run every deterministic check over a declared payment.
 *
 * Returns flags for a human to act on. Nothing here auto-approves anything —
 * approval is always a person's decision, recorded in the ledger.
 *
 * Wording matters: these strings are shown to students. "Reference already
 * used in this project" is a fact. "This receipt looks forged" is an
 * accusation, and this module never makes one.
 */
export function checkDeclaration(
  input: DeclarationInput,
  ctx: DeclarationContext,
): VerificationFlag[] {
  const flags: VerificationFlag[] = [];

  if (input.amountCents <= 0) {
    flags.push({
      code: "AMOUNT_INVALID",
      severity: "block",
      message: "Enter an amount greater than zero.",
    });
  }

  const ref = input.reference ? normaliseReference(input.reference) : "";

  if (requiresReference(input.method)) {
    if (!ref) {
      flags.push({
        code: "REFERENCE_MISSING",
        severity: "block",
        message:
          "A transaction reference is required for this payment method. You'll find it in your payment confirmation message.",
      });
    } else if (!isPlausibleReference(input.method, ref)) {
      flags.push({
        code: "REFERENCE_FORMAT",
        severity: "warn",
        message:
          "That reference doesn't look like the usual format — please double-check it before the leader reviews this.",
      });
    }
  }

  // The strongest control. Also enforced by a unique DB constraint, so this
  // check is the friendly message rather than the actual guarantee.
  if (ctx.duplicateReference && ref) {
    flags.push({
      code: "REFERENCE_DUPLICATE",
      severity: "block",
      message:
        "This transaction reference has already been recorded for this project.",
    });
  }

  if (ctx.duplicateReceipt) {
    flags.push({
      code: "RECEIPT_DUPLICATE",
      severity: "warn",
      message:
        "This exact receipt file has already been uploaded for this project.",
    });
  }

  if (input.paidAt) {
    if (input.paidAt.getTime() > ctx.now.getTime() + 60_000) {
      flags.push({
        code: "PAID_AT_FUTURE",
        severity: "block",
        message: "The payment time is in the future.",
      });
    } else {
      const daysAgo =
        (ctx.now.getTime() - input.paidAt.getTime()) / (24 * 60 * 60 * 1000);
      if (daysAgo > 120) {
        flags.push({
          code: "PAID_AT_OLD",
          severity: "info",
          message: "This payment is more than four months old.",
        });
      }
    }
  }

  if (ctx.expectedCents !== null && input.amountCents !== ctx.expectedCents) {
    flags.push({
      code: input.amountCents < ctx.expectedCents ? "AMOUNT_SHORT" : "AMOUNT_OVER",
      severity: "info",
      message:
        input.amountCents < ctx.expectedCents
          ? `This is less than the expected share of ${formatCents(ctx.expectedCents, input.currency)}.`
          : `This is more than the expected share of ${formatCents(ctx.expectedCents, input.currency)}.`,
    });
  }

  if (!input.hasReceipt && requiresReference(input.method)) {
    flags.push({
      code: "RECEIPT_MISSING",
      severity: "info",
      message: "No receipt attached — the leader will confirm from their own records.",
    });
  }

  // OCR cross-checks. Advisory: a mismatch means "a human should look", never
  // "this is fraudulent". OCR misreads blurry screenshots routinely.
  if (ctx.ocr) {
    if (
      ctx.ocr.amountCents !== null &&
      input.amountCents > 0 &&
      ctx.ocr.amountCents !== input.amountCents
    ) {
      flags.push({
        code: "OCR_AMOUNT_MISMATCH",
        severity: "warn",
        message: `The amount read from the receipt (${formatCents(ctx.ocr.amountCents, input.currency)}) doesn't match the amount entered.`,
      });
    }
    if (
      ctx.ocr.reference &&
      ref &&
      normaliseReference(ctx.ocr.reference) !== ref
    ) {
      flags.push({
        code: "OCR_REFERENCE_MISMATCH",
        severity: "warn",
        message:
          "The reference read from the receipt doesn't match the reference entered.",
      });
    }
  }

  return flags;
}

/** Can this declaration be submitted at all? */
export function isBlocked(flags: VerificationFlag[]): boolean {
  return flags.some((f) => f.severity === "block");
}

/** Does a human need to look closely before verifying? */
export function needsAttention(flags: VerificationFlag[]): boolean {
  return flags.some((f) => f.severity === "block" || f.severity === "warn");
}

/* ────────────────────────────────────────────────────────────────────────
 * Totals
 * ──────────────────────────────────────────────────────────────────────── */

export type ContributionLike = {
  baseAmountCents: number;
  status: "DECLARED" | "VERIFIED" | "REJECTED" | "DISPUTED";
};

export type FinanceTotals = {
  /** Confirmed money only. This is the number people should act on. */
  verifiedCents: number;
  /** Declared but not yet confirmed. */
  pendingCents: number;
  /** Rejected or disputed — excluded from every total. */
  contestedCents: number;
  spentCents: number;
  targetCents: number;
  /** verified − spent. Can legitimately be negative if someone fronted money. */
  balanceCents: number;
  outstandingCents: number;
  percentOfTarget: number;
};

/**
 * Roll up a project's finances.
 *
 * Only VERIFIED money counts towards collected totals. Treating declared-but-
 * unconfirmed payments as real is how a group ends up believing it can afford
 * components it cannot.
 */
export function computeTotals(
  contributions: ContributionLike[],
  expenseBaseCents: number[],
  targetCents: number,
): FinanceTotals {
  let verifiedCents = 0;
  let pendingCents = 0;
  let contestedCents = 0;

  for (const c of contributions) {
    if (c.status === "VERIFIED") verifiedCents += c.baseAmountCents;
    else if (c.status === "DECLARED") pendingCents += c.baseAmountCents;
    else contestedCents += c.baseAmountCents;
  }

  const spentCents = expenseBaseCents.reduce((s, n) => s + n, 0);

  return {
    verifiedCents,
    pendingCents,
    contestedCents,
    spentCents,
    targetCents,
    balanceCents: verifiedCents - spentCents,
    outstandingCents: Math.max(0, targetCents - verifiedCents),
    percentOfTarget:
      targetCents > 0
        ? Math.min(100, Math.round((verifiedCents / targetCents) * 100))
        : 0,
  };
}

export const STATUS_LABEL: Record<ContributionLike["status"], string> = {
  DECLARED: "Awaiting verification",
  VERIFIED: "Verified",
  REJECTED: "Rejected",
  DISPUTED: "Disputed",
};
