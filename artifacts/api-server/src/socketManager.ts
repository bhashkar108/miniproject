import { Server as HttpServer } from "node:http";
import { Server, Socket } from "socket.io";
import { logger } from "./lib/logger";

let io: Server | null = null;

export function initIO(httpServer: HttpServer): Server {
  io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
      credentials: true,
    },
    transports: ["websocket", "polling"],
  });

  io.on("connection", (socket: Socket) => {
    logger.info({ socketId: socket.id }, "Client connected to VoiceRoom socket");

    // 1. Join Room
    socket.on("joinRoom", (data: { roomId: string; userId?: string; userName?: string }) => {
      const { roomId, userId, userName } = data || {};
      if (!roomId) return;
      const roomKey = `room:${roomId}`;
      socket.join(roomKey);
      logger.info({ socketId: socket.id, roomId, userId, userName }, "Socket joined room");

      const payload = {
        roomId,
        userId: userId || `user-${Date.now()}`,
        userName: userName || "Student",
        timestamp: new Date().toISOString(),
      };

      // Emit both names for full compatibility
      socket.to(roomKey).emit("participantJoined", payload);
      socket.to(roomKey).emit("userJoined", payload);
    });

    // 2. Leave Room
    socket.on("leaveRoom", (data: { roomId: string; userId?: string; userName?: string }) => {
      const { roomId, userId, userName } = data || {};
      if (!roomId) return;
      const roomKey = `room:${roomId}`;
      socket.leave(roomKey);
      logger.info({ socketId: socket.id, roomId, userId }, "Socket left room");

      const payload = {
        roomId,
        userId: userId || "",
        userName: userName || "Someone",
        timestamp: new Date().toISOString(),
      };

      socket.to(roomKey).emit("participantLeft", payload);
      socket.to(roomKey).emit("userLeft", payload);
    });

    // 3. Real-time Chat
    socket.on("chatMessage", (data: {
      id?: string;
      roomId: string;
      userId?: string;
      userName?: string;
      sender?: string;
      content: string;
      timestamp?: string;
    }) => {
      const { roomId, userId, userName, sender, content } = data || {};
      if (!roomId || !content) return;
      const roomKey = `room:${roomId}`;

      const displayName = sender || userName || "Student";
      const messagePayload = {
        id: data.id || `msg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        roomId,
        userId: userId || "guest",
        userName: displayName,
        sender: displayName,
        senderInitials: displayName.slice(0, 2).toUpperCase(),
        content: content.trim(),
        timestamp: data.timestamp || new Date().toISOString(),
        createdAt: new Date().toISOString(),
      };

      // Broadcast to room members (including or excluding sender)
      socket.to(roomKey).emit("chatMessage", messagePayload);
    });

    // 4. Speaking state
    socket.on("speakingState", (data: { roomId: string; userId: string; userName: string; isSpeaking: boolean }) => {
      const { roomId } = data || {};
      if (!roomId) return;
      socket.to(`room:${roomId}`).emit("peerSpeaking", data);
    });

    // 5. Host controls: Room update (lock, chat toggle, capacity)
    socket.on("roomUpdate", (data: { roomId: string; locked?: boolean; chatEnabled?: boolean; capacity?: number }) => {
      const { roomId } = data || {};
      if (!roomId) return;
      const roomKey = `room:${roomId}`;
      socket.to(roomKey).emit("roomUpdated", data);
    });

    // 6. Host controls: Room close
    socket.on("roomClose", (data: { roomId: string }) => {
      const { roomId } = data || {};
      if (!roomId) return;
      const roomKey = `room:${roomId}`;
      socket.to(roomKey).emit("roomClosed", data);
    });

    // 7. Host controls: Mute participant
    socket.on("muteParticipant", (data: { roomId: string; userName: string; userId?: string }) => {
      const { roomId } = data || {};
      if (!roomId) return;
      const roomKey = `room:${roomId}`;
      socket.to(roomKey).emit("participantMuted", data);
    });

    // 8. Host controls: Remove participant
    socket.on("removeParticipant", (data: { roomId: string; userName: string; userId?: string }) => {
      const { roomId } = data || {};
      if (!roomId) return;
      const roomKey = `room:${roomId}`;
      socket.to(roomKey).emit("participantRemoved", data);
    });

    // 9. Disconnect handling
    socket.on("disconnecting", () => {
      for (const room of socket.rooms) {
        if (room.startsWith("room:")) {
          socket.to(room).emit("userDisconnected", { socketId: socket.id });
        }
      }
    });

    socket.on("disconnect", (reason) => {
      logger.info({ socketId: socket.id, reason }, "Socket disconnected");
    });
  });

  return io;
}

export function getIO(): Server {
  if (!io) {
    throw new Error("Socket.IO has not been initialized. Call initIO(server) first.");
  }
  return io;
}
