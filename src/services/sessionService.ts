import "dotenv/config";
import { createClient, type RedisClientType } from "redis";

export type SessionStep = "IDLE" | "AWAITING_LOCATION";

export type UserSession = {
  step: SessionStep;
  medicineQuery?: string;
};

const SESSION_TTL_SECONDS = 15 * 60;
const SESSION_KEY_PREFIX = "medicompare:session:";

let client: RedisClientType | undefined;
let connection: Promise<RedisClientType> | undefined;

function getRedisClient(): RedisClientType {
  if (!client) {
    const url = process.env.REDIS_URL;
    if (!url) {
      throw new Error("REDIS_URL must be set to use conversation sessions.");
    }

    const parsedUrl = new URL(url);
    const useTls = parsedUrl.protocol === "rediss:"
      || (parsedUrl.protocol === "redis:" && parsedUrl.hostname.endsWith(".upstash.io"));
    const connectionUrl = useTls && parsedUrl.protocol === "redis:"
      ? url.replace(/^redis:/, "rediss:")
      : url;

    client = createClient({
      url: connectionUrl,
      socket: {
        ...(useTls ? { tls: true } : {}),
        connectTimeout: 5000,
        reconnectStrategy: (retries) => retries < 1 ? 250 : false,
      },
    });
    client.on("error", (error) => {
      console.error("Redis session connection error:", error);
    });
  }

  return client;
}

async function getConnectedClient(): Promise<RedisClientType> {
  const redis = getRedisClient();
  if (redis.isOpen) {
    return redis;
  }

  if (!connection) {
    connection = redis.connect().then(() => redis).finally(() => {
      connection = undefined;
    });
  }

  return connection;
}

function sessionKey(waId: string): string {
  if (!waId.trim()) {
    throw new Error("WhatsApp user ID must not be empty.");
  }
  return `${SESSION_KEY_PREFIX}${waId}`;
}

export async function getSession(waId: string): Promise<UserSession> {
  const redis = await getConnectedClient();
  const serialized = await redis.get(sessionKey(waId));
  if (serialized === null) {
    return { step: "IDLE" };
  }

  const session: unknown = JSON.parse(serialized);
  if (
    typeof session !== "object"
    || session === null
    || !("step" in session)
    || (session.step !== "IDLE" && session.step !== "AWAITING_LOCATION")
    || ("medicineQuery" in session && typeof session.medicineQuery !== "string")
  ) {
    throw new Error("Stored WhatsApp session has an invalid format.");
  }

  return session as UserSession;
}

export async function setAwaitingLocation(
  waId: string,
  medicineQuery: string,
): Promise<void> {
  const query = medicineQuery.trim();
  if (!query) {
    throw new Error("Medicine query must not be empty.");
  }

  const redis = await getConnectedClient();
  const session: UserSession = {
    step: "AWAITING_LOCATION",
    medicineQuery: query,
  };
  await redis.set(sessionKey(waId), JSON.stringify(session), {
    EX: SESSION_TTL_SECONDS,
  });
}

export async function clearSession(waId: string): Promise<void> {
  const redis = await getConnectedClient();
  await redis.del(sessionKey(waId));
}

export async function checkRedisConnection(): Promise<void> {
  const redis = await getConnectedClient();
  const response = await redis.ping();
  if (response !== "PONG") {
    throw new Error("Redis health check returned an unexpected response.");
  }
}

export async function closeRedisConnection(): Promise<void> {
  if (client?.isOpen) {
    await client.quit();
  }
}
