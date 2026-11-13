import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

function ipv4Number(address: string): number {
  return address.split(".").reduce((value, part) => ((value << 8) | Number(part)) >>> 0, 0);
}

function isInIpv4Range(address: string, network: string, prefix: number): boolean {
  const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
  return (ipv4Number(address) & mask) === (ipv4Number(network) & mask);
}

function isPublicIpv4(address: string): boolean {
  const blocked: Array<[string, number]> = [
    ["0.0.0.0", 8], ["10.0.0.0", 8], ["100.64.0.0", 10], ["127.0.0.0", 8],
    ["169.254.0.0", 16], ["172.16.0.0", 12], ["192.0.0.0", 24], ["192.0.2.0", 24],
    ["192.88.99.0", 24], ["192.168.0.0", 16], ["198.18.0.0", 15], ["198.51.100.0", 24],
    ["203.0.113.0", 24], ["224.0.0.0", 4], ["240.0.0.0", 4],
  ];
  return !blocked.some(([network, prefix]) => isInIpv4Range(address, network, prefix));
}

function ipv6Number(address: string): bigint | null {
  let input = address.toLowerCase();
  if (input.includes(".")) {
    const lastColon = input.lastIndexOf(":");
    const ipv4 = input.slice(lastColon + 1);
    if (isIP(ipv4) !== 4) return null;
    const value = ipv4Number(ipv4);
    input = input.slice(0, lastColon + 1) + (value >>> 16).toString(16) + ":" + (value & 0xffff).toString(16);
  }
  const halves = input.split("::");
  if (halves.length > 2) return null;
  const left = halves[0] ? halves[0].split(":") : [];
  const right = halves.length === 2 && halves[1] ? halves[1].split(":") : [];
  const zeros = halves.length === 2 ? 8 - left.length - right.length : 0;
  const parts = [...left, ...Array(zeros).fill("0"), ...right];
  if (parts.length !== 8 || parts.some((part) => !/^[0-9a-f]{1,4}$/.test(part))) return null;
  return parts.reduce((value, part) => (value << 16n) | BigInt("0x" + part), 0n);
}

function isPublicAddress(address: string): boolean {
  const version = isIP(address);
  if (version === 4) return isPublicIpv4(address);
  if (version !== 6) return false;

  const value = ipv6Number(address);
  if (value === null) return false;
  // Permit globally routable 2000::/3 only. Exclude special/documentation and 6to4 ranges.
  if ((value >> 125n) !== 1n) return false;
  if ((value >> 105n) === 0x100080n) return false;
  if ((value >> 96n) === 0x20010db8n) return false;
  if ((value >> 112n) === 0x2002n) return false;
  return true;
}

export async function parsePublicHttpUrl(value: unknown): Promise<string | null> {
  if (typeof value !== "string" || !value.trim()) return null;
  try {
    const url = new URL(value.trim());
    if ((url.protocol !== "http:" && url.protocol !== "https:") || !url.hostname) return null;
    if (url.username || url.password) return null;

    const hostname = url.hostname.toLowerCase().replace(/\.$/, "").replace(/^\[|\]$/g, "");
    if (hostname === "localhost" || hostname.endsWith(".localhost") || hostname.endsWith(".local")) return null;

    const version = isIP(hostname);
    if (version) return isPublicAddress(hostname) ? url.toString() : null;

    const addresses = await lookup(hostname, { all: true, verbatim: true });
    if (!addresses.length || addresses.some(({ address }) => !isPublicAddress(address))) return null;
    return url.toString();
  } catch {
    return null;
  }
}
