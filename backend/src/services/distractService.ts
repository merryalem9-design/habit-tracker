import prisma from "../prismaClient";
import logger from "../lib/logger";
import { getIO } from "../socket";

export type DistractType = "quote" | "coffee" | "ping_buddy" | "support_group";

function mapToSuggestionType(type: DistractType): "content" | "activity" | "nearby_place" | "ping_buddy" {
  switch (type) {
    case "quote": return "content";
    case "coffee": return "nearby_place";
    case "ping_buddy": return "ping_buddy";
    case "support_group": return "ping_buddy";
    default: return "content";
  }
}

interface PingBuddyResult {
  sent: boolean;
  matched?: boolean;
  conversationId?: string;
  otherUser?: string;
  emergencyContact?: { name: string; phone: string } | null;
  message?: any;
}

interface DistractResult {
  suggestionType: DistractType;
  content?: { id: string; text: string; source: string | null; category: string };
  nearbyPlace?: { name: string; address: string; types: string[] } | null;
  pingBuddy?: PingBuddyResult;
  supportGroup?: { sent: boolean; groupId?: string; needsSelection?: boolean; groups?: any[]; error?: string };
  logId: string;
}

async function pingDirectMatch(userId: string): Promise<PingBuddyResult> {
  const conv = await prisma.conversation.findFirst({
    where: {
      type: "direct",
      OR: [{ user1Id: userId }, { user2Id: userId }],
    },
    include: {
      user1: { select: { displayAlias: true, emergencyContactName: true, emergencyContactPhone: true } },
      user2: { select: { displayAlias: true, emergencyContactName: true, emergencyContactPhone: true } },
    },
  });

  if (!conv) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { emergencyContactName: true, emergencyContactPhone: true },
    });
    if (user?.emergencyContactName && user?.emergencyContactPhone) {
      return {
        sent: false,
        matched: false,
        emergencyContact: { name: user.emergencyContactName, phone: user.emergencyContactPhone },
      };
    }
    return { sent: false, matched: false, emergencyContact: null };
  }

  const otherUser = conv.user1Id === userId ? conv.user2 : conv.user1;
  const msg = await prisma.chatMessage.create({
    data: {
      conversationId: conv.id,
      senderId: userId,
      content: "💙 I'm having a tough moment and could use some support. Are you available to chat?",
    },
  });
  await prisma.conversation.update({
    where: { id: conv.id },
    data: { updatedAt: new Date() },
  });

  return {
    sent: true,
    matched: true,
    conversationId: conv.id,
    otherUser: otherUser?.displayAlias || "Your match",
    message: msg,
    emergencyContact: null,
  };
}

async function supportGroupPing(userId: string, targetGroupId?: string) {
  try {
    // If no target group provided, detect automatically
    if (!targetGroupId) {
      const memberships = await prisma.groupMembership.findMany({
        where: { userId, status: "active" },
        include: { group: true }
      });

      if (memberships.length === 0) {
        return { sent: false, error: "You are not in any active groups yet. Please join one from your dashboard." };
      }
      
      if (memberships.length === 1) {
        targetGroupId = memberships[0].groupId;
      } else {
        return { 
          sent: false, 
          needsSelection: true, 
          groups: memberships.map(m => ({ id: m.group.id, category: m.group.category })) 
        };
      }
    }

    // Verify the selected group ID actually belongs to the user
    const membership = await prisma.groupMembership.findFirst({
      where: { groupId: targetGroupId, userId, status: "active" },
    });

    if (!membership) {
      return { 
        sent: false, 
        error: "You are not currently a member of the selected group. Please try re-joining from your dashboard." 
      };
    }

    const post = await prisma.post.create({
      data: {
        groupId: targetGroupId,
        userId,
        content: `${membership.aliasInGroup} is going through a tough moment and would appreciate some encouragement. 💙`,
        flagged: false,
      },
    });

    const shaped = {
      id: post.id,
      content: post.content,
      checkInId: post.checkInId,
      createdAt: post.createdAt,
      alias: membership.aliasInGroup,
      userId: post.userId,
      reactions: [],
    };

    getIO().to(`group:${targetGroupId}`).emit("new_post", shaped);

    return { sent: true, groupId: targetGroupId };
  } catch (error) {
    // Logging explicitly so you can check your Render backend logs
    console.error("[Support Group Ping] Database Error:", error);
    return { 
      sent: false, 
      error: "A database error occurred while processing your request. Check Render backend logs for details." 
    };
  }
}

async function getRandomQuote() {
  const items = await prisma.distractionContent.findMany({
    where: { type: { in: ["quote", "verse"] } },
  });
  if (items.length === 0) return null;
  return items[Math.floor(Math.random() * items.length)];
}

async function findNearbyCoffee(lat: number, lng: number) {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    logger.warn("GOOGLE_PLACES_API_KEY not set");
    return null;
  }

  try {
    const url = new URL("https://maps.googleapis.com/maps/api/place/nearbysearch/json");
    url.searchParams.set("location", `${lat},${lng}`);
    url.searchParams.set("radius", "3000");
    url.searchParams.set("type", "cafe");
    url.searchParams.set("key", apiKey);

    const res = await fetch(url.toString());
    const data = await res.json();
    if (data.status !== "OK" || data.results.length === 0) return null;

    const place = data.results[Math.floor(Math.random() * Math.min(3, data.results.length))];
    return {
      name: place.name,
      address: place.vicinity,
      types: place.types?.slice(0, 3) || [],
    };
  } catch (err) {
    logger.error("Google Places API error", { err });
    return null;
  }
}

export async function getDistraction(
  userId: string,
  type: DistractType,
  checkInId: string | null,
  lat?: number,
  lng?: number,
  targetGroupId?: string
): Promise<DistractResult> {
  let result: Omit<DistractResult, "logId">;
  let contentId: string | null = null;
  let dbSuggestionType = mapToSuggestionType(type);

  switch (type) {
    case "quote": {
      const item = await getRandomQuote();
      contentId = item?.id ?? null;
      result = { suggestionType: "quote", content: item ?? undefined };
      break;
    }
    case "coffee": {
      const place = lat && lng ? await findNearbyCoffee(lat, lng) : null;
      result = { suggestionType: "coffee", nearbyPlace: place };
      break;
    }
    case "ping_buddy": {
      const ping = await pingDirectMatch(userId);
      result = { suggestionType: "ping_buddy", pingBuddy: ping };
      break;
    }
    case "support_group": {
      const ping = await supportGroupPing(userId, targetGroupId);
      result = { suggestionType: "support_group", supportGroup: ping };
      break;
    }
    default: {
      const item = await getRandomQuote();
      contentId = item?.id ?? null;
      result = { suggestionType: "quote", content: item ?? undefined };
      dbSuggestionType = "content";
    }
  }

  // Create a log if we successfully sent something or if it's the first stage of selection
  if (type !== "support_group" || (result.supportGroup && !result.supportGroup.needsSelection)) {
    const log = await prisma.distractionLog.create({
      data: {
        userId,
        checkInId,
        suggestionType: dbSuggestionType,
        contentId,
        triggeredAt: new Date(),
      },
    });
    return { ...result, logId: log.id };
  }

  return { ...result, logId: "" };
}