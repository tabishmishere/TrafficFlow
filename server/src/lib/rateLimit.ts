import { createHash } from "node:crypto";
import { redis } from "./redis";

const incrementScript = `
local count = redis.call("INCR", KEYS[1])
if count == 1 then
  redis.call("EXPIRE", KEYS[1], ARGV[1])
end
return { count, redis.call("TTL", KEYS[1]) }
`;

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

export async function consumeRateLimit(
  projectId: string,
  clientIp: string,
  limit: number,
  windowSeconds: number,
): Promise<RateLimitResult> {
  if (!redis.isReady) {
    throw new Error("Rate limiting service is unavailable.");
  }

  const clientHash = createHash("sha256").update(clientIp).digest("hex");
  const key = `trafficflow:rate:${projectId}:${clientHash}`;
  const result = await redis.eval(incrementScript, {
    keys: [key],
    arguments: [String(windowSeconds)],
  }) as number[];
  const [count, ttl] = result;

  return {
    allowed: count <= limit,
    remaining: Math.max(0, limit - count),
    retryAfterSeconds: Math.max(1, ttl),
  };
}
