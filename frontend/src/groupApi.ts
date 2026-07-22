import apiClient from "./apiClient";

export async function joinGroup(category: string, type: "pair" | "small_group" = "small_group") {
  const { data } = await apiClient.post("/groups/join", { category, type });
  return data;
}

export async function getMyGroups() {
  const { data } = await apiClient.get("/groups/mine");
  return data;
}