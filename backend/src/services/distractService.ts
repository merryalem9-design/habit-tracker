import prisma from "../prismaClient";
import logger from "../lib/logger";

// The four suggestion types, in rotation priority order.
// nearby_place only fires if the user has location enabled.
const SUGGESTION_TYPES = ["content", "activity", "nearby_place", "ping_buddy"] as const;
type SuggestionType = (typeof SUGGESTION_TYPES)[number];

interface DistractResult {
  suggestionType: SuggestionType;
  content?: { id: string; text: string; source: string | null; category: string };
  nearbyPlace?: { name: string; address: string; types: string[] } | null;
  pingBuddy?: { sent: boolean; groupId?: string };
  logId: string;
}

// Pick a suggestion type based on user preferences + location opt-in.
// Weighted: content/activity favored over nearby_place/ping_buddy since
// those require external dependencies (GPS, group membership).
function pickSuggestionType(
  enableLocation: boolean,
  hasGroup: boolean,
  lastType: SuggestionType | null
): SuggestionType {
  const available: SuggestionType[] = ["content", "activity"];
  if (enableLocation) available.push("nearby_place");
  if (hasGroup) available.push("ping_buddy");

  // Filter out the last type shown to ensure rotation
  const rotated = available.filter((t) => t !== lastType);
  const pool = rotated.length > 0 ? rotated : available;

  return pool[Math.floor(Math.random() * pool.length)];
}

// Fetches a random piece of content matching user's preferred categories.
// Falls back to any content if no match found for their preferences.
async function pickContent(preferredCategories: string[]) {
  const preferred = preferredCategories.length > 0
    ? await prisma.distractionContent.findMany({
        where: { category: { in: preferredCategories } },
      })
    : [];

  const pool = preferred.length > 0
    ? preferred
    : await prisma.distractionContent.findMany();

  if (pool.length === 0) return null;
  return pool[Math.floor(Math.random() * pool.length)];
}

// Calls Google Places Nearby Search API with the user's coordinates.
// Returns one relevant place (cafe, park, gym, or library).
async function fetchNearbyPlace(lat: number, lng: number) {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    logger.warn("GOOGLE_PLACES_API_KEY not set — skipping nearby place");
    return null;
  }

  const types = ["cafe", "park", "gym", "library"];
  const type = types[Math.floor(Math.random() * types.length)];

  try {
    const url = new URL("https://maps.googleapis.com/maps/api/place/nearbysearch/json");
    url.searchParams.set("location", `${lat},${lng}`);
    url.searchParams.set("radius", "2000"); // 2km radius
    url.searchParams.set("type", type);
    url.searchParams.set("key", apiKey);

    const res = await fetch(url.toString());
    const data = await res.json() as {
      status: string;
      results: { name: string; vicinity: string; types: string[] }[];
    };

    if (data.status !== "OK" || data.results.length === 0) return null;

    const place = data.results[Math.floor(Math.random() * Math.min(3, data.results.length))];
    return {
      name: place.name,
      address: place.vicinity,
      types: place.types.slice(0, 3),
    };
  } catch (err) {
    logger.error("Google Places API error", { err });
    return null;
  }
}

// Sends a lightweight "I need support" ping to the user's active group.
async function pingBuddy(userId: string) {
  const membership = await prisma.groupMembership.findFirst({
    where: { userId, status: "active" },
    include: { group: true },
  });

  if (!membership) return { sent: false };

  await prisma.post.create({
    data: {
      groupId: membership.groupId,
      userId,
      content: `${membership.aliasInGroup} is having a tough moment and could use some support. 💙`,
      flagged: false,
    },
  });

  return { sent: true, groupId: membership.groupId };
}

// Main entry point — called by the controller.
export async function getDistraction(
  userId: string,
  checkInId: string | null,
  lat?: number,
  lng?: number
): Promise<DistractResult> {
  // Load user preferences
  const prefs = await prisma.userPreferences.findUnique({ where: { userId } });
  const enableLocation = prefs?.enableLocationSuggestions ?? false;
  const preferredCategories = prefs?.contentCategories ?? [];

  // Find what was last shown to this user — avoid immediate repeats
  const lastLog = await prisma.distractionLog.findFirst({
    where: { userId },
    orderBy: { triggeredAt: "desc" },
  });
  const lastType = (lastLog?.suggestionType as SuggestionType | null) ?? null;

  // Check group membership for ping_buddy eligibility
  const membership = await prisma.groupMembership.findFirst({
    where: { userId, status: "active" },
  });

  const suggestionType = pickSuggestionType(
    enableLocation && !!lat && !!lng,
    !!membership,
    lastType
  );

  let result: Omit<DistractResult, "logId">;
  let contentId: string | null = null;

  switch (suggestionType) {
    case "content": {
      const item = await pickContent(preferredCategories);
      contentId = item?.id ?? null;
      result = { suggestionType, content: item ?? undefined };
      break;
    }
    case "activity": {
      const item = await pickContent(["breathing", "physical", "journaling"]);
      contentId = item?.id ?? null;
      result = { suggestionType, content: item ?? undefined };
      break;
    }
    case "nearby_place": {
      const place = lat && lng ? await fetchNearbyPlace(lat, lng) : null;
      result = { suggestionType, nearbyPlace: place };
      break;
    }
    case "ping_buddy": {
      const ping = await pingBuddy(userId);
      result = { suggestionType, pingBuddy: ping };
      break;
    }
  }

  // Log this interaction — used for stats + rotation memory
  const log = await prisma.distractionLog.create({
    data: {
      userId,
      checkInId,
      suggestionType,
      contentId,
      triggeredAt: new Date(),
    },
  });

  return { ...result, logId: log.id };
}