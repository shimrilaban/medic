import "dotenv/config";
import express, { Router, type Request, type Response } from "express";
import {
  clearSession,
  getSession,
  setAwaitingLocation,
} from "../services/sessionService.js";
import { getPrismaClient } from "../services/prismaClient.js";
import {
  searchNearbyPharmacies,
  type PharmacySearchInput,
  type PharmacySearchResult,
} from "../services/pharmacySearch.js";
import {
  buildLocationRequestMessage,
  buildPharmacyResultsMessage,
  buildSearchAgainPrompt,
} from "../utils/whatsappTemplates.js";

type IncomingMessage = {
  from?: string;
  type?: string;
  text?: { body?: string };
  location?: { latitude?: number; longitude?: number };
  interactive?: {
    button_reply?: { id?: string; title?: string };
    list_reply?: { id?: string; title?: string };
  };
};

type WebhookBody = {
  entry?: Array<{
    changes?: Array<{
      value?: {
        messages?: IncomingMessage[];
      };
    }>;
  }>;
};

export type WhatsAppPayload = ReturnType<typeof buildSearchAgainPrompt>
  | ReturnType<typeof buildLocationRequestMessage>
  | ReturnType<typeof buildPharmacyResultsMessage>;

export type WhatsAppWebhookDependencies = {
  clearSession: typeof clearSession;
  getSession: typeof getSession;
  setAwaitingLocation: typeof setAwaitingLocation;
  searchPharmacies(input: PharmacySearchInput): Promise<PharmacySearchResult[]>;
  sendWhatsAppMessage(payload: WhatsAppPayload): Promise<void>;
};

export async function sendWhatsAppMessage(payload: WhatsAppPayload): Promise<void> {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!token || !phoneNumberId) {
    throw new Error("WHATSAPP_TOKEN and WHATSAPP_PHONE_NUMBER_ID must be configured.");
  }

  const response = await fetch(
    `https://graph.facebook.com/v21.0/${encodeURIComponent(phoneNumberId)}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    },
  );

  if (!response.ok) {
    const responseBody = await response.text();
    throw new Error(`WhatsApp API returned ${response.status}: ${responseBody}`);
  }
}

function isResetMessage(message: IncomingMessage): boolean {
  const text = message.text?.body?.trim().toLowerCase();
  const replyId = message.interactive?.button_reply?.id
    ?? message.interactive?.list_reply?.id;
  const replyTitle = message.interactive?.button_reply?.title
    ?? message.interactive?.list_reply?.title;

  return replyId === "search_another_medicine"
    || replyTitle?.trim().toLowerCase() === "search another medicine"
    || replyTitle?.trim().toLowerCase() === "search another"
    || text === "hi"
    || text === "menu"
    || text === "reset";
}

async function handleMessage(
  message: IncomingMessage,
  dependencies: WhatsAppWebhookDependencies,
): Promise<void> {
  const waId = message.from;
  if (!waId) {
    throw new Error("Incoming WhatsApp message is missing the sender ID.");
  }

  if (isResetMessage(message)) {
    await dependencies.clearSession(waId);
    await dependencies.sendWhatsAppMessage(buildSearchAgainPrompt(waId));
    return;
  }

  if (message.type === "text") {
    const medicineQuery = message.text?.body?.trim();
    if (!medicineQuery) {
      await dependencies.sendWhatsAppMessage(buildSearchAgainPrompt(waId));
      return;
    }

    await dependencies.setAwaitingLocation(waId, medicineQuery);
    await dependencies.sendWhatsAppMessage(
      buildLocationRequestMessage(waId, medicineQuery),
    );
    return;
  }

  if (message.type === "location") {
    const latitude = message.location?.latitude;
    const longitude = message.location?.longitude;
    if (
      typeof latitude !== "number"
      || typeof longitude !== "number"
      || !Number.isFinite(latitude)
      || !Number.isFinite(longitude)
      || latitude < -90
      || latitude > 90
      || longitude < -180
      || longitude > 180
    ) {
      await dependencies.sendWhatsAppMessage(buildSearchAgainPrompt(waId));
      return;
    }

    const session = await dependencies.getSession(waId);
    if (session.step !== "AWAITING_LOCATION" || !session.medicineQuery) {
      await dependencies.sendWhatsAppMessage(buildSearchAgainPrompt(waId));
      return;
    }

    const results = await dependencies.searchPharmacies({
      query: session.medicineQuery,
      lat: latitude,
      lng: longitude,
    });
    await dependencies.sendWhatsAppMessage(
      buildPharmacyResultsMessage(waId, session.medicineQuery, results),
    );
    await dependencies.clearSession(waId);
  }
}

function queryValue(value: unknown): string | undefined {
  if (typeof value === "string") {
    return value;
  }
  if (Array.isArray(value) && typeof value[0] === "string") {
    return value[0];
  }
  return undefined;
}

export function createWhatsAppRouter(
  overrides: Partial<WhatsAppWebhookDependencies> = {},
): Router {
  const dependencies: WhatsAppWebhookDependencies = {
    clearSession,
    getSession,
    setAwaitingLocation,
    searchPharmacies: (input) => searchNearbyPharmacies(input, getPrismaClient()),
    sendWhatsAppMessage,
    ...overrides,
  };
  const router = Router();
  router.use(express.json({ limit: "1mb" }));

  router.get("/webhook", (req: Request, res: Response) => {
    const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN;
    const mode = queryValue(req.query["hub.mode"]);
    const token = queryValue(req.query["hub.verify_token"]);
    const challenge = queryValue(req.query["hub.challenge"]);

    if (!verifyToken) {
      res.status(500).send("WhatsApp verification token is not configured.");
      return;
    }

    if (mode === "subscribe" && token === verifyToken && challenge !== undefined) {
      res.status(200).send(challenge);
      return;
    }

    res.sendStatus(403);
  });

  router.post(
    "/webhook",
    async (req: Request<unknown, unknown, WebhookBody>, res: Response) => {
      const messages = req.body?.entry
        ?.flatMap((entry) => entry.changes ?? [])
        .flatMap((change) => change.value?.messages ?? []) ?? [];

      try {
        for (const message of messages) {
          await handleMessage(message, dependencies);
        }
        res.sendStatus(200);
      } catch (error) {
        console.error("WhatsApp webhook processing failed:", error);
        res.sendStatus(500);
      }
    },
  );

  return router;
}

export default createWhatsAppRouter();
