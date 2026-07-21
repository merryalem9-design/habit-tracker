import prisma from "../prismaClient";
import { differenceInCalendarDays } from "date-fns";

// Recalculates a habit's streak from scratch based on its check-ins.
// Called every time a new check-in is created — keeps the streaks table
// as a fast-read CACHE, while check_ins stays the source of truth.
export async function recalculateStreak(habitId: string) {
  // Pull all check-ins for this habit, most recent first
  const checkIns = await prisma.checkIn.findMany({
    where: { habitId },
    orderBy: { date: "desc" },
  });

  if (checkIns.length === 0) {
    return prisma.streak.upsert({
      where: { habitId },
      update: { currentStreak: 0, longestStreak: 0, lastCheckinDate: null },
      create: { habitId, currentStreak: 0, longestStreak: 0 },
    });
  }

  let currentStreak = 0;
  let longestStreak = 0;
  let runningStreak = 0;
  let previousDate: Date | null = null;

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
    } else {
      const gap = differenceInCalendarDays(previousDate, checkIn.date);
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
      if (c.status !== "success") break;
      const gap = differenceInCalendarDays(prevDate, c.date);
      if (gap === 1) {
        currentStreak++;
        prevDate = c.date;
      } else {
        break;
      }
    }
  }

  return prisma.streak.upsert({
    where: { habitId },
    update: { currentStreak, longestStreak, lastCheckinDate: mostRecent.date },
    create: { habitId, currentStreak, longestStreak, lastCheckinDate: mostRecent.date },
  });
}