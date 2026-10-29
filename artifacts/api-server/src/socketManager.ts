import { Server as HttpServer } from "node:http";
import { Server, Socket } from "socket.io";
import { logger } from "./lib/logger";

let io: Server | null = null;

interface LiveParticipant {
  socketId: string;
  userId: string;
  userName: string;
  isSpeaking: boolean;
  isMuted: boolean;
}

// Map<roomId, Map<socketId, LiveParticipant>>
const activeRoomParticipants = new Map<string, Map<string, LiveParticipant>>();

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

      const effectiveUserId = userId || `user-${Date.now()}`;
      const effectiveUserName = userName || "Student";

      // Manage active participants
      if (!activeRoomParticipants.has(roomId)) {
        activeRoomParticipants.set(roomId, new Map());
      }
      const roomUsers = activeRoomParticipants.get(roomId)!;

      // Other existing participants to send back to the newly joined user
      const existingMembers: LiveParticipant[] = [];
      for (const [sId, member] of roomUsers.entries()) {
        if (sId !== socket.id) {
          existingMembers.push(member);
        }
      }

      // Record this user
      const currentParticipant: LiveParticipant = {
        socketId: socket.id,
        userId: effectiveUserId,
        userName: effectiveUserName,
        isSpeaking: false,
        isMuted: false,
      };
      roomUsers.set(socket.id, currentParticipant);

      logger.info(
        { socketId: socket.id, roomId, userId: effectiveUserId, userName: effectiveUserName, currentCount: roomUsers.size },
        "Socket joined room stage",
      );

      // Send the newly joined user the list of everyone who is ALREADY in the room
      socket.emit("roomParticipantsList", {
        roomId,
        participants: existingMembers,
      });

      // Broadcast to other users in the room that this user has joined
      const joinPayload = {
        roomId,
        socketId: socket.id,
        userId: effectiveUserId,
        userName: effectiveUserName,
        timestamp: new Date().toISOString(),
      };
      socket.to(roomKey).emit("participantJoined", joinPayload);
      socket.to(roomKey).emit("userJoined", joinPayload);
    });

    // 2. Leave Room
    socket.on("leaveRoom", (data: { roomId: string; userId?: string; userName?: string }) => {
      const { roomId, userId, userName } = data || {};
      if (!roomId) return;
      const roomKey = `room:${roomId}`;
      socket.leave(roomKey);

      const roomUsers = activeRoomParticipants.get(roomId);
      if (roomUsers) {
        roomUsers.delete(socket.id);
        if (roomUsers.size === 0) activeRoomParticipants.delete(roomId);
      }

      logger.info({ socketId: socket.id, roomId, userId }, "Socket left room");

      const payload = {
        roomId,
        socketId: socket.id,
        userId: userId || "",
        userName: userName || "Someone",
        timestamp: new Date().toISOString(),
      };

      socket.to(roomKey).emit("participantLeft", payload);
      socket.to(roomKey).emit("userLeft", payload);
    });

    // 2b. WebRTC P2P Signaling (Offer / Answer / ICE Candidates for real bidirectional audio)
    socket.on("webrtcSignal", (data: {
      roomId: string;
      toSocketId?: string;
      signal: any;
      fromUserId?: string;
      fromUserName?: string;
    }) => {
      const { roomId, toSocketId, signal, fromUserId, fromUserName } = data || {};
      if (!roomId || !signal) return;

      const payload = {
        fromSocketId: socket.id,
        fromUserId: fromUserId || "user",
        fromUserName: fromUserName || "Student",
        signal,
      };

      if (toSocketId) {
        io?.to(toSocketId).emit("webrtcSignal", payload);
      } else {
        socket.to(`room:${roomId}`).emit("webrtcSignal", payload);
      }
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

      // Broadcast to all participants in this room
      socket.to(roomKey).emit("chatMessage", messagePayload);
    });

    // 4. Speaking state
    socket.on("speakingState", (data: { roomId: string; userId: string; userName: string; isSpeaking: boolean }) => {
      const { roomId, isSpeaking } = data || {};
      if (!roomId) return;
      const roomUsers = activeRoomParticipants.get(roomId);
      if (roomUsers && roomUsers.has(socket.id)) {
        roomUsers.get(socket.id)!.isSpeaking = Boolean(isSpeaking);
      }
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
      activeRoomParticipants.delete(roomId);
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
          const roomId = room.replace("room:", "");
          const roomUsers = activeRoomParticipants.get(roomId);
          if (roomUsers) {
            const member = roomUsers.get(socket.id);
            roomUsers.delete(socket.id);
            if (member) {
              socket.to(room).emit("participantLeft", {
                roomId,
                socketId: socket.id,
                userId: member.userId,
                userName: member.userName,
                timestamp: new Date().toISOString(),
              });
            }
            if (roomUsers.size === 0) activeRoomParticipants.delete(roomId);
          }
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
