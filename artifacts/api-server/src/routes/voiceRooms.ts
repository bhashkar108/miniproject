import { Router, type IRouter } from "express";
import { AccessToken } from "livekit-server-sdk";
import { SignJWT, jwtVerify } from "jose";
import {
  db,
  voiceRoomsTable,
  voiceRoomParticipantsTable,
  voiceRoomChatMessagesTable,
} from "@workspace/db";
import { eq, desc, and } from "drizzle-orm";
import { getIO } from "../socketManager";

const router: IRouter = Router();

// ─── Types ───────────────────────────────────────────────────────────

export interface VoiceRoomData {
  id: string;
  name: string;
  category: string;
  host: string;
  hostId: string;
  initials: string;
  count: number;
  capacity: number;
  access: "Public" | "Private";
  approval: boolean;
  allowMembers: boolean;
  description: string;
  color: string;
  live: boolean;
  locked: boolean;
  created?: boolean;
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  roomId: string;
  userId: string;
  userName: string;
  content: string;
  createdAt: string;
}

export interface MemoryParticipant {
  id: string;
  roomId: string;
  userId: string;
  userName: string;
  role: "host" | "speaker" | "listener";
  isMuted: boolean;
  joinedAt: string;
}

// ─── In-memory stores ────────────────────────────────────────────────

/** All rooms keyed by room ID (works without DB) */
export const memoryRooms: Map<string, VoiceRoomData> = new Map([
  [
    "demo-english",
    {
      id: "demo-english",
      name: "English Speaking Circle",
      category: "Language Practice",
      host: "Aarav Sharma",
      hostId: "host-demo-english",
      initials: "AS",
      count: 6,
      capacity: 12,
      access: "Public",
      approval: false,
      allowMembers: true,
      description: "Build confidence, practice daily English, and make new friends.",
      color: "linear-gradient(135deg,#e6a7ff,#6d86ff)",
      live: true,
      locked: false,
      createdAt: new Date().toISOString(),
    },
  ],
  [
    "demo-study",
    {
      id: "demo-study",
      name: "Study With Me · Focus Room",
      category: "Education",
      host: "Priya Verma",
      hostId: "host-demo-study",
      initials: "PV",
      count: 4,
      capacity: 8,
      access: "Public",
      approval: true,
      allowMembers: true,
      description: "Quiet accountability, study goals, and a little motivation.",
      color: "linear-gradient(135deg,#f9c47b,#e87b9c)",
      live: true,
      locked: false,
      createdAt: new Date().toISOString(),
    },
  ],
  [
    "demo-lounge",
    {
      id: "demo-lounge",
      name: "Late Night Chai Lounge",
      category: "General",
      host: "Kabir Singh",
      hostId: "host-demo-lounge",
      initials: "KS",
      count: 9,
      capacity: 12,
      access: "Public",
      approval: false,
      allowMembers: true,
      description: "Relaxed conversations, new perspectives, good company.",
      color: "linear-gradient(135deg,#77d6ca,#5c8cff)",
      live: true,
      locked: false,
      createdAt: new Date().toISOString(),
    },
  ],
  [
    "demo-game",
    {
      id: "demo-game",
      name: "Game Talk Arena",
      category: "Gaming",
      host: "Rohan Mehta",
      hostId: "host-demo-game",
      initials: "RM",
      count: 3,
      capacity: 8,
      access: "Public",
      approval: false,
      allowMembers: true,
      description: "Talk strategies, share your favourite games, find teammates.",
      color: "linear-gradient(135deg,#ff9b70,#a66bff)",
      live: true,
      locked: false,
      createdAt: new Date().toISOString(),
    },
  ],
  [
    "demo-movie",
    {
      id: "demo-movie",
      name: "Movies & Music Club",
      category: "Entertainment",
      host: "Ananya Rao",
      hostId: "host-demo-movie",
      initials: "AR",
      count: 5,
      capacity: 12,
      access: "Public",
      approval: false,
      allowMembers: true,
      description: "What are you watching or listening to this week?",
      color: "linear-gradient(135deg,#ff9fca,#8872ff)",
      live: true,
      locked: false,
      createdAt: new Date().toISOString(),
    },
  ],
]);

/** In-memory participants per room */
export const memoryParticipants: Map<string, MemoryParticipant[]> = new Map();

/** In-memory chat messages per room (capped at 200) */
export const memoryChatMessages: Map<string, ChatMessage[]> = new Map();

/** Rate limit: last message timestamp per userId */
const chatRateLimit: Map<string, number> = new Map();

/** Maximum messages stored in memory per room */
const MAX_CHAT_MESSAGES = 200;

/** JWT secret for invitation tokens */
const JWT_SECRET_RAW = process.env["JWT_SECRET"] || "dev-voice-room-secret-key-replace-in-production";
const JWT_SECRET = new TextEncoder().encode(JWT_SECRET_RAW);

// ─── Helper: convert DB room record to VoiceRoomData ─────────────────

function dbRoomToData(r: {
  id: string;
  title: string;
  description: string | null;
  category: string;
  hostId: string;
  hostName: string;
  isPrivate: boolean;
  requireApproval: boolean;
  maxParticipants: number;
  status: string;
  createdAt: Date | null;
}): VoiceRoomData {
  return {
    id: r.id,
    name: r.title,
    category: r.category,
    host: r.hostName,
    hostId: r.hostId,
    initials:
      r.hostName
        .split(" ")
        .map((w) => w[0])
        .join("")
        .slice(0, 2)
        .toUpperCase() || "VR",
    count: memoryParticipants.get(r.id)?.length ?? 1,
    capacity: r.maxParticipants || 12,
    access: (r.isPrivate ? "Private" : "Public") as "Public" | "Private",
    approval: r.requireApproval || false,
    allowMembers: true,
    description: r.description || "Come in and join the conversation.",
    color: "linear-gradient(135deg,#8b82ff,#56b5e9)",
    live: r.status === "active",
    locked: false,
    created: false,
    createdAt: r.createdAt ? r.createdAt.toISOString() : new Date().toISOString(),
  };
}

// ─── Helper: find a room (memory first, then DB) ─────────────────────

async function findRoom(roomId: string): Promise<VoiceRoomData | null> {
  const mem = memoryRooms.get(roomId);
  if (mem) return mem;

  try {
    const [r] = await db.select().from(voiceRoomsTable).where(eq(voiceRoomsTable.id, roomId));
    if (r) return dbRoomToData(r);
  } catch {
    // DB offline
  }

  return null;
}

// ─── Helper: check if a userId is the host of a room ─────────────────

function isHost(room: VoiceRoomData, userId: string): boolean {
  return room.hostId === userId;
}

// ─── 1. List all public active rooms ─────────────────────────────────

router.get("/voicerooms", async (_req, res) => {
  try {
    try {
      const dbRooms = await db.select().from(voiceRoomsTable).orderBy(desc(voiceRoomsTable.createdAt));
      if (dbRooms.length > 0) {
        const rooms = dbRooms.map(dbRoomToData);
        res.json({ success: true, rooms });
        return;
      }
    } catch {
      // DB offline, fall back to memory
    }

    // Return only public rooms from memory
    const publicRooms = Array.from(memoryRooms.values()).filter((r) => r.access === "Public" && r.live);
    res.json({ success: true, rooms: publicRooms });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ success: false, error: message });
  }
});

// ─── 2. Get single room details ──────────────────────────────────────

router.get("/voicerooms/:id", async (req, res) => {
  try {
    const roomId = req.params["id"]!;
    const room = await findRoom(roomId);
    if (!room) {
      res.status(404).json({ success: false, error: "Room not found" });
      return;
    }

    // Attach participant list
    const participants = memoryParticipants.get(roomId) || [];
    res.json({ success: true, room, participants });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ success: false, error: message });
  }
});

// ─── 3. Create a new room ────────────────────────────────────────────

router.post("/voicerooms", async (req, res) => {
  try {
    const {
      id: providedId,
      name,
      title,
      description = "",
      category = "Language Practice",
      capacity = 8,
      access = "Public",
      approval = false,
      allowMembers = true,
      host = "You",
      hostId: providedHostId,
      initials = "YO",
      color = "linear-gradient(135deg,#8b82ff,#56b5e9)",
    } = req.body;

    const roomName = (name || title || "").trim();
    if (!roomName || roomName.length < 3) {
      res.status(400).json({ success: false, error: "Room name must be at least 3 characters." });
      return;
    }
    if (typeof capacity !== "undefined" && (Number(capacity) < 2 || Number(capacity) > 100)) {
      res.status(400).json({ success: false, error: "Capacity must be between 2 and 100." });
      return;
    }

    const roomId = providedId || `room-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const hostId = providedHostId || `user-${Date.now()}`;
    const newRoom: VoiceRoomData = {
      id: roomId,
      name: roomName,
      category,
      host,
      hostId,
      initials,
      count: 1,
      capacity: Number(capacity) || 8,
      access: access === "Private" ? "Private" : "Public",
      approval: Boolean(approval),
      allowMembers: Boolean(allowMembers),
      description: description.trim(),
      color,
      live: true,
      locked: false,
      created: true,
      createdAt: new Date().toISOString(),
    };

    memoryRooms.set(roomId, newRoom);

    // Add host as first participant
    const hostParticipant: MemoryParticipant = {
      id: `p-${Date.now()}`,
      roomId,
      userId: hostId,
      userName: host,
      role: "host",
      isMuted: false,
      joinedAt: new Date().toISOString(),
    };
    memoryParticipants.set(roomId, [hostParticipant]);

    // Also attempt PostgreSQL save
    try {
      await db.insert(voiceRoomsTable).values({
        id: roomId,
        title: roomName,
        description: newRoom.description,
        category: newRoom.category,
        hostId,
        hostName: host,
        isPrivate: access === "Private",
        requireApproval: Boolean(approval),
        maxParticipants: Number(capacity) || 8,
        status: "active",
      });
    } catch {
      // Ignored if DB is offline
    }

    // Broadcast new room event
    try {
      getIO().emit("roomCreated", { room: newRoom });
    } catch {
      // Socket.IO not ready yet
    }

    res.status(201).json({ success: true, room: newRoom });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ success: false, error: message });
  }
});

// ─── 4. Generate LiveKit access token ────────────────────────────────

router.post("/voicerooms/:id/token", async (req, res) => {
  try {
    const roomId = req.params["id"]!;
    const { userId = `guest-${Date.now()}`, userName = "Student", role = "listener" } = req.body;

    const room = await findRoom(roomId);
    if (!room) {
      res.status(404).json({ success: false, error: "Room not found" });
      return;
    }

    const apiKey = process.env["LIVEKIT_API_KEY"];
    const apiSecret = process.env["LIVEKIT_API_SECRET"];
    const livekitUrl = process.env["LIVEKIT_URL"];

    if (apiKey && apiSecret && livekitUrl) {
      const at = new AccessToken(apiKey, apiSecret, {
        identity: userId,
        name: userName,
        ttl: "3h",
      });

      at.addGrant({
        roomJoin: true,
        room: roomId,
        canPublish: role !== "listener",
        canPublishData: true,
        canSubscribe: true,
      });

      const token = await at.toJwt();
      res.json({ success: true, token, livekitUrl, isConfigured: true });
      return;
    }

    // Development fallback token
    const fallbackKey = "devkey";
    const fallbackSecret = "secret_key_12345678901234567890123456789012";
    const at = new AccessToken(fallbackKey, fallbackSecret, {
      identity: userId,
      name: userName,
      ttl: "3h",
    });
    at.addGrant({
      roomJoin: true,
      room: roomId,
      canPublish: true,
      canPublishData: true,
      canSubscribe: true,
    });
    const devToken = await at.toJwt();

    res.json({
      success: true,
      token: devToken,
      livekitUrl: livekitUrl || "",
      isConfigured: false,
      message: "WebRTC audio engine ready.",
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ success: false, error: message });
  }
});

// ─── 5. Join a room ──────────────────────────────────────────────────

router.post("/voicerooms/:id/join", async (req, res) => {
  try {
    const roomId = req.params["id"]!;
    const { userId, userName = "Anonymous", role = "listener" } = req.body;

    if (!userId) {
      res.status(400).json({ success: false, error: "userId is required" });
      return;
    }

    const room = await findRoom(roomId);
    if (!room) {
      res.status(404).json({ success: false, error: "Room not found" });
      return;
    }
    if (!room.live) {
      res.status(410).json({ success: false, error: "Room has been closed" });
      return;
    }
    if (room.locked) {
      res.status(403).json({ success: false, error: "Room is locked" });
      return;
    }

    const participants = memoryParticipants.get(roomId) || [];

    // Check capacity
    if (participants.length >= room.capacity) {
      res.status(403).json({ success: false, error: "Room is full" });
      return;
    }

    // Check if already joined
    const existing = participants.find((p) => p.userId === userId);
    if (existing) {
      res.json({ success: true, participant: existing, message: "Already in room" });
      return;
    }

    const participant: MemoryParticipant = {
      id: `p-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      roomId,
      userId,
      userName,
      role: role as "host" | "speaker" | "listener",
      isMuted: false,
      joinedAt: new Date().toISOString(),
    };

    participants.push(participant);
    memoryParticipants.set(roomId, participants);

    // Update room count
    room.count = participants.length;

    // Also attempt DB save
    try {
      await db.insert(voiceRoomParticipantsTable).values({
        roomId,
        userId,
        userName,
        role: role as string,
        isMuted: false,
        isHandRaised: false,
      });
    } catch {
      // DB offline
    }

    // Broadcast via Socket.IO
    try {
      getIO().to(`room:${roomId}`).emit("participantJoined", {
        roomId,
        participant,
        participantCount: participants.length,
      });
    } catch {
      // Socket.IO not ready
    }

    res.json({ success: true, participant });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ success: false, error: message });
  }
});

// ─── 6. Leave a room ─────────────────────────────────────────────────

router.post("/voicerooms/:id/leave", async (req, res) => {
  try {
    const roomId = req.params["id"]!;
    const { userId } = req.body;

    if (!userId) {
      res.status(400).json({ success: false, error: "userId is required" });
      return;
    }

    const participants = memoryParticipants.get(roomId) || [];
    const idx = participants.findIndex((p) => p.userId === userId);
    if (idx === -1) {
      res.status(404).json({ success: false, error: "Participant not found in room" });
      return;
    }

    const [removed] = participants.splice(idx, 1);
    memoryParticipants.set(roomId, participants);

    // Update room count
    const room = memoryRooms.get(roomId);
    if (room) {
      room.count = participants.length;
    }

    // Also attempt DB removal
    try {
      await db
        .delete(voiceRoomParticipantsTable)
        .where(
          and(
            eq(voiceRoomParticipantsTable.roomId, roomId),
            eq(voiceRoomParticipantsTable.userId, userId),
          ),
        );
    } catch {
      // DB offline
    }

    // Broadcast via Socket.IO
    try {
      getIO().to(`room:${roomId}`).emit("participantLeft", {
        roomId,
        userId,
        userName: removed!.userName,
        participantCount: participants.length,
      });
    } catch {
      // Socket.IO not ready
    }

    res.json({ success: true, message: "Left the room" });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ success: false, error: message });
  }
});

// ─── 7. Get recent chat messages (last 50) ───────────────────────────

router.get("/voicerooms/:id/chat", async (req, res) => {
  try {
    const roomId = req.params["id"]!;

    const room = await findRoom(roomId);
    if (!room) {
      res.status(404).json({ success: false, error: "Room not found" });
      return;
    }

    // Try DB first
    try {
      const dbMessages = await db
        .select()
        .from(voiceRoomChatMessagesTable)
        .where(eq(voiceRoomChatMessagesTable.roomId, roomId))
        .orderBy(desc(voiceRoomChatMessagesTable.createdAt))
        .limit(50);

      if (dbMessages.length > 0) {
        const messages = dbMessages.reverse().map((m) => ({
          id: String(m.id),
          roomId: m.roomId,
          userId: m.userId,
          userName: m.userName,
          content: m.content,
          createdAt: m.createdAt.toISOString(),
        }));
        res.json({ success: true, messages });
        return;
      }
    } catch {
      // DB offline
    }

    // Fall back to memory
    const messages = (memoryChatMessages.get(roomId) || []).slice(-50);
    res.json({ success: true, messages });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ success: false, error: message });
  }
});

// ─── 8. Send a chat message ──────────────────────────────────────────

router.post("/voicerooms/:id/chat", async (req, res) => {
  try {
    const roomId = req.params["id"]!;
    const { userId, userName = "Anonymous", content } = req.body;

    if (!userId) {
      res.status(400).json({ success: false, error: "userId is required" });
      return;
    }
    if (!content || typeof content !== "string" || content.trim().length === 0) {
      res.status(400).json({ success: false, error: "Message content is required" });
      return;
    }
    if (content.length > 1000) {
      res.status(400).json({ success: false, error: "Message too long (max 1000 chars)" });
      return;
    }

    const room = await findRoom(roomId);
    if (!room) {
      res.status(404).json({ success: false, error: "Room not found" });
      return;
    }

    // Rate limit: max 1 message per second per user
    const now = Date.now();
    const lastSent = chatRateLimit.get(userId) || 0;
    if (now - lastSent < 1000) {
      res.status(429).json({ success: false, error: "Please wait before sending another message" });
      return;
    }
    chatRateLimit.set(userId, now);

    const chatMsg: ChatMessage = {
      id: `msg-${now}-${Math.random().toString(36).substring(2, 6)}`,
      roomId,
      userId,
      userName,
      content: content.trim(),
      createdAt: new Date().toISOString(),
    };

    // Store in memory (capped)
    const roomMessages = memoryChatMessages.get(roomId) || [];
    roomMessages.push(chatMsg);
    if (roomMessages.length > MAX_CHAT_MESSAGES) {
      roomMessages.splice(0, roomMessages.length - MAX_CHAT_MESSAGES);
    }
    memoryChatMessages.set(roomId, roomMessages);

    // Also attempt DB save
    try {
      await db.insert(voiceRoomChatMessagesTable).values({
        roomId,
        userId,
        userName,
        content: chatMsg.content,
      });
    } catch {
      // DB offline
    }

    // Broadcast via Socket.IO
    try {
      getIO().to(`room:${roomId}`).emit("chatMessage", chatMsg);
    } catch {
      // Socket.IO not ready
    }

    res.status(201).json({ success: true, message: chatMsg });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ success: false, error: message });
  }
});

// ─── 9. Generate signed invitation token ─────────────────────────────

router.post("/voicerooms/:id/invite", async (req, res) => {
  try {
    const roomId = req.params["id"]!;
    const { userId, userName = "Inviter" } = req.body;

    if (!userId) {
      res.status(400).json({ success: false, error: "userId is required" });
      return;
    }

    const room = await findRoom(roomId);
    if (!room) {
      res.status(404).json({ success: false, error: "Room not found" });
      return;
    }

    // Sign a JWT invitation token valid for 24 hours
    const token = await new SignJWT({
      roomId,
      invitedBy: userId,
      inviterName: userName,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("24h")
      .setSubject("voice-room-invite")
      .sign(JWT_SECRET);

    res.json({ success: true, inviteToken: token, expiresIn: "24h" });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ success: false, error: message });
  }
});

// ─── 10. Kick participant (host only) ────────────────────────────────

router.post("/voicerooms/:id/kick/:participantId", async (req, res) => {
  try {
    const roomId = req.params["id"]!;
    const participantId = req.params["participantId"]!;
    const { userId } = req.body; // requestor userId

    if (!userId) {
      res.status(400).json({ success: false, error: "userId is required" });
      return;
    }

    const room = await findRoom(roomId);
    if (!room) {
      res.status(404).json({ success: false, error: "Room not found" });
      return;
    }
    if (!isHost(room, userId)) {
      res.status(403).json({ success: false, error: "Only the host can kick participants" });
      return;
    }

    const participants = memoryParticipants.get(roomId) || [];
    const idx = participants.findIndex((p) => p.userId === participantId);
    if (idx === -1) {
      res.status(404).json({ success: false, error: "Participant not found" });
      return;
    }

    // Cannot kick yourself
    if (participants[idx]!.userId === userId) {
      res.status(400).json({ success: false, error: "Cannot kick yourself" });
      return;
    }

    const [kicked] = participants.splice(idx, 1);
    memoryParticipants.set(roomId, participants);
    room.count = participants.length;

    // DB cleanup
    try {
      await db
        .delete(voiceRoomParticipantsTable)
        .where(
          and(
            eq(voiceRoomParticipantsTable.roomId, roomId),
            eq(voiceRoomParticipantsTable.userId, participantId),
          ),
        );
    } catch {
      // DB offline
    }

    // Broadcast kick event
    try {
      getIO().to(`room:${roomId}`).emit("participantKicked", {
        roomId,
        userId: participantId,
        userName: kicked!.userName,
        participantCount: participants.length,
      });
    } catch {
      // Socket.IO not ready
    }

    res.json({ success: true, message: `Kicked ${kicked!.userName}` });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ success: false, error: message });
  }
});

// ─── 11. Mute participant (host only) ────────────────────────────────

router.post("/voicerooms/:id/mute/:participantId", async (req, res) => {
  try {
    const roomId = req.params["id"]!;
    const participantId = req.params["participantId"]!;
    const { userId, muted = true } = req.body;

    if (!userId) {
      res.status(400).json({ success: false, error: "userId is required" });
      return;
    }

    const room = await findRoom(roomId);
    if (!room) {
      res.status(404).json({ success: false, error: "Room not found" });
      return;
    }
    if (!isHost(room, userId)) {
      res.status(403).json({ success: false, error: "Only the host can mute participants" });
      return;
    }

    const participants = memoryParticipants.get(roomId) || [];
    const participant = participants.find((p) => p.userId === participantId);
    if (!participant) {
      res.status(404).json({ success: false, error: "Participant not found" });
      return;
    }

    participant.isMuted = Boolean(muted);

    // DB update
    try {
      await db
        .update(voiceRoomParticipantsTable)
        .set({ isMuted: Boolean(muted) })
        .where(
          and(
            eq(voiceRoomParticipantsTable.roomId, roomId),
            eq(voiceRoomParticipantsTable.userId, participantId),
          ),
        );
    } catch {
      // DB offline
    }

    // Broadcast mute event
    try {
      getIO().to(`room:${roomId}`).emit("participantMuted", {
        roomId,
        userId: participantId,
        userName: participant.userName,
        isMuted: participant.isMuted,
      });
    } catch {
      // Socket.IO not ready
    }

    res.json({ success: true, message: `${participant.userName} ${muted ? "muted" : "unmuted"}` });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ success: false, error: message });
  }
});

// ─── 12. Lock / unlock room (host only) ──────────────────────────────

router.post("/voicerooms/:id/lock", async (req, res) => {
  try {
    const roomId = req.params["id"]!;
    const { userId, locked = true } = req.body;

    if (!userId) {
      res.status(400).json({ success: false, error: "userId is required" });
      return;
    }

    const room = await findRoom(roomId);
    if (!room) {
      res.status(404).json({ success: false, error: "Room not found" });
      return;
    }
    if (!isHost(room, userId)) {
      res.status(403).json({ success: false, error: "Only the host can lock/unlock the room" });
      return;
    }

    room.locked = Boolean(locked);

    // Broadcast lock status
    try {
      getIO().to(`room:${roomId}`).emit("roomLocked", {
        roomId,
        locked: room.locked,
      });
    } catch {
      // Socket.IO not ready
    }

    res.json({ success: true, locked: room.locked });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ success: false, error: message });
  }
});

// ─── 13. Close room (host only) ──────────────────────────────────────

router.post("/voicerooms/:id/close", async (req, res) => {
  try {
    const roomId = req.params["id"]!;
    const { userId } = req.body;

    if (!userId) {
      res.status(400).json({ success: false, error: "userId is required" });
      return;
    }

    const room = await findRoom(roomId);
    if (!room) {
      res.status(404).json({ success: false, error: "Room not found" });
      return;
    }
    if (!isHost(room, userId)) {
      res.status(403).json({ success: false, error: "Only the host can close the room" });
      return;
    }

    room.live = false;
    room.locked = true;

    // Clear participants
    memoryParticipants.delete(roomId);
    memoryChatMessages.delete(roomId);

    // DB update
    try {
      await db
        .update(voiceRoomsTable)
        .set({ status: "closed" })
        .where(eq(voiceRoomsTable.id, roomId));
      await db
        .delete(voiceRoomParticipantsTable)
        .where(eq(voiceRoomParticipantsTable.roomId, roomId));
    } catch {
      // DB offline
    }

    // Broadcast close event
    try {
      getIO().to(`room:${roomId}`).emit("roomClosed", { roomId });
      getIO().emit("roomUpdated", { roomId, live: false });
    } catch {
      // Socket.IO not ready
    }

    res.json({ success: true, message: "Room closed" });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ success: false, error: message });
  }
});

export default router;
