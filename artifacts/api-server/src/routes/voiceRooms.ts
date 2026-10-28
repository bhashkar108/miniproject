import { Router, type IRouter } from "express";
import { AccessToken } from "livekit-server-sdk";
import { db, voiceRoomsTable, voiceRoomParticipantsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";

const router: IRouter = Router();

// Fallback in-memory storage if PostgreSQL is not active
interface InMemSpeaker {
  id: string;
  name: string;
  avatar: string;
  flag: string;
  isHost?: boolean;
  isSpeaking?: boolean;
  isMuted?: boolean;
  level?: string;
  role?: "host" | "speaker" | "listener";
  seatIndex?: number | null;
}

interface InMemRoom {
  id: string;
  title: string;
  description?: string;
  category: string;
  badge?: string;
  hourlyRank?: string;
  hostId: string;
  hostName: string;
  hostAvatar: string;
  hostFlag: string;
  listenerCount: number;
  speakers: InMemSpeaker[];
  tags: string[];
  pinnedMessage?: string;
  createdAt: string;
}

const memoryRooms: Map<string, InMemRoom> = new Map([
  [
    "room-1",
    {
      id: "room-1",
      title: "English Fluency & Daily Chit-Chat 🌟",
      description: "Friendly stage open for everyone who wants to build English confidence.",
      category: "English",
      badge: "EN",
      hourlyRank: "Hourly No. 1 🔥",
      hostId: "host-1",
      hostName: "MH SA",
      hostAvatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
      hostFlag: "🇰🇷",
      listenerCount: 42,
      tags: ["#English Learning", "#Global Lounge", "#Fluency Practice"],
      pinnedMessage: "If you speak English or want to practice, you can come up on stage! Everyone is welcome.",
      createdAt: new Date().toISOString(),
      speakers: [
        { id: "s1", name: "MH SA", avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80", flag: "🇰🇷", isHost: true, isSpeaking: false, isMuted: false, level: "Lv.15", seatIndex: 0, role: "host" },
        { id: "s2", name: "Cephas 石谦", avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80", flag: "🇺🇸", isSpeaking: false, isMuted: true, level: "Lv.12", seatIndex: 1, role: "speaker" },
        { id: "s3", name: "Tayla", avatar: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80", flag: "🇬🇧", isSpeaking: false, isMuted: false, level: "Lv.10", seatIndex: 2, role: "speaker" },
        { id: "s4", name: "WW", avatar: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80", flag: "🇺🇸", isSpeaking: true, isMuted: false, level: "Lv.16", seatIndex: 3, role: "speaker" }
      ]
    }
  ],
  [
    "room-2",
    {
      id: "room-2",
      title: "Help Me Translate · Hindi & English Exchange 🇮🇳",
      description: "Bilingual room for students practicing Hindi to English translation.",
      category: "Hindi",
      badge: "HI-EN",
      hourlyRank: "Trending ⚡",
      hostId: "host-2",
      hostName: "Rohan Verma",
      hostAvatar: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80",
      hostFlag: "🇮🇳",
      listenerCount: 28,
      tags: ["#Help me translate", "#Hindi-English", "#Speaking Practice"],
      pinnedMessage: "Practice speaking English and Hindi freely without fear of making mistakes!",
      createdAt: new Date().toISOString(),
      speakers: [
        { id: "s5", name: "Rohan Verma", avatar: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80", flag: "🇮🇳", isHost: true, isSpeaking: false, isMuted: false, level: "Lv.11", seatIndex: 0, role: "host" },
        { id: "s6", name: "Sarah B.", avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80", flag: "🇺🇸", isSpeaking: false, isMuted: false, level: "Lv.14", seatIndex: 1, role: "speaker" }
      ]
    }
  ],
  [
    "room-3",
    {
      id: "room-3",
      title: "Daily Confidence Lab & Job Interview Prep 💼",
      description: "Mock questions, self-introduction, and constructive accent feedback.",
      category: "English",
      badge: "EN",
      hourlyRank: "Popular ⭐",
      hostId: "host-3",
      hostName: "Anthony 安瀚辰",
      hostAvatar: "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=150&auto=format&fit=crop&q=80",
      hostFlag: "🇺🇸",
      listenerCount: 35,
      tags: ["#English Learning", "#Job Prep", "#Confidence"],
      pinnedMessage: "Welcome! Today we practice: 'Tell me about yourself' and college viva topics.",
      createdAt: new Date().toISOString(),
      speakers: [
        { id: "s7", name: "Anthony 安瀚辰", avatar: "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=150&auto=format&fit=crop&q=80", flag: "🇺🇸", isHost: true, isSpeaking: true, isMuted: false, level: "Lv.14", seatIndex: 0, role: "host" },
        { id: "s8", name: "Priya S.", avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80", flag: "🇮🇳", isSpeaking: false, isMuted: true, level: "Lv.9", seatIndex: 1, role: "speaker" }
      ]
    }
  ]
]);

// 1. List all active VoiceRooms
router.get("/voicerooms", async (_req, res) => {
  try {
    try {
      const dbRooms = await db.select().from(voiceRoomsTable).orderBy(desc(voiceRoomsTable.createdAt));
      if (dbRooms.length > 0) {
        // Merge with participants
        const roomsWithParticipants = await Promise.all(
          dbRooms.map(async (r) => {
            const participants = await db
              .select()
              .from(voiceRoomParticipantsTable)
              .where(eq(voiceRoomParticipantsTable.roomId, r.id));

            const speakers = participants
              .filter((p) => p.seatIndex !== null)
              .map((p) => ({
                id: p.userId,
                name: p.userName,
                avatar: p.userAvatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80",
                flag: p.userFlag || "🇮🇳",
                isHost: p.role === "host",
                isSpeaking: false,
                isMuted: p.isMuted,
                level: "Lv.10",
                seatIndex: p.seatIndex,
                role: p.role as "host" | "speaker" | "listener"
              }));

            return {
              id: r.id,
              title: r.title,
              description: r.description || "",
              category: r.category,
              badge: r.category === "Hindi" ? "HI-EN" : "EN",
              hourlyRank: "Active ⭐",
              hostId: r.hostId,
              hostName: r.hostName,
              hostAvatar: r.hostAvatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80",
              hostFlag: r.hostFlag || "🇮🇳",
              listenerCount: Math.max(1, participants.length),
              speakers,
              tags: (r.tags as string[]) || ["#English Practice"],
              pinnedMessage: r.pinnedMessage || `Welcome to ${r.title}!`
            };
          })
        );
        res.json({ success: true, rooms: roomsWithParticipants });
        return;
      }
    } catch {
      // DB offline or table not migrated, safely continue with in-memory store
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
    try {
      const [r] = await db.select().from(voiceRoomsTable).where(eq(voiceRoomsTable.id, roomId));
      if (r) {
        const participants = await db
          .select()
          .from(voiceRoomParticipantsTable)
          .where(eq(voiceRoomParticipantsTable.roomId, r.id));

        const speakers = participants
          .filter((p) => p.seatIndex !== null)
          .map((p) => ({
            id: p.userId,
            name: p.userName,
            avatar: p.userAvatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80",
            flag: p.userFlag || "🇮🇳",
            isHost: p.role === "host",
            isSpeaking: false,
            isMuted: p.isMuted,
            level: "Lv.10",
            seatIndex: p.seatIndex,
            role: p.role as "host" | "speaker" | "listener"
          }));

        res.json({
          success: true,
          room: {
            id: r.id,
            title: r.title,
            description: r.description || "",
            category: r.category,
            badge: r.category === "Hindi" ? "HI-EN" : "EN",
            hourlyRank: "Active ⭐",
            hostId: r.hostId,
            hostName: r.hostName,
            hostAvatar: r.hostAvatar,
            hostFlag: r.hostFlag,
            listenerCount: Math.max(1, participants.length),
            speakers,
            tags: (r.tags as string[]) || ["#English Practice"],
            pinnedMessage: r.pinnedMessage || `Welcome to ${r.title}!`
          }
        });
        return;
      }
    } catch {
      // Fallback to memory
    }

    const memRoom = memoryRooms.get(roomId);
    if (!memRoom) {
      res.status(404).json({ success: false, error: "Room not found" });
      return;
    }
    res.json({ success: true, room: memRoom });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 3. Create a new VoiceRoom
router.post("/voicerooms", async (req, res) => {
  try {
    const {
      title,
      description,
      category = "English",
      tags = ["#English Practice"],
      hostId = `user-${Date.now()}`,
      hostName = "Student Host",
      hostAvatar,
      hostFlag = "🇮🇳",
      pinnedMessage,
    } = req.body;

    if (!title || typeof title !== "string") {
      res.status(400).json({ success: false, error: "Room title is required" });
      return;
    }

    const roomId = `room-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const newRoom: InMemRoom = {
      id: roomId,
      title: title.trim(),
      description: description || `Friendly ${category} speaking session`,
      category,
      badge: category === "Hindi" ? "HI-EN" : "EN",
      hourlyRank: "New Stage ⭐",
      hostId,
      hostName,
      hostAvatar: hostAvatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80",
      hostFlag,
      listenerCount: 1,
      tags: Array.isArray(tags) ? tags : [tags],
      pinnedMessage: pinnedMessage || `Welcome to ${title.trim()}! Join stage to practice together.`,
      createdAt: new Date().toISOString(),
      speakers: [
        {
          id: hostId,
          name: hostName,
          avatar: hostAvatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80",
          flag: hostFlag,
          isHost: true,
          isSpeaking: false,
          isMuted: false,
          level: "Lv.12",
          seatIndex: 0,
          role: "host"
        }
      ]
    };

    // Store in memory
    memoryRooms.set(roomId, newRoom);

    // Also attempt PostgreSQL save
    try {
      await db.insert(voiceRoomsTable).values({
        id: roomId,
        title: newRoom.title,
        description: newRoom.description,
        category: newRoom.category,
        tags: newRoom.tags,
        hostId,
        hostName,
        hostAvatar: newRoom.hostAvatar,
        hostFlag: newRoom.hostFlag,
        pinnedMessage: newRoom.pinnedMessage,
      });

      await db.insert(voiceRoomParticipantsTable).values({
        roomId,
        userId: hostId,
        userName: hostName,
        userAvatar: newRoom.hostAvatar,
        userFlag: newRoom.hostFlag,
        role: "host",
        seatIndex: 0,
        isMuted: false,
      });
    } catch {
      // Ignored if DB is not configured
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

    // Check if LiveKit credentials are configured in environment
    if (apiKey && apiSecret && livekitUrl) {
      const at = new AccessToken(apiKey, apiSecret, {
        identity: userId,
        name: userName,
        ttl: "3h",
      });

      const canPublish = role === "host" || role === "speaker";
      at.addGrant({
        roomJoin: true,
        room: roomId,
        canPublish,
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

    // When LIVEKIT_URL is not provided, generate development fallback token
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
      message: "LiveKit cloud credentials not yet set in .env. Using client WebRTC fallback mode.",
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 5. Join VoiceRoom Participant
router.post("/voicerooms/:id/join", async (req, res) => {
  try {
    const roomId = req.params.id;
    const { userId, userName, userAvatar, userFlag = "🇮🇳", role = "listener", seatIndex = null } = req.body;

    if (!userId || !userName) {
      res.status(400).json({ success: false, error: "userId and userName are required" });
      return;
    }

    const room = memoryRooms.get(roomId);
    if (room) {
      room.listenerCount += 1;
      if (seatIndex !== null) {
        const existingIdx = room.speakers.findIndex((s) => s.id === userId);
        const speakerEntry: InMemSpeaker = {
          id: userId,
          name: userName,
          avatar: userAvatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80",
          flag: userFlag,
          isHost: role === "host",
          isSpeaking: false,
          isMuted: false,
          level: "Lv.10",
          seatIndex,
          role,
        };
        if (existingIdx >= 0) {
          room.speakers[existingIdx] = speakerEntry;
        } else {
          room.speakers.push(speakerEntry);
        }
      }
    }

    try {
      await db.insert(voiceRoomParticipantsTable).values({
        roomId,
        userId,
        userName,
        userAvatar,
        userFlag,
        role,
        seatIndex,
        isMuted: false,
      });
    } catch {
      // Ignored if DB offline
    }

    res.json({ success: true, message: "Joined voice room successfully" });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 6. Update Seat or Role (take stage, mute, step down)
router.post("/voicerooms/:id/seat", async (req, res) => {
  try {
    const roomId = req.params.id;
    const { userId, seatIndex, isMuted } = req.body;

    const room = memoryRooms.get(roomId);
    if (room) {
      if (seatIndex === null) {
        // Step down from stage
        room.speakers = room.speakers.filter((s) => s.id !== userId);
      } else {
        const existing = room.speakers.find((s) => s.id === userId);
        if (existing) {
          existing.seatIndex = seatIndex;
          if (typeof isMuted === "boolean") existing.isMuted = isMuted;
        }
      }
    }

    res.json({ success: true, message: "Seat updated" });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
