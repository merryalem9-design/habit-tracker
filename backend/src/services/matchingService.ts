import prisma from "../prismaClient";
import { generateAlias } from "../utils/generateAlias";

// Joins a user into a group for a given category.
// - "small_group": drop into any open small_group with room, or create one.
// - "pair": use a waiting-queue pattern — pair with anyone already waiting,
//   or become the waiting entry if no one is.
const SMALL_GROUP_MAX_MEMBERS = 6;
const PAIR_QUEUE_TIMEOUT_MS = 10 * 60 * 1000; // 10 min — fallback to group after this

export async function joinGroup(userId: string, category: string, type: "pair" | "small_group") {
  const existingMembership = await prisma.groupMembership.findFirst({
    where: {
      userId,
      status: "active",
      group: { category, type, status: "active" },
    },
    include: { group: true },
  });
  if (existingMembership) return existingMembership;

  if (type === "small_group") {
    return joinOrCreateSmallGroup(userId, category);
  }
  return joinOrQueuePair(userId, category);
}

async function joinOrCreateSmallGroup(userId: string, category: string) {
  const candidateGroups = await prisma.group.findMany({
    where: { category, type: "small_group", status: "active" },
    include: { memberships: { where: { status: "active" } } },
  });

  const openGroup = candidateGroups.find((g) => g.memberships.length < SMALL_GROUP_MAX_MEMBERS);

  const group =
    openGroup ??
    (await prisma.group.create({
      data: { category, type: "small_group", status: "active" },
    }));

  return prisma.groupMembership.create({
    data: {
      groupId: group.id,
      userId,
      aliasInGroup: generateAlias(),
      status: "active",
    },
    include: { group: true },
  });
}

async function joinOrQueuePair(userId: string, category: string) {
  const waitingPairs = await prisma.group.findMany({
    where: { category, type: "pair", status: "active" },
    include: { memberships: { where: { status: "active" } } },
  });

  const waitingGroup = waitingPairs.find(
    (g) => g.memberships.length === 1 && g.memberships[0].userId !== userId
  );

  if (waitingGroup) {
    return prisma.groupMembership.create({
      data: {
        groupId: waitingGroup.id,
        userId,
        aliasInGroup: generateAlias(),
        status: "active",
      },
      include: { group: true },
    });
  }

  const group = await prisma.group.create({
    data: { category, type: "pair", status: "active" },
  });

  return prisma.groupMembership.create({
    data: {
      groupId: group.id,
      userId,
      aliasInGroup: generateAlias(),
      status: "active",
    },
    include: { group: true },
  });
}

export async function leaveGroup(userId: string, groupId: string) {
  return prisma.groupMembership.updateMany({
    where: { userId, groupId, status: "active" },
    data: { status: "left" },
  });
}

export async function expireStalePairs() {
  const cutoff = new Date(Date.now() - PAIR_QUEUE_TIMEOUT_MS);
  const stalePairs = await prisma.group.findMany({
    where: { type: "pair", status: "active", createdAt: { lt: cutoff } },
    include: { memberships: { where: { status: "active" } } },
  });

  for (const pair of stalePairs) {
    if (pair.memberships.length === 1) {
      const membership = pair.memberships[0];
      await leaveGroup(membership.userId, pair.id);
      await prisma.group.update({ where: { id: pair.id }, data: { status: "disbanded" } });
      await joinOrCreateSmallGroup(membership.userId, pair.category);
    }
  }
}
