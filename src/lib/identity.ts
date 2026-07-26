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
  if (name) return name;
  return maskEmail(user.email);
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
