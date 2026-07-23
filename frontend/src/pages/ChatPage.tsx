import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import apiClient from "../lib/apiClient";
import { getSocket } from "../lib/socket";
import { useAuthStore } from "../store/authStore";

interface Message {
  id: string;
  senderId: string;
  content: string;
  createdAt: string;
}

export default function ChatPage() {
  const { conversationId } = useParams();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const currentUser = useAuthStore((s) => s.user);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const socket = getSocket();

    // Fetch messages
    apiClient.get(`/chat/${conversationId}/messages`).then((res) => setMessages(res.data));

    // Join conversation
    socket.emit("join_conversation", conversationId);

    const onNewMessage = (msg: Message) => {
      setMessages((prev) => [...prev, msg]);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    };

    socket.on("new_message", onNewMessage);

    return () => {
      socket.off("new_message", onNewMessage);
      socket.emit("leave_conversation", conversationId);
    };
  }, [conversationId]);

  const sendMessage = () => {
    if (!input.trim()) return;
    const socket = getSocket();
    socket.emit("send_message", { conversationId, content: input });
    setInput("");
  };

  return (
    <div className="min-h-screen bg-brand-dark flex flex-col">
      {/* Header */}
      <div className="bg-white/5 border-b border-white/10 p-4 flex items-center gap-3">
        <button onClick={() => navigate("/chat")} className="text-gray-400 hover:text-white">
          ←
        </button>
        <h1 className="text-white font-bold">Chat</h1>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.map((msg) => (
          <motion.div
            key={msg.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`max-w-[75%] p-3 rounded-2xl ${
              msg.senderId === currentUser?.id
                ? "bg-brand-purple text-white self-end ml-auto"
                : "bg-white/10 text-gray-200 self-start"
            }`}
          >
            <p className="text-sm">{msg.content}</p>
            <span className="text-xs opacity-70 block mt-1">
              {new Date(msg.createdAt).toLocaleTimeString()}
            </span>
          </motion.div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-white/10 bg-brand-dark/80 backdrop-blur-sm">
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Type a message..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-gray-500 focus:border-brand-purple focus:outline-none"
          />
          <button
            onClick={sendMessage}
            className="bg-brand-purple px-5 py-3 rounded-xl text-white font-semibold"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}