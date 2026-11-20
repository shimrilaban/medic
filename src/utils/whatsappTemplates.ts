import type { Prisma } from "@prisma/client";
import type { PharmacySearchResult } from "../services/pharmacySearch.js";

type TextMessagePayload = {
  messaging_product: "whatsapp";
  recipient_type: "individual";
  to: string;
  type: "text";
  text: {
    preview_url: boolean;
    body: string;
  };
};

type LocationRequestPayload = {
  messaging_product: "whatsapp";
  recipient_type: "individual";
  to: string;
  type: "interactive";
  interactive: {
    type: "location_request_message";
    body: { text: string };
    action: { name: "send_location" };
  };
};

type PharmacyResultsPayload = {
  messaging_product: "whatsapp";
  recipient_type: "individual";
  to: string;
  type: "interactive";
  interactive: {
    type: "button";
    body: { text: string };
    action: {
      buttons: Array<{
        type: "reply";
        reply: { id: string; title: string };
      }>;
    };
  };
};

function formatOpeningHours(openingHours: Prisma.JsonValue): string {
  if (openingHours === null) {
    return "Not provided";
  }
  if (typeof openingHours === "string") {
    return openingHours;
  }
  if (typeof openingHours === "object" && !Array.isArray(openingHours)) {
    const hours = Object.entries(openingHours)
      .map(([day, value]) => {
        const label = `${day[0]?.toUpperCase() ?? ""}${day.slice(1).replace(/([a-z])([A-Z])/g, "$1-$2")}`;
        const formattedValue = typeof value === "string" ? value : JSON.stringify(value);
        return `${label}: ${formattedValue}`;
      })
      .join(", ");
    return hours || "Not provided";
  }
  return JSON.stringify(openingHours);
}

export function buildLocationRequestMessage(
  to: string,
  medicineQuery: string,
): LocationRequestPayload {
  return {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to,
    type: "interactive",
    interactive: {
      type: "location_request_message",
      body: {
        text: `Share your location to check nearby prices for ${medicineQuery}.`,
      },
      action: { name: "send_location" },
    },
  };
}

export function buildPharmacyResultsMessage(
  to: string,
  medicineQuery: string,
  results: PharmacySearchResult[],
): PharmacyResultsPayload {
  const pharmacies = results.slice(0, 5);
  const resultLines = pharmacies.length
    ? pharmacies.map((result, index) => [
      `${index + 1}. ${result.pharmacyName}`,
      `${result.medicineName}${result.brandName ? ` (${result.brandName})` : ""} ${result.strength}, ${result.dosageForm}, ${result.packSize} - ${result.currency} ${result.price.toFixed(2)}`,
      `Distance: ${result.distanceKm.toFixed(1)} km | Hours: ${formatOpeningHours(result.openingHours)}`,
      `Map: ${result.googleMapsUrl}`,
    ].join("\n")).join("\n\n")
    : `No matching in-stock pharmacies were found nearby for ${medicineQuery}.`;

  return {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to,
    type: "interactive",
    interactive: {
      type: "button",
      body: {
        text: [
          `Nearby prices for ${medicineQuery}:`,
          "",
          resultLines,
          "",
          "Inventory and prices may change. This is not medical advice; verify details with a licensed pharmacist or doctor.",
        ].join("\n"),
      },
      action: {
        buttons: [
          {
            type: "reply",
            reply: { id: "search_another_medicine", title: "Search Another" },
          },
        ],
      },
    },
  };
}

export function buildSearchAgainPrompt(to: string): TextMessagePayload {
  return {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to,
    type: "text",
    text: {
      preview_url: false,
      body: "Which medicine would you like to compare?",
    },
  };
}
