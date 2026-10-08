/**
 * Outbound HTTP for provider + media traffic.
 *
 * The MovieBox edge blocks datacenter IPs (Vercel egress gets 403/440 keyed
 * off the real TCP source IP). Set MOVIEBOX_PROXY_URL to an HTTP(S) proxy with
 * a residential/mobile exit and every provider + CDN fetch is routed through
 * it. Unset → plain global fetch and the app degrades to the offline demo
 * catalog.
 */
import "server-only";
import { ProxyAgent } from "undici";

type Dispatcher = InstanceType<typeof ProxyAgent>;

let cached: Dispatcher | null | undefined;

export function proxyUrl(): string | null {
  const url = process.env.MOVIEBOX_PROXY_URL?.trim();
  return url ? url : null;
}

function dispatcher(): Dispatcher | null {
  if (cached !== undefined) return cached;
  const url = proxyUrl();
  if (!url) {
    cached = null;
    return null;
  }
  try {
    cached = new ProxyAgent(url);
  } catch {
    cached = null;
  }
  return cached;
}

export const usingProxy = (): boolean => dispatcher() !== null;

/** Host portion of the proxy URL only — never the credentials. */
export function proxyUrlHost(): string | undefined {
  const url = proxyUrl();
  if (!url) return undefined;
  try {
    return new URL(url).host;
  } catch {
    return undefined;
  }
}

/**
 * fetch() that honours MOVIEBOX_PROXY_URL. Returns a standard Response so
 * .body can be piped straight through by the media proxy route.
 */
export function outboundFetch(url: string, init: RequestInit = {}): Promise<Response> {
  const agent = dispatcher();
  if (!agent) return fetch(url, init);
  return fetch(url, { ...init, dispatcher: agent } as RequestInit);
}
