import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { once } from "node:events";
import { test, type TestContext } from "node:test";
import type { AddressInfo } from "node:net";
import { createApp, type HealthChecks } from "../src/server.js";
import {
  createWhatsAppRouter,
  sendWhatsAppMessage,
  type WhatsAppPayload,
  type WhatsAppWebhookDependencies,
} from "../src/webhooks/whatsapp.js";
import {
  createSimulatorRouter,
  type MedicineOption,
  type SimulatorDependencies,
} from "../src/webhooks/simulator.js";
import type {
  PharmacySearchInput,
  PharmacySearchResult,
} from "../src/services/pharmacySearch.js";
import type { UserSession } from "../src/services/sessionService.js";

const userId = "wa-user-1";
const envKeys = [
  "WHATSAPP_TOKEN",
  "WHATSAPP_PHONE_NUMBER_ID",
  "WHATSAPP_VERIFY_TOKEN",
  "WHATSAPP_APP_SECRET",
] as const;

const pharmacyResults: PharmacySearchResult[] = [
  {
    pharmacyId: "pharmacy-cheapest",
    pharmacyName: "Cheapest Pharmacy",
    address: "Nairobi",
    openingHours: { mondayToSaturday: "08:00-21:00" },
    medicineName: "Amoxicillin",
    brandName: null,
    strength: "500 mg",
    dosageForm: "capsules",
    packSize: "15 capsules",
    category: "Antibiotics",
    price: 295,
    currency: "KES",
    distanceKm: 2.4,
    googleMapsUrl: "https://www.google.com/maps/search/?api=1&query=-1.29,36.78",
  },
  {
    pharmacyId: "pharmacy-next",
    pharmacyName: "Nearby Pharmacy",
    address: "Nairobi",
    openingHours: { mondayToSaturday: "08:00-20:00" },
    medicineName: "Amoxicillin",
    brandName: null,
    strength: "500 mg",
    dosageForm: "capsules",
    packSize: "15 capsules",
    category: "Antibiotics",
    price: 320,
    currency: "KES",
    distanceKm: 1.2,
    googleMapsUrl: "https://www.google.com/maps/search/?api=1&query=-1.28,36.81",
  },
];

type MockMetaRequest = {
  url: string;
  init?: RequestInit;
  payload: unknown;
};

async function createFixture(
  t: TestContext,
  options: {
    appSecret?: string;
    healthChecks?: HealthChecks;
    simulatorSearch?: WhatsAppWebhookDependencies["searchPharmacies"];
    simulatorMedicines?: SimulatorDependencies["listMedicines"];
  } = {},
) {
  const previousEnvironment = new Map(
    envKeys.map((key) => [key, process.env[key]] as const),
  );
  process.env.WHATSAPP_TOKEN = "test-token";
  process.env.WHATSAPP_PHONE_NUMBER_ID = "test-phone-id";
  process.env.WHATSAPP_VERIFY_TOKEN = "test-verify-token";
  if (options.appSecret) {
    process.env.WHATSAPP_APP_SECRET = options.appSecret;
  } else {
    delete process.env.WHATSAPP_APP_SECRET;
  }

  const previousFetch = globalThis.fetch;
  const metaRequests: MockMetaRequest[] = [];
  globalThis.fetch = async (input, init) => {
    const url = String(input);
    if (!url.startsWith("https://graph.facebook.com/")) {
      return previousFetch(input, init);
    }

    const body = typeof init?.body === "string" ? init.body : "{}";
    metaRequests.push({
      url,
      init,
      payload: JSON.parse(body) as unknown,
    });
    return new Response(null, { status: 200 });
  };

  const sessions = new Map<string, UserSession>();
  const searches: PharmacySearchInput[] = [];
  const sentMessages: WhatsAppPayload[] = [];
  const dependencies: WhatsAppWebhookDependencies = {
    getSession: async (waId) => sessions.get(waId) ?? { step: "IDLE" },
    setAwaitingLocation: async (waId, medicineQuery) => {
      sessions.set(waId, { step: "AWAITING_LOCATION", medicineQuery });
    },
    clearSession: async (waId) => {
      sessions.delete(waId);
    },
    searchPharmacies: async (input) => {
      searches.push(input);
      return pharmacyResults;
    },
    sendWhatsAppMessage: async (payload) => {
      await sendWhatsAppMessage(payload);
      sentMessages.push(payload);
    },
  };
  const simulator = createSimulatorRouter({
    searchPharmacies: options.simulatorSearch ?? (async () => pharmacyResults),
    listMedicines: options.simulatorMedicines ?? (async () => [
      {
        id: "medicine-amoxicillin-500-capsules",
        genericName: "Amoxicillin",
        brandName: null,
        strength: "500 mg",
        dosageForm: "capsules",
        packSize: "15 capsules",
        category: "Antibiotics",
      },
      {
        id: "medicine-panadol-500-tablets",
        genericName: "Paracetamol",
        brandName: "Panadol",
        strength: "500 mg",
        dosageForm: "tablets",
        packSize: "12 tablets",
        category: "OTC",
      },
    ]),
  });

  const server = createApp(
    createWhatsAppRouter(dependencies),
    options.healthChecks,
    simulator,
  ).listen(0);
  await once(server, "listening");
  const address = server.address() as AddressInfo;

  t.after(async () => {
    const closed = new Promise<void>((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve());
    });
    server.closeAllConnections();
    await closed;
    globalThis.fetch = previousFetch;
    for (const [key, value] of previousEnvironment) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  });

  return {
    baseUrl: `http://127.0.0.1:${address.port}`,
    metaRequests,
    searches,
    sentMessages,
    sessions,
  };
}

test("GET /webhook accepts the correct verification token and rejects an incorrect one", async (t) => {
  const fixture = await createFixture(t);
  const valid = await fetch(
    `${fixture.baseUrl}/webhook?hub.mode=subscribe&hub.verify_token=test-verify-token&hub.challenge=challenge-123`,
  );
  assert.equal(valid.status, 200);
  assert.equal(await valid.text(), "challenge-123");

  const invalid = await fetch(
    `${fixture.baseUrl}/webhook?hub.mode=subscribe&hub.verify_token=wrong&hub.challenge=challenge-123`,
  );
  assert.equal(invalid.status, 403);
});

test("GET /health reports database and Redis status without exposing errors", async (t) => {
  const fixture = await createFixture(t, {
    healthChecks: {
      database: async () => {
        throw new Error("database credentials");
      },
      redis: async () => {},
    },
  });
  const response = await fetch(`${fixture.baseUrl}/health`);

  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), {
    status: "unhealthy",
    database: "unavailable",
    redis: "ok",
  });
});

test("GET /simulator serves the WhatsApp-style medicine search page", async (t) => {
  const fixture = await createFixture(t);
  const response = await fetch(`${fixture.baseUrl}/simulator`);
  const html = await response.text();

  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /text\/html/);
  assert.match(html, /MediCompare WA Simulator/);
  assert.match(html, /Share Nairobi location/);
  assert.match(html, /\/api\/simulate/);
  assert.match(html, /<input id="medicine-search"/);
  assert.match(html, /<datalist id="medicine-options"/);
  assert.match(html, /<select id="medicine-list" class="medicine-list" size="5"/);
  assert.match(html, /id="category-pills"/);
  assert.match(html, /<select id="constituency"[^>]*size="5"/);
  assert.match(html, /<select id="area"[^>]*size="5"/);
  assert.match(html, /\/api\/medicines/);
  assert.match(html, /\/api\/locations/);
  assert.match(html, /Search Another Medicine/);
  assert.match(html, /licensed pharmacist or doctor/);
  assert.match(html, /background-size: cover/);
  assert.match(html, /background-attachment: fixed/);
  assert.match(html, /simulator-background\.jfif/);

  const background = await fetch(`${fixture.baseUrl}/images/simulator-background.jfif`);
  assert.equal(background.status, 200);
  assert.match(background.headers.get("content-type") ?? "", /^image\//);
});

test("GET /api/locations returns all Nairobi constituencies and coordinate areas", async (t) => {
  const fixture = await createFixture(t);
  const response = await fetch(`${fixture.baseUrl}/api/locations`);
  const body = await response.json() as {
    constituencies: Array<{
      name: string;
      areas: Array<{ name: string; lat: number; lng: number }>;
    }>;
  };
  const names = body.constituencies.map((constituency) => constituency.name);
  const westlands = body.constituencies.find((item) => item.name === "Westlands");
  const kasarani = body.constituencies.find((item) => item.name === "Kasarani");

  assert.equal(response.status, 200);
  assert.equal(body.constituencies.length, 17);
  assert.ok(names.includes("Ruaraka"));
  assert.ok(names.includes("Dagoretti North"));
  assert.ok(westlands?.areas.some((area) => area.name === "Kilimani / Kileleshwa border"));
  assert.ok(kasarani?.areas.some((area) => area.name === "Kahawa West"));
  assert.ok(body.constituencies.every((constituency) =>
    constituency.areas.length > 0
      && constituency.areas.every((area) =>
        Number.isFinite(area.lat)
        && Number.isFinite(area.lng)
        && area.lat >= -90
        && area.lat <= 90
        && area.lng >= -180
        && area.lng <= 180,
      ),
  ));
});

test("GET /api/medicines returns the full medicine dropdown data", async (t) => {
  const medicines: MedicineOption[] = [
    {
      id: "medicine-a",
      genericName: "Amoxicillin",
      brandName: null,
      strength: "500 mg",
      dosageForm: "capsules",
      packSize: "15 capsules",
      category: "Antibiotics",
    },
    {
      id: "medicine-b",
      genericName: "Paracetamol",
      brandName: "Panadol",
      strength: "500 mg",
      dosageForm: "tablets",
      packSize: "12 tablets",
      category: "OTC",
    },
  ];
  const fixture = await createFixture(t, {
    simulatorMedicines: async () => medicines,
  });
  const response = await fetch(`${fixture.baseUrl}/api/medicines`);
  const body = await response.json() as { medicines: MedicineOption[] };

  assert.equal(response.status, 200);
  assert.deepEqual(body.medicines, medicines);
  assert.ok(body.medicines.every((medicine) => medicine.category && medicine.packSize));
});

test("POST /api/simulate searches with supplied coordinates and returns pharmacy results", async (t) => {
  const searches: PharmacySearchInput[] = [];
  const fixture = await createFixture(t, {
    simulatorSearch: async (input) => {
      searches.push(input);
      return pharmacyResults;
    },
  });
  const response = await fetch(`${fixture.baseUrl}/api/simulate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query: "paracetamol",
      constituency: "Starehe",
      areaName: "CBD / Moi Avenue",
      lat: -1.2820393,
      lng: 36.8213899,
    }),
  });
  const body = await response.json() as {
    constituency: string;
    areaName: string;
    results: PharmacySearchResult[];
  };

  assert.equal(response.status, 200);
  assert.deepEqual(searches, [{
    query: "paracetamol",
    lat: -1.2820393,
    lng: 36.8213899,
  }]);
  assert.equal(body.constituency, "Starehe");
  assert.equal(body.areaName, "CBD / Moi Avenue");
  assert.deepEqual(body.results, pharmacyResults);
});

test("POST /api/simulate rejects invalid coordinates", async (t) => {
  const fixture = await createFixture(t);
  const response = await fetch(`${fixture.baseUrl}/api/simulate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query: "paracetamol",
      constituency: "Starehe",
      areaName: "CBD / Moi Avenue",
      lat: 100,
      lng: 36.8213899,
    }),
  });

  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), {
    error: "Provide valid latitude and longitude coordinates.",
  });
});

test("POST /api/simulate rejects coordinates that do not match the selected area", async (t) => {
  const fixture = await createFixture(t);
  const response = await fetch(`${fixture.baseUrl}/api/simulate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query: "paracetamol",
      constituency: "Starehe",
      areaName: "CBD / Moi Avenue",
      lat: -1.2864,
      lng: 36.8172,
    }),
  });

  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), {
    error: "Coordinates must match the selected area.",
  });
});

test("POST /webhook saves a text search and sends a location request", async (t) => {
  const fixture = await createFixture(t);
  const response = await fetch(`${fixture.baseUrl}/webhook`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      entry: [{
        changes: [{
          value: {
            messages: [{
              from: userId,
              type: "text",
              text: { body: "Amoxicillin 500mg" },
            }],
          },
        }],
      }],
    }),
  });

  assert.equal(response.status, 200);
  assert.deepEqual(fixture.sessions.get(userId), {
    step: "AWAITING_LOCATION",
    medicineQuery: "Amoxicillin 500mg",
  });
  assert.equal(fixture.sentMessages.length, 1);
  assert.equal(fixture.metaRequests.length, 1);
  assert.equal(fixture.metaRequests[0].url, "https://graph.facebook.com/v21.0/test-phone-id/messages");

  const payload = fixture.metaRequests[0].payload as {
    type: string;
    interactive: { type: string; action: { name: string }; body: { text: string } };
  };
  assert.equal(payload.type, "interactive");
  assert.equal(payload.interactive.type, "location_request_message");
  assert.equal(payload.interactive.action.name, "send_location");
  assert.match(payload.interactive.body.text, /Amoxicillin 500mg/);
});

test("POST /webhook searches on location, sends ranked prices, and clears the session", async (t) => {
  const fixture = await createFixture(t);
  fixture.sessions.set(userId, {
    step: "AWAITING_LOCATION",
    medicineQuery: "Amoxicillin",
  });
  const response = await fetch(`${fixture.baseUrl}/webhook`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      entry: [{
        changes: [{
          value: {
            messages: [{
              from: userId,
              type: "location",
              location: { latitude: -1.29, longitude: 36.78 },
            }],
          },
        }],
      }],
    }),
  });

  assert.equal(response.status, 200);
  assert.deepEqual(fixture.searches, [{
    query: "Amoxicillin",
    lat: -1.29,
    lng: 36.78,
  }]);
  assert.equal(fixture.sessions.has(userId), false);

  const payload = fixture.metaRequests[0].payload as {
    interactive: { body: { text: string } };
  };
  const resultsText = payload.interactive.body.text;
  assert.ok(resultsText.indexOf("Cheapest Pharmacy") < resultsText.indexOf("Nearby Pharmacy"));
  assert.match(resultsText, /KES 295\.00/);
  assert.doesNotMatch(resultsText, /Phone:/i);
  assert.match(resultsText, /2\.4 km/);
  assert.match(resultsText, /https:\/\/www\.google\.com\/maps\/search/);
  assert.match(resultsText, /licensed pharmacist or doctor/);
});

test("Search Another quick reply clears the session and prompts for another medicine", async (t) => {
  const fixture = await createFixture(t);
  fixture.sessions.set(userId, {
    step: "AWAITING_LOCATION",
    medicineQuery: "Amoxicillin",
  });
  const response = await fetch(`${fixture.baseUrl}/webhook`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      entry: [{
        changes: [{
          value: {
            messages: [{
              from: userId,
              type: "interactive",
              interactive: {
                button_reply: {
                  id: "search_another_medicine",
                  title: "Search Another",
                },
              },
            }],
          },
        }],
      }],
    }),
  });

  assert.equal(response.status, 200);
  assert.equal(fixture.sessions.has(userId), false);
  assert.equal(fixture.metaRequests.length, 1);
  const payload = fixture.metaRequests[0].payload as {
    type: string;
    text: { body: string };
  };
  assert.equal(payload.type, "text");
  assert.match(payload.text.body, /Which medicine would you like to compare/);
});

test("POST /webhook verifies the raw body signature when an app secret is configured", async (t) => {
  const secret = "local-test-secret";
  const fixture = await createFixture(t, { appSecret: secret });
  const body = JSON.stringify({ entry: [] });
  const signature = `sha256=${createHmac("sha256", secret).update(body).digest("hex")}`;

  const valid = await fetch(`${fixture.baseUrl}/webhook`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Hub-Signature-256": signature,
    },
    body,
  });
  assert.equal(valid.status, 200);

  const invalid = await fetch(`${fixture.baseUrl}/webhook`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Hub-Signature-256": "sha256=invalid",
    },
    body,
  });
  assert.equal(invalid.status, 401);
});
