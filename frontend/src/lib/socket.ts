import { io, Socket } from "socket.io-client";
import { tokenStorage } from "./storage";

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io("http://localhost:4000", {
      auth: { token: tokenStorage.getAccessToken() },
    });
  }
  return socket;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}
