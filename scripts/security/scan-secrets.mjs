import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const checks = [
  { name: "OpenAI key", regex: /\bsk-[A-Za-z0-9]{20,}\b/g },
  { name: "Supabase secret key", regex: /\bsb_secret_[A-Za-z0-9_-]{20,}\b/g },
  { name: "JWT token", regex: /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g },
  { name: "Private key", regex: /-----BEGIN (?:RSA |EC |OPENSSH |PGP )?PRIVATE KEY-----/g },
  { name: "Connection string with password", regex: /\bpostgres(?:ql)?:\/\/[^:\s]+:[^@\s]+@/g },
  { name: "Hardcoded service-role env", regex: /\bSUPABASE_SERVICE_ROLE_KEY\s*=\s*[^\s#]+/g },
];

const allowlistPatterns = [
  /^README\.md$/,
  /^\.env\.example$/,
  /^package-lock\.json$/,
];

const filesRaw = execFileSync("git", ["ls-files", "-z"], { encoding: "utf8" });
const files = filesRaw.split("\0").filter(Boolean);

const findings = [];

for (const file of files) {
  if (allowlistPatterns.some((pattern) => pattern.test(file))) continue;

  let content = "";
  try {
    content = readFileSync(file, "utf8");
  } catch {
    continue;
  }

  if (!content) continue;

  for (const check of checks) {
    const matches = [...content.matchAll(check.regex)];
    if (matches.length === 0) continue;

    for (const match of matches) {
      const raw = match[0];
      const safeSample = raw.length > 16 ? `${raw.slice(0, 8)}...${raw.slice(-4)}` : raw;
      findings.push({
        file,
        check: check.name,
        sample: safeSample,
      });
    }
  }
}

if (findings.length > 0) {
  console.error("Secret scan failed. Potential sensitive data found in tracked files:");
  findings.forEach((item) => {
    console.error(`- ${item.file} | ${item.check} | ${item.sample}`);
  });
  process.exit(1);
}

console.log("Secret scan passed.");
