import { Router, type IRouter } from "express";
import { AccessToken } from "livekit-server-sdk";
import { db, voiceRoomsTable, voiceRoomParticipantsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";

const router: IRouter = Router();

export interface VoiceRoomData {
  id: string;
  name: string;
  category: string;
  host: string;
  initials: string;
  count: number;
  capacity: number;
  access: "Public" | "Private";
  approval: boolean;
  allowMembers: boolean;
  description: string;
  color: string;
  live: boolean;
  created?: boolean;
  createdAt: string;
}

const memoryRooms: Map<string, VoiceRoomData> = new Map([
  [
    "demo-english",
    {
      id: "demo-english",
      name: "English Speaking Circle",
      category: "Language Practice",
      host: "Aarav Sharma",
      initials: "AS",
      count: 6,
      capacity: 12,
      access: "Public",
      approval: false,
      allowMembers: true,
      description: "Build confidence, practice daily English, and make new friends.",
      color: "linear-gradient(135deg,#e6a7ff,#6d86ff)",
      live: true,
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
      initials: "PV",
      count: 4,
      capacity: 8,
      access: "Public",
      approval: true,
      allowMembers: true,
      description: "Quiet accountability, study goals, and a little motivation.",
      color: "linear-gradient(135deg,#f9c47b,#e87b9c)",
      live: true,
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
      initials: "KS",
      count: 9,
      capacity: 12,
      access: "Public",
      approval: false,
      allowMembers: true,
      description: "Relaxed conversations, new perspectives, good company.",
      color: "linear-gradient(135deg,#77d6ca,#5c8cff)",
      live: true,
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
      initials: "RM",
      count: 3,
      capacity: 8,
      access: "Public",
      approval: false,
      allowMembers: true,
      description: "Talk strategies, share your favourite games, find teammates.",
      color: "linear-gradient(135deg,#ff9b70,#a66bff)",
      live: true,
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
      initials: "AR",
      count: 5,
      capacity: 12,
      access: "Public",
      approval: false,
      allowMembers: true,
      description: "What are you watching or listening to this week?",
      color: "linear-gradient(135deg,#ff9fca,#8872ff)",
      live: true,
      createdAt: new Date().toISOString(),
    },
  ],
]);

// 1. List all active VoiceRooms
router.get("/voicerooms", async (_req, res) => {
  try {
    try {
      const dbRooms = await db.select().from(voiceRoomsTable).orderBy(desc(voiceRoomsTable.createdAt));
      if (dbRooms.length > 0) {
        const rooms = dbRooms.map((r) => ({
          id: r.id,
          name: r.title,
          category: r.category,
          host: r.hostName,
          initials: r.hostName.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase() || "VR",
          count: 1,
          capacity: r.maxParticipants || 12,
          access: (r.isPrivate ? "Private" : "Public") as "Public" | "Private",
          approval: r.requireApproval || false,
          allowMembers: true,
          description: r.description || "Come in and join the conversation.",
          color: "linear-gradient(135deg,#8b82ff,#56b5e9)",
          live: true,
          created: false,
          createdAt: r.createdAt ? r.createdAt.toISOString() : new Date().toISOString(),
        }));
        res.json({ success: true, rooms });
        return;
      }
    } catch {
      // DB offline, fall back to memory
    }

    res.json({ success: true, rooms: Array.from(memoryRooms.values()) });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 2. Get single VoiceRoom by ID
router.get("/voicerooms/:id", async (req, res) => {
  const roomId = req.params.id;
  try {
    const memRoom = memoryRooms.get(roomId);
    if (memRoom) {
      res.json({ success: true, room: memRoom });
      return;
    }

    try {
      const [r] = await db.select().from(voiceRoomsTable).where(eq(voiceRoomsTable.id, roomId));
      if (r) {
        res.json({
          success: true,
          room: {
            id: r.id,
            name: r.title,
            category: r.category,
            host: r.hostName,
            initials: r.hostName.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase() || "VR",
            count: 1,
            capacity: r.maxParticipants || 12,
            access: (r.isPrivate ? "Private" : "Public") as "Public" | "Private",
            approval: r.requireApproval || false,
            allowMembers: true,
            description: r.description || "Come in and join the conversation.",
            color: "linear-gradient(135deg,#8b82ff,#56b5e9)",
            live: true,
            created: false,
            createdAt: r.createdAt ? r.createdAt.toISOString() : new Date().toISOString(),
          },
        });
        return;
      }
    } catch {
      // Ignored
    }

    res.status(404).json({ success: false, error: "Room not found" });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 3. Create a new VoiceRoom
router.post("/voicerooms", async (req, res) => {
  try {
    const {
      name,
      title,
      description = "",
      category = "Language Practice",
      capacity = 8,
      access = "Public",
      approval = false,
      allowMembers = true,
      host = "You",
      initials = "YO",
      color = "linear-gradient(135deg,#8b82ff,#56b5e9)",
    } = req.body;

    const roomName = (name || title || "").trim();
    if (!roomName || roomName.length < 3) {
      res.status(400).json({ success: false, error: "Room name must be at least 3 characters." });
      return;
    }

    const roomId = `room-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const newRoom: VoiceRoomData = {
      id: roomId,
      name: roomName,
      category,
      host,
      initials,
      count: 1,
      capacity: Number(capacity) || 8,
      access: access === "Private" ? "Private" : "Public",
      approval: Boolean(approval),
      allowMembers: Boolean(allowMembers),
      description: description.trim(),
      color,
      live: true,
      created: true,
      createdAt: new Date().toISOString(),
    };

    memoryRooms.set(roomId, newRoom);

    // Also attempt PostgreSQL save
    try {
      await db.insert(voiceRoomsTable).values({
        id: roomId,
        title: roomName,
        description: newRoom.description,
        category: newRoom.category,
        hostId: `user-${Date.now()}`,
        hostName: host,
        isPrivate: access === "Private",
        requireApproval: Boolean(approval),
        maxParticipants: Number(capacity) || 8,
        status: "active",
      });
    } catch {
      // Ignored if DB is offline
    }

    res.status(201).json({ success: true, room: newRoom });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 4. Generate LiveKit WebRTC Access Token
router.post("/voicerooms/:id/token", async (req, res) => {
  try {
    const roomId = req.params.id;
    const { userId = `guest-${Date.now()}`, userName = "Student", role = "listener" } = req.body;

    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;
    const livekitUrl = process.env.LIVEKIT_URL;

    if (apiKey && apiSecret && livekitUrl) {
      const at = new AccessToken(apiKey, apiSecret, {
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

      const token = await at.toJwt();
      res.json({
        success: true,
        token,
        livekitUrl,
        isConfigured: true,
      });
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
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
