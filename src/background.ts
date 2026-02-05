const DEFAULT_THRESHOLD_DAYS = 30;
const CACHE_TTL_MS = 1000 * 60 * 60 * 4; // 4 hours
const RDAP_TIMEOUT_MS = 8000;

interface DomainCheckResult {
  domain: string;
  creationDate: string | null;
  ageDays: number | null;
  isRecent: boolean;
  status: "danger" | "safe" | "unknown";
  checkedAt: number;
}

interface RDAPEvent {
  eventAction: string;
  eventDate: string;
}

interface RDAPResponse {
  events?: RDAPEvent[];
}

const cache = new Map<string, DomainCheckResult>();

function extractRootDomain(hostname: string): string {
  const parts = hostname.replace(/^www\./, "").split(".");
  if (parts.length <= 2) return parts.join(".");
  const twoPartTLDs = [
    "co.uk", "org.uk", "ac.uk", "gov.uk",
    "co.jp", "or.jp", "ne.jp",
    "com.au", "net.au", "org.au",
    "com.br", "org.br",
    "co.nz", "org.nz",
    "co.kr", "or.kr",
    "co.in", "net.in", "org.in",
    "com.mx", "org.mx",
    "co.za",
  ];
  const lastTwo = parts.slice(-2).join(".");
  if (twoPartTLDs.includes(lastTwo)) {
    return parts.slice(-3).join(".");
  }
  return parts.slice(-2).join(".");
}

function daysSince(dateStr: string): number {
  const created = new Date(dateStr);
  const now = new Date();
  return Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
}

function isSkippableDomain(domain: string): boolean {
  const skip = [
    "localhost", "127.0.0.1", "0.0.0.0",
    "google.com", "google.fr", "youtube.com", "facebook.com",
    "twitter.com", "x.com", "github.com", "wikipedia.org",
    "amazon.com", "amazon.fr", "microsoft.com", "apple.com",
    "linkedin.com", "reddit.com", "instagram.com", "whatsapp.com",
    "netflix.com", "discord.com", "cloudflare.com", "mozilla.org",
    "tiktok.com", "snapchat.com", "paypal.com", "adobe.com",
  ];

  if (/^\d+\.\d+\.\d+\.\d+$/.test(domain)) { return true; }
  if (skip.includes(domain)) { return true; }
  if (domain.startsWith("chrome://")) { return true; }
  if (domain.startsWith("brave://")) { return true; }
  if (domain.startsWith("data:")) { return true; }
  if (domain.startsWith("blob:")) { return true; }

  return false;
}

async function fetchRDAPCreationDate(domain: string): Promise<string | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), RDAP_TIMEOUT_MS);

  try {
    const res = await fetch(`https://rdap.org/domain/${domain}`, {
      signal: controller.signal,
      redirect: "follow",
      headers: { Accept: "application/rdap+json, application/json" },
    });

    clearTimeout(timeout);

    if (!res.ok) {
      console.warn(`[YoungDomainGuard] RDAP returned ${res.status} for ${domain}`);
      return null;
    }

    const data: RDAPResponse = await res.json();

    if (data.events && Array.isArray(data.events)) {
      const registration = data.events.find(
        (e) => e.eventAction === "registration"
      );
      if (registration && registration.eventDate) {
        return registration.eventDate;
      }
    }

    console.warn(`[YoungDomainGuard] No registration event found for ${domain}`);
    return null;
  } catch (err: unknown) {
    clearTimeout(timeout);
    if (err instanceof Error && err.name === "AbortError") {
      console.warn(`[YoungDomainGuard] RDAP timeout for ${domain}`);
    } else if (err instanceof Error) {
      console.warn(`[YoungDomainGuard] RDAP error for ${domain}:`, err.message);
    }
    return null;
  }
}

async function checkDomain(domain: string): Promise<DomainCheckResult> {
  const cached = cache.get(domain);
  if (cached && Date.now() - cached.checkedAt < CACHE_TTL_MS) {
    return cached;
  }

  const creationDate = await fetchRDAPCreationDate(domain);

  let result: DomainCheckResult;
  if (creationDate) {
    const age = daysSince(creationDate);
    const thresholdDays = await getThreshold();
    const isRecent = age <= thresholdDays;
    result = {
      domain,
      creationDate,
      ageDays: age,
      isRecent,
      status: isRecent ? "danger" : "safe",
      checkedAt: Date.now(),
    };
  } else {
    result = {
      domain,
      creationDate: null,
      ageDays: null,
      isRecent: false,
      status: "unknown",
      checkedAt: Date.now(),
    };
  }

  cache.set(domain, result);
  return result;
}

async function getThreshold(): Promise<number> {
  try {
    const data = await chrome.storage.local.get("thresholdDays");
    return (data.thresholdDays as number) || DEFAULT_THRESHOLD_DAYS;
  } catch {
    return DEFAULT_THRESHOLD_DAYS;
  }
}

function updateBadge(tabId: number, result: Pick<DomainCheckResult, "status">): void {
  const api = chrome.action;

  if (result.status === "danger") {
    api.setBadgeText({ text: "\u26a0", tabId });
    api.setBadgeBackgroundColor({ color: "#EF4444", tabId });
    api.setIcon({
      path: {
        16: "icons/icon-danger-16.png",
        32: "icons/icon-danger-32.png",
        48: "icons/icon-danger-48.png",
        128: "icons/icon-danger-128.png",
      },
      tabId,
    });
  } else if (result.status === "safe") {
    api.setBadgeText({ text: "\u2713", tabId });
    api.setBadgeBackgroundColor({ color: "#22C55E", tabId });
    api.setIcon({
      path: {
        16: "icons/icon-safe-16.png",
        32: "icons/icon-safe-32.png",
        48: "icons/icon-safe-48.png",
        128: "icons/icon-safe-128.png",
      },
      tabId,
    });
  } else {
    api.setBadgeText({ text: "?", tabId });
    api.setBadgeBackgroundColor({ color: "#94A3B8", tabId });
    api.setIcon({
      path: {
        16: "icons/icon-default-16.png",
        32: "icons/icon-default-32.png",
        48: "icons/icon-default-48.png",
        128: "icons/icon-default-128.png",
      },
      tabId,
    });
  }
}

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status !== "complete" || !tab.url) return;

  let url: URL;
  try {
    url = new URL(tab.url);
  } catch {
    return;
  }

  if (!["http:", "https:"].includes(url.protocol)) return;

  const domain = extractRootDomain(url.hostname);

  if (isSkippableDomain(domain)) {
    updateBadge(tabId, { status: "safe" });
    return;
  }

  chrome.action.setBadgeText({ text: "\u2026", tabId });
  chrome.action.setBadgeBackgroundColor({ color: "#94A3B8", tabId });

  const result = await checkDomain(domain);

  updateBadge(tabId, result);

  if (result.status === "danger") {
    try {
      await chrome.tabs.sendMessage(tabId, {
        type: "DOMAIN_GUARD_ALERT",
        data: result,
      });
    } catch {
      // Content script may not be ready yet
    }
  }
});

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === "GET_DOMAIN_INFO") {
    const domain = msg.domain as string;
    if (!domain) {
      sendResponse({ status: "unknown" });
      return true;
    }
    checkDomain(domain).then((result) => {
      sendResponse(result);
    });
    return true;
  }

  if (msg.type === "GET_THRESHOLD") {
    getThreshold().then((t) => sendResponse({ thresholdDays: t }));
    return true;
  }

  if (msg.type === "SET_THRESHOLD") {
    chrome.storage.local.set({ thresholdDays: msg.value }).then(() => {
      cache.clear();
      sendResponse({ ok: true });
    });
    return true;
  }
});
