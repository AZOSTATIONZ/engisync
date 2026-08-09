import { describe, it, expect } from "vitest";
import { describeDevice, deviceFingerprint } from "@/lib/device";

/**
 * Real User-Agent strings. Written out in full rather than simplified,
 * because the bugs in agent parsing live precisely in the noise — Edge
 * claiming to be Chrome, Chrome claiming to be Safari, and every Android
 * device also claiming Linux.
 */
const UA = {
  chromeAndroid:
    "Mozilla/5.0 (Linux; Android 14; SM-A155F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
  chromeAndroidNewer:
    "Mozilla/5.0 (Linux; Android 14; SM-A155F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.6478.71 Mobile Safari/537.36",
  safariIphone:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1",
  edgeWindows:
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.2210.91",
  firefoxWindows:
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0",
  chromeWindows:
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  samsung:
    "Mozilla/5.0 (Linux; Android 13; SAMSUNG SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/23.0 Chrome/115.0.0.0 Mobile Safari/537.36",
};

describe("describeDevice", () => {
  it("names the device the way its owner would", () => {
    expect(describeDevice(UA.chromeAndroid)).toBe("Chrome on Android");
    expect(describeDevice(UA.safariIphone)).toBe("Safari on iPhone");
    expect(describeDevice(UA.firefoxWindows)).toBe("Firefox on Windows");
  });

  it("is not fooled by browsers that impersonate others", () => {
    // Every one of these contains "Safari"; two contain "Chrome".
    expect(describeDevice(UA.edgeWindows)).toBe("Edge on Windows");
    expect(describeDevice(UA.samsung)).toBe("Samsung Internet on Android");
    expect(describeDevice(UA.chromeWindows)).toBe("Chrome on Windows");
  });

  it("says Android, not Linux, for a phone", () => {
    // Android agents also match /Linux/. Getting this backwards would label
    // every student's phone "Chrome on Linux".
    expect(describeDevice(UA.chromeAndroid)).not.toContain("Linux");
  });

  it("admits ignorance instead of guessing", () => {
    expect(describeDevice(null)).toBe("Unknown device");
    expect(describeDevice(undefined)).toBe("Unknown device");
    expect(describeDevice("")).toBe("Unknown device");
    expect(describeDevice("   ")).toBe("Unknown device");
    expect(describeDevice("curl/8.4.0")).toBe("Unknown device");
  });
});

describe("deviceFingerprint", () => {
  it("SURVIVES A BROWSER UPDATE", () => {
    // The property the whole alerting design rests on. Chrome updates roughly
    // monthly; if a new version read as a new device, every student would get
    // a false "new sign-in" alert every few weeks and would learn to ignore
    // the one that matters.
    expect(deviceFingerprint(UA.chromeAndroid)).toBe(
      deviceFingerprint(UA.chromeAndroidNewer),
    );
  });

  it("distinguishes genuinely different devices", () => {
    const seen = new Set(
      [UA.chromeAndroid, UA.safariIphone, UA.edgeWindows, UA.firefoxWindows, UA.samsung].map(
        deviceFingerprint,
      ),
    );
    expect(seen.size).toBe(5);
  });

  it("separates the same browser on different platforms", () => {
    expect(deviceFingerprint(UA.chromeAndroid)).not.toBe(
      deviceFingerprint(UA.chromeWindows),
    );
  });

  it("does not embed the agent string it came from", () => {
    const fp = deviceFingerprint(UA.chromeAndroid);
    expect(fp).toHaveLength(64);
    expect(fp).not.toContain("Android");
  });
});
