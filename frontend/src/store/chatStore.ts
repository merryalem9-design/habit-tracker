import { create } from "zustand";
import apiClient from "../lib/apiClient";

interface Conversation {
  id: string;
  type: "group" | "direct";
  group?: { category: string };
  user1?: { id: string; displayAlias: string };
  user2?: { id: string; displayAlias: string };
  messages: { content: string; createdAt: string }[];
  updatedAt: string;
  unreadCount?: number;
}

interface ChatState {
  conversations: Conversation[];
  setConversations: (convs: Conversation[]) => void;
  updateUnreadCount: (conversationId: string, count: number) => void;
  markAsRead: (conversationId: string) => Promise<void>;
}

export const useChatStore = create<ChatState>((set) => ({
  conversations: [],
  setConversations: (convs) => set({ conversations: convs }),
  updateUnreadCount: (conversationId, count) =>
    set((state) => ({
      conversations: state.conversations.map((conv) =>
        conv.id === conversationId ? { ...conv, unreadCount: count } : conv
      ),
    })),
  markAsRead: async (conversationId) => {
    await apiClient.post(`/chat/${conversationId}/read`);
    set((state) => ({
      conversations: state.conversations.map((conv) =>
        conv.id === conversationId ? { ...conv, unreadCount: 0 } : conv
      ),
    }));
  },
}));