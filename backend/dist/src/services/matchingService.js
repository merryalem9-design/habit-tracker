"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.joinGroup = joinGroup;
exports.leaveGroup = leaveGroup;
exports.expireStalePairs = expireStalePairs;
const prismaClient_1 = __importDefault(require("../prismaClient"));
const generateAlias_1 = require("../utils/generateAlias");
// Joins a user into a group for a given category.
// - "small_group": drop into any open small_group with room, or create one.
// - "pair": use a waiting-queue pattern — pair with anyone already waiting,
//   or become the waiting entry if no one is.
const SMALL_GROUP_MAX_MEMBERS = 6;
const PAIR_QUEUE_TIMEOUT_MS = 10 * 60 * 1000; // 10 min — fallback to group after this
async function joinGroup(userId, category, type) {
    const existingMembership = await prismaClient_1.default.groupMembership.findFirst({
        where: {
            userId,
            status: "active",
            group: { category, type, status: "active" },
        },
        include: { group: true },
    });
    if (existingMembership)
        return existingMembership;
    if (type === "small_group") {
        return joinOrCreateSmallGroup(userId, category);
    }
    return joinOrQueuePair(userId, category);
}
async function joinOrCreateSmallGroup(userId, category) {
    const candidateGroups = await prismaClient_1.default.group.findMany({
        where: { category, type: "small_group", status: "active" },
        include: { memberships: { where: { status: "active" } } },
    });
    const openGroup = candidateGroups.find((g) => g.memberships.length < SMALL_GROUP_MAX_MEMBERS);
    const group = openGroup ??
        (await prismaClient_1.default.group.create({
            data: { category, type: "small_group", status: "active" },
        }));
    return prismaClient_1.default.groupMembership.create({
        data: {
            groupId: group.id,
            userId,
            aliasInGroup: (0, generateAlias_1.generateAlias)(),
            status: "active",
        },
        include: { group: true },
    });
}
async function joinOrQueuePair(userId, category) {
    const waitingPairs = await prismaClient_1.default.group.findMany({
        where: { category, type: "pair", status: "active" },
        include: { memberships: { where: { status: "active" } } },
    });
    const waitingGroup = waitingPairs.find((g) => g.memberships.length === 1 && g.memberships[0].userId !== userId);
    if (waitingGroup) {
        return prismaClient_1.default.groupMembership.create({
            data: {
                groupId: waitingGroup.id,
                userId,
                aliasInGroup: (0, generateAlias_1.generateAlias)(),
                status: "active",
            },
            include: { group: true },
        });
    }
    const group = await prismaClient_1.default.group.create({
        data: { category, type: "pair", status: "active" },
    });
    return prismaClient_1.default.groupMembership.create({
        data: {
            groupId: group.id,
            userId,
            aliasInGroup: (0, generateAlias_1.generateAlias)(),
            status: "active",
        },
        include: { group: true },
    });
}
async function leaveGroup(userId, groupId) {
    return prismaClient_1.default.groupMembership.updateMany({
        where: { userId, groupId, status: "active" },
        data: { status: "left" },
    });
}
async function expireStalePairs() {
    const cutoff = new Date(Date.now() - PAIR_QUEUE_TIMEOUT_MS);
    const stalePairs = await prismaClient_1.default.group.findMany({
        where: { type: "pair", status: "active", createdAt: { lt: cutoff } },
        include: { memberships: { where: { status: "active" } } },
    });
    for (const pair of stalePairs) {
        if (pair.memberships.length === 1) {
            const membership = pair.memberships[0];
            await leaveGroup(membership.userId, pair.id);
            await prismaClient_1.default.group.update({ where: { id: pair.id }, data: { status: "disbanded" } });
            await joinOrCreateSmallGroup(membership.userId, pair.category);
        }
    }
}
