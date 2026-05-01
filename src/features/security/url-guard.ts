import "server-only";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { InputValidationError } from "@/lib/input-validation";

function ipv4ToNumber(value: string): number {
  return value.split(".").reduce((acc, part) => (acc << 8) + Number(part), 0) >>> 0;
}

function isPrivateIpv4(value: string): boolean {
  const ip = ipv4ToNumber(value);
  const ranges: Array<[string, string]> = [
    ["0.0.0.0", "0.255.255.255"],
    ["10.0.0.0", "10.255.255.255"],
    ["127.0.0.0", "127.255.255.255"],
    ["169.254.0.0", "169.254.255.255"],
    ["172.16.0.0", "172.31.255.255"],
    ["192.168.0.0", "192.168.255.255"],
    ["224.0.0.0", "255.255.255.255"],
  ];
  return ranges.some(([start, end]) => ip >= ipv4ToNumber(start) && ip <= ipv4ToNumber(end));
}

function isPrivateIpv6(value: string): boolean {
  const normalized = value.toLowerCase();
  return (
    normalized === "::" ||
    normalized === "::1" ||
    normalized.startsWith("fc") ||
    normalized.startsWith("fd") ||
    normalized.startsWith("fe80:")
  );
}

function assertPublicIp(address: string): void {
  const family = isIP(address);
  if (family === 4 && isPrivateIpv4(address)) {
    throw new InputValidationError("URL não permitida.");
  }
  if (family === 6 && isPrivateIpv6(address)) {
    throw new InputValidationError("URL não permitida.");
  }
}

export async function assertSafeExternalHttpUrl(url: URL): Promise<void> {
  if (!["http:", "https:"].includes(url.protocol)) {
    throw new InputValidationError("URL inválida.");
  }
  if (url.username || url.password) {
    throw new InputValidationError("URL com credenciais não é permitida.");
  }

  const hostname = url.hostname.toLowerCase();
  if (hostname === "localhost" || hostname.endsWith(".localhost") || hostname.endsWith(".local")) {
    throw new InputValidationError("URL não permitida.");
  }

  if (isIP(hostname)) {
    assertPublicIp(hostname);
    return;
  }

  const addresses = await lookup(hostname, { all: true, verbatim: true });
  if (!addresses.length) {
    throw new InputValidationError("Host da URL não encontrado.");
  }
  addresses.forEach((entry) => assertPublicIp(entry.address));
}
