import apiClient from "./apiClient";

export async function signup(email: string, password: string) {
  const { data } = await apiClient.post("/auth/signup", { email, password });
  return data;
}

export async function login(email: string, password: string) {
  const { data } = await apiClient.post("/auth/login", { email, password });
  return data;
}