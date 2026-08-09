import { createHash } from "crypto";

/**
 * Turning a User-Agent string into something a student can recognise.
 *
 * The audience matters here. "Mozilla/5.0 (Linux; Android 14; SM-A155F)
 * AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36"
 * tells a second-year Electronic Engineering student nothing at all. "Chrome on
 * Android" lets them answer the only question that matters when they see a
 * sign-in alert: was that me?
 *
 * Parsing user agents is famously unreliable, and this deliberately does not
 * try to be exhaustive. It answers a narrow question with obvious failure
 * behaviour — an unrecognised agent becomes "Unknown device" rather than a
 * confident wrong guess, because a wrong label on a security alert is worse
 * than an honest absence of one.
 */

/** ORDER MATTERS: Edge claims Chrome, Chrome claims Safari, Opera claims both. */
const BROWSERS: [RegExp, string][] = [
  [/\bEdg(?:e|A|iOS)?\//i, "Edge"],
  [/\bOPR\/|\bOpera\b/i, "Opera"],
  [/\bSamsungBrowser\//i, "Samsung Internet"],
  [/\bFirefox\/|\bFxiOS\//i, "Firefox"],
  [/\bChrome\/|\bCriOS\//i, "Chrome"],
  [/\bSafari\//i, "Safari"],
];

/** Android must be tested before Linux — every Android UA also says Linux. */
const PLATFORMS: [RegExp, string][] = [
  [/\bAndroid\b/i, "Android"],
  [/\biPhone\b/i, "iPhone"],
  [/\biPad\b/i, "iPad"],
  [/\bWindows\b/i, "Windows"],
  [/\bMac OS X\b|\bMacintosh\b/i, "Mac"],
  [/\bCrOS\b/i, "ChromeOS"],
  [/\bLinux\b/i, "Linux"],
];

/** "Chrome on Android", "Safari on iPhone", or "Unknown device". */
export function describeDevice(userAgent: string | null | undefined): string {
  if (!userAgent || !userAgent.trim()) return "Unknown device";

  const browser = BROWSERS.find(([re]) => re.test(userAgent))?.[1];
  const platform = PLATFORMS.find(([re]) => re.test(userAgent))?.[1];

  if (browser && platform) return `${browser} on ${platform}`;
  if (browser) return browser;
  if (platform) return platform;
  return "Unknown device";
}

/**
 * Stable identifier for "a device like this one", scoped to a single user.
 *
 * Built from the DESCRIPTION rather than the raw agent, which is the whole
 * design. Chrome ships a new build every few weeks and the version sits in the
 * User-Agent; hashing that raw string would mark a student's own phone as a
 * brand-new device roughly monthly, and each of those false alarms teaches
 * them that sign-in alerts are noise. By the time a real one arrives they have
 * learned to dismiss it.
 *
 * The cost is bluntness: every Chrome-on-Android session for one account looks
 * alike. That is acceptable because this is a tripwire, never an access
 * control — nothing is authorised on the strength of a matching fingerprint.
 */
export function deviceFingerprint(userAgent: string | null | undefined): string {
  return createHash("sha256")
    .update(describeDevice(userAgent).toLowerCase())
    .digest("hex");
}
