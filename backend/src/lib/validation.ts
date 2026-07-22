import { z } from "zod";

export const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  timezone: z.string().optional(),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const createHabitSchema = z.object({
  title: z.string().min(1).max(100),
  category: z.string().min(1).max(50),
  targetFrequency: z.string().optional(),
});

export const updateHabitSchema = z.object({
  title: z.string().min(1).max(100).optional(),
  category: z.string().min(1).max(50).optional(),
  targetFrequency: z.string().optional(),
  isActive: z.boolean().optional(),
});

export const createCheckInSchema = z.object({
  habitId: z.string().uuid(),
  status: z.enum(["success", "relapse", "skipped"]),
  note: z.string().max(1000).optional(),
  mood: z.number().int().min(1).max(10).optional(),
});
export const distractMeSchema = z.object({
  checkInId: z.string().uuid().optional(),
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
});

export const distractFeedbackSchema = z.object({
  logId: z.string().uuid(),
  helped: z.boolean(),
});