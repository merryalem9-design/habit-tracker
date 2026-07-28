"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.recalculateStreak = recalculateStreak;
const prismaClient_1 = __importDefault(require("../prismaClient"));
const date_fns_1 = require("date-fns");
// Recalculates a habit's streak from scratch based on its check-ins.
// Called every time a new check-in is created — keeps the streaks table
// as a fast-read CACHE, while check_ins stays the source of truth.
async function recalculateStreak(habitId) {
    // Pull all check-ins for this habit, most recent first
    const checkIns = await prismaClient_1.default.checkIn.findMany({
        where: { habitId },
        orderBy: { date: "desc" },
    });
    if (checkIns.length === 0) {
        return prismaClient_1.default.streak.upsert({
            where: { habitId },
            update: { currentStreak: 0, longestStreak: 0, lastCheckinDate: null },
            create: { habitId, currentStreak: 0, longestStreak: 0 },
        });
    }
    let currentStreak = 0;
    let longestStreak = 0;
    let runningStreak = 0;
    let previousDate = null;
    // Walk through check-ins from most recent to oldest.
    // A "success" continues the streak; anything else (relapse/skipped) breaks it.
    for (const checkIn of checkIns) {
        if (checkIn.status !== "success") {
            runningStreak = 0;
            previousDate = checkIn.date;
            continue;
        }
        if (previousDate === null) {
            // first success we've seen (most recent)
            runningStreak = 1;
        }
        else {
            const gap = (0, date_fns_1.differenceInCalendarDays)(previousDate, checkIn.date);
            // gap === 1 means consecutive days (previousDate is one day after this one)
            runningStreak = gap === 1 ? runningStreak + 1 : 1;
        }
        longestStreak = Math.max(longestStreak, runningStreak);
        previousDate = checkIn.date;
    }
    // current streak = the streak ending at the most recent check-in,
    // but only counts if that most recent check-in was a success
    const mostRecent = checkIns[0];
    if (mostRecent.status === "success") {
        currentStreak = 1;
        let prevDate = mostRecent.date;
        for (let i = 1; i < checkIns.length; i++) {
            const c = checkIns[i];
            if (c.status !== "success")
                break;
            const gap = (0, date_fns_1.differenceInCalendarDays)(prevDate, c.date);
            if (gap === 1) {
                currentStreak++;
                prevDate = c.date;
            }
            else {
                break;
            }
        }
    }
    return prismaClient_1.default.streak.upsert({
        where: { habitId },
        update: { currentStreak, longestStreak, lastCheckinDate: mostRecent.date },
        create: { habitId, currentStreak, longestStreak, lastCheckinDate: mostRecent.date },
    });
}
