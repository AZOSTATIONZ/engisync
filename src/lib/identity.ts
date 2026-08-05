/**
 * Central identity/display helpers.
 *
 * PRIVACY RULE: never render a raw email address in any shared/public surface.
 * Email is personal data — it is visible only to the account owner (Settings)
 * and, where operationally required, to administrators.
 *
 * Historically the UI used `user.name ?? user.email`, which silently leaked the
 * full address of every user who hadn't set a display name. `displayName()`
 * replaces that fallback with a masked, non-identifying handle.
 */

export type IdentityLike = {
  name?: string | null;
  email?: string | null;
};

/**
 * Mask an email for the rare cases where a hint is genuinely useful
 * (e.g. an admin disambiguating two identical names): `ta****o@gmail.com`
 * becomes `ta****@g***.com`-style — enough to recognise, not enough to contact.
 */
export function maskEmail(email: string | null | undefined): string {
  if (!email || !email.includes("@")) return "Member";
  const [local, domain] = email.split("@");
  const head = local.slice(0, 2);
  const dot = domain.lastIndexOf(".");
  const tld = dot > -1 ? domain.slice(dot) : "";
  return `${head}${"•".repeat(Math.max(3, local.length - 2))}@${domain[0]}${"•".repeat(3)}${tld}`;
}

/**
 * The only function that should be used to render a person's name in shared UI.
 * Falls back to a masked handle — never the raw email address.
 */
export function displayName(user: IdentityLike | null | undefined): string {
  if (!user) return "Member";
  const name = user.name?.trim();
  if (name) return softenShouting(name);
  return maskEmail(user.email);
}

/**
 * Fold a name that is written ENTIRELY in capitals.
 *
 * Students type their names as they appear on university records, which are
 * routinely all-caps. Rendered verbatim at heading size — "Good afternoon,
 * TAFADZWA" — it reads as shouting, and it is the largest text on the busiest
 * screen in the product.
 *
 * THE RULE IS DELIBERATELY NARROW: only names with no lowercase letter at all
 * are touched. That is the difference between correcting a data-entry artefact
 * and overruling somebody about their own name. A name is not a string to be
 * normalised — `van der Berg`, `McDonald`, `bell hooks` and `d'Angelo` are all
 * spelled the way their owner spells them, and every one of them survives this
 * function untouched because every one contains a lowercase letter.
 *
 * Word boundaries include hyphens and apostrophes, so `MARY-JANE O'BRIEN`
 * becomes `Mary-Jane O'Brien` rather than `Mary-jane O'brien`.
 */
export function softenShouting(name: string): string {
  // Any lowercase letter means the casing was chosen. Leave it alone.
  if (/[a-z]/.test(name)) return name;
  // Nothing to fold in a string with no letters (initials, symbols, scripts
  // without case such as Shona rendered in another alphabet).
  if (!/[A-Z]/.test(name)) return name;

  return name.replace(
    /[A-ZÀ-Þ]+/g,
    (word) => word[0] + word.slice(1).toLowerCase(),
  );
}

/**
 * Owner/admin-only: returns the real email. Callers MUST have already
 * authorized the viewer (account owner, or an administrator with a
 * legitimate need). Keeping this explicit makes the intent auditable.
 */
export function revealEmailForAuthorizedViewer(
  email: string | null | undefined,
): string {
  return email ?? "—";
}
