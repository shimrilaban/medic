import type { Prisma, PrismaClient } from "@prisma/client";

export type PharmacySearchInput = {
  query: string;
  lat: number;
  lng: number;
  radiusKm?: number;
  limit?: number;
};

export type PharmacySearchResult = {
  pharmacyId: string;
  pharmacyName: string;
  address: string;
  openingHours: Prisma.JsonValue;
  medicineName: string;
  brandName: string | null;
  strength: string;
  dosageForm: string;
  packSize: string;
  category: string;
  price: number;
  currency: string;
  distanceKm: number;
  googleMapsUrl: string;
};

export async function searchNearbyPharmacies(
  input: PharmacySearchInput,
  prisma: Pick<PrismaClient, "$queryRaw">,
): Promise<PharmacySearchResult[]> {
  const { lat, lng, radiusKm = 10, limit = 5 } = input;
  const query = input.query;
  const searchQuery = query.trim();

  if (!searchQuery) {
    throw new Error("Medicine search query must not be empty.");
  }
  if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
    throw new RangeError("Latitude must be between -90 and 90.");
  }
  if (!Number.isFinite(lng) || lng < -180 || lng > 180) {
    throw new RangeError("Longitude must be between -180 and 180.");
  }
  if (!Number.isFinite(radiusKm) || radiusKm <= 0) {
    throw new RangeError("Search radius must be a positive number of kilometers.");
  }
  if (!Number.isInteger(limit) || limit <= 0) {
    throw new RangeError("Result limit must be a positive integer.");
  }

  return prisma.$queryRaw<PharmacySearchResult[]>`
    WITH search AS (
      SELECT
        lower(${searchQuery}) AS query,
        ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography AS user_location
    )
    SELECT
      p."id" AS "pharmacyId",
      p."name" AS "pharmacyName",
      p."address" AS "address",
      p."openingHours" AS "openingHours",
      m."genericName" AS "medicineName",
      m."brandName" AS "brandName",
      m."strength" AS "strength",
      m."dosageForm" AS "dosageForm",
      m."packSize" AS "packSize",
      m."category" AS "category",
      ip."price"::double precision AS "price",
      ip."currency" AS "currency",
      ST_Distance(p."location", s.user_location) / 1000.0 AS "distanceKm",
      'https://www.google.com/maps/search/?api=1&query='
        || ST_Y(p."location"::geometry)::text
        || ','
        || ST_X(p."location"::geometry)::text AS "googleMapsUrl"
    FROM "InventoryPrice" ip
    JOIN "Pharmacy" p ON p."id" = ip."pharmacyId"
    JOIN "Medicine" m ON m."id" = ip."medicineId"
    CROSS JOIN search s
    WHERE ip."quantityOnHand" > 0
      AND ST_DWithin(p."location", s.user_location, ${radiusKm * 1000})
      AND EXISTS (
        SELECT 1
        FROM regexp_split_to_table(s.query, '[[:space:]]+') AS token(value)
        WHERE regexp_replace(token.value, '[^[:alnum:]]', '', 'g') <> ''
      )
      AND NOT EXISTS (
        SELECT 1
        FROM regexp_split_to_table(s.query, '[[:space:]]+') AS token(value)
        WHERE regexp_replace(token.value, '[^[:alnum:]]', '', 'g') <> ''
          AND lower(regexp_replace(
            concat_ws(' ', m."genericName", m."brandName", m."strength", m."dosageForm", m."packSize"),
            '[^[:alnum:]]',
            '',
            'g'
          )) NOT LIKE '%' || lower(regexp_replace(token.value, '[^[:alnum:]]', '', 'g')) || '%'
          AND similarity(lower(m."genericName"), lower(token.value)) < 0.25
          AND similarity(lower(coalesce(m."brandName", '')), lower(token.value)) < 0.25
      )
    ORDER BY ip."price" ASC, "distanceKm" ASC
    LIMIT ${limit}
  `;
}
