import apiClient from "./apiClient";

export async function editPost(postId: string, content: string) {
  const { data } = await apiClient.patch(`/posts/${postId}`, { content });
  return data;
}

export async function deletePost(postId: string) {
  await apiClient.delete(`/posts/${postId}`);
}