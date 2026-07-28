import { io, Socket } from "socket.io-client";
import { tokenStorage } from "./storage";

let socket: Socket | null = null;

// Get the base URL from environment, fallback to localhost
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000/api";
// Remove /api from the end to get the base URL for socket
const SOCKET_URL = API_URL.replace(/\/api$/, "");

export function getSocket(): Socket {
  if (!socket) {
    socket = io(SOCKET_URL, {
      auth: { token: tokenStorage.getAccessToken() },
      transports: ["websocket", "polling"],
    });
  }
  return socket;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}