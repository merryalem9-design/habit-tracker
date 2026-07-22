import { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import apiClient from "../lib/apiClient";
import { getSocket } from "../lib/socket";

interface Post {
  id: string;
  content: string | null;
  alias: string;
  createdAt: string;
  reactions: { reactionType: string }[];
}

export default function GroupFeedPage() {
  const { groupId } = useParams();
  const [posts, setPosts] = useState<Post[]>([]);
  const [message, setMessage] = useState("");
  const socketRef = useRef(getSocket());

  useEffect(() => {
    async function loadFeed() {
      const { data } = await apiClient.get(`/groups/${groupId}/feed`);
      setPosts(data);
    }
    loadFeed();

    const socket = socketRef.current;
    socket.emit("join_group", groupId);

    socket.on("new_post", (post: Post) => {
      setPosts((prev) => [post, ...prev]);
    });

    return () => {
      socket.emit("leave_group", groupId);
      socket.off("new_post");
    };
  }, [groupId]);

  async function handlePost(e: React.FormEvent) {
    e.preventDefault();
    if (!message.trim()) return;
    await apiClient.post("/posts", { groupId, content: message });
    setMessage("");
  }

  return (
    <div style={{ maxWidth: 500, margin: "20px auto", padding: "0 16px", color: "#F8FAFC" }}>
      <h2>Group Feed</h2>
      <form onSubmit={handlePost} style={{ marginBottom: 16 }}>
        <input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Share a check-in or thought..."
          maxLength={280}
          style={{ width: "100%", padding: 10, boxSizing: "border-box" }}
        />
        <button type="submit" style={{ marginTop: 8 }}>Post</button>
      </form>
      {posts.map((post) => (
        <div key={post.id} style={{ border: "1px solid #333", borderRadius: 8, padding: 12, marginBottom: 8 }}>
          <strong>{post.alias}</strong>
          <p>{post.content}</p>
          <small>{new Date(post.createdAt).toLocaleString()}</small>
        </div>
      ))}
    </div>
  );
}
