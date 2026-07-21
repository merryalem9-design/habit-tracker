import apiClient from "./apiClient";

export async function getHabits() {
  const { data } = await apiClient.get("/habits");
  return data;
}

export async function createHabit(title: string, category: string, targetFrequency?: string) {
  const { data } = await apiClient.post("/habits", { title, category, targetFrequency });
  return data;
}

export async function checkIn(habitId: string, status: "success" | "relapse" | "skipped", note?: string, mood?: number) {
  const { data } = await apiClient.post("/checkins", { habitId, status, note, mood });
  return data;
}