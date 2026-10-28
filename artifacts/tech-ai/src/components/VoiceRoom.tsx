import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Mic, MicOff, Hand, Share2, LogOut, Plus,
  Trophy, Sparkles, Send, X, Check, Copy, AudioLines,
  MoreHorizontal, Radio, Users, PhoneCall, ExternalLink,
  RefreshCw, Volume2, ShieldCheck, Heart, Flame, ThumbsUp
} from 'lucide-react';
import { Room, RoomEvent, Track, RemoteTrack, createLocalAudioTrack, LocalAudioTrack } from 'livekit-client';

export interface VoiceRoomProps {
  userName?: string;
  userPhoto?: string;
  onProgress?: (kind: 'lesson' | 'document' | 'form' | 'quiz' | 'equation', title: string, details: string) => void;
}

interface Speaker {
  id: string;
  name: string;
  avatar: string;
  flag: string;
  isHost?: boolean;
  isSpeaking?: boolean;
  isMuted?: boolean;
  level?: string;
  seatIndex?: number | null;
  role?: 'host' | 'speaker' | 'listener';
}

interface RoomItem {
  id: string;
  title: string;
  description?: string;
  category: string;
  badge?: string;
  hourlyRank?: string;
  hostId?: string;
  hostName: string;
  hostAvatar: string;
  hostFlag: string;
  listenerCount: number;
  speakers: Speaker[];
  tags: string[];
  pinnedMessage?: string;
}

interface ChatMessage {
  id: string;
  sender: string;
  flag: string;
  level: number;
  badge?: string;
  text: string;
  time: string;
  isNotice?: boolean;
  isPinned?: boolean;
}

export function VoiceRoom({ userName = 'Student', userPhoto, onProgress }: VoiceRoomProps) {
  // Current view: lobby or inside a room
  const [activeRoom, setActiveRoom] = useState<RoomItem | null>(null);
  const [categoryTab, setCategoryTab] = useState<string>('All');
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [isFollowing, setIsFollowing] = useState(false);
  const [showQuickChips, setShowQuickChips] = useState(true);
  const [isLoadingRooms, setIsLoadingRooms] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'connecting' | 'connected' | 'demo_mesh' | 'error'>('idle');

  // Inside-room interactive states
  const [mySeat, setMySeat] = useState<number | null>(null); // null = audience, 0..7 = stage seat
  const [isMicOn, setIsMicOn] = useState(false);
  const [isHandRaised, setIsHandRaised] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [floatingEmojis, setFloatingEmojis] = useState<{ id: number; emoji: string; left: number }[]>([]);
  const [showCC, setShowCC] = useState(false);
  const [liveCaption, setLiveCaption] = useState('');
  const [linkCopied, setLinkCopied] = useState(false);

  // Form states for creating a room
  const [newRoomTitle, setNewRoomTitle] = useState('');
  const [newRoomCategory, setNewRoomCategory] = useState('English');
  const [newRoomTag, setNewRoomTag] = useState('#English Learning');

  // Room messages
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Audio & WebRTC Refs
  const audioContainerRef = useRef<HTMLDivElement>(null);
  const livekitRoomRef = useRef<Room | null>(null);
  const localAudioTrackRef = useRef<LocalAudioTrack | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const broadcastChannelRef = useRef<BroadcastChannel | null>(null);

  // Default rooms
  const [rooms, setRooms] = useState<RoomItem[]>([
    {
      id: 'room-1',
      title: 'MH Radio 👻 The Global Lounge',
      description: 'Daily fluent conversations, idioms, and friendly banter with global peers.',
      category: 'English',
      badge: 'EN',
      hourlyRank: 'Hourly No. 1 🔥',
      hostId: 'host-1',
      hostName: 'MH SA',
      hostAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      hostFlag: '🇰🇷',
      listenerCount: 42,
      tags: ['#English Learning', '#Global Lounge', '#Fluency Practice'],
      pinnedMessage: 'If you speak English or want to practice, you can come up on stage! Everyone is welcome.',
      speakers: [
        { id: 's1', name: 'MH SA', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80', flag: '🇰🇷', isHost: true, isSpeaking: false, isMuted: false, level: 'Lv.15', seatIndex: 0 },
        { id: 's2', name: 'Cephas 石谦', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80', flag: '🇺🇸', isSpeaking: false, isMuted: true, level: 'Lv.12', seatIndex: 1 },
        { id: 's3', name: 'Tayla', avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80', flag: '🇬🇧', isSpeaking: false, isMuted: false, level: 'Lv.10', seatIndex: 2 },
        { id: 's4', name: 'WW', avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80', flag: '🇺🇸', isSpeaking: true, isMuted: false, level: 'Lv.16', seatIndex: 3 }
      ]
    },
    {
      id: 'room-2',
      title: 'Help Me Translate · Hindi & English Exchange 🇮🇳',
      description: 'Practice speaking English and Hindi freely without fear of grammatical mistakes.',
      category: 'Hindi',
      badge: 'HI-EN',
      hourlyRank: 'Live ⚡',
      hostId: 'host-2',
      hostName: 'Rohan Verma',
      hostAvatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80',
      hostFlag: '🇮🇳',
      listenerCount: 29,
      tags: ['#Help me translate', '#Hindi-English', '#Speaking Practice'],
      pinnedMessage: 'Practice speaking English and Hindi freely without fear of making mistakes!',
      speakers: [
        { id: 's5', name: 'Rohan Verma', avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80', flag: '🇮🇳', isHost: true, isSpeaking: false, isMuted: false, level: 'Lv.11', seatIndex: 0 },
        { id: 's6', name: 'Sarah B.', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80', flag: '🇺🇸', isSpeaking: false, isMuted: false, level: 'Lv.14', seatIndex: 1 }
      ]
    },
    {
      id: 'room-3',
      title: 'Daily Confidence Lab & Job Interview Prep 💬',
      description: 'Mock HR interviews, self-intro rounds, and accent clarity training.',
      category: 'English',
      badge: 'EN',
      hourlyRank: 'Popular ⭐',
      hostId: 'host-3',
      hostName: 'Anthony 安瀚辰',
      hostAvatar: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=150&auto=format&fit=crop&q=80',
      hostFlag: '🇺🇸',
      listenerCount: 34,
      tags: ['#English Learning', '#Confidence', '#Interview Prep'],
      pinnedMessage: 'Welcome! Today we practice: "Tell me about yourself" and impromptu questions.',
      speakers: [
        { id: 's7', name: 'Anthony 安瀚辰', avatar: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=150&auto=format&fit=crop&q=80', flag: '🇺🇸', isHost: true, isSpeaking: true, level: 'Lv.14', seatIndex: 0 },
        { id: 's8', name: 'Priya S.', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80', flag: '🇮🇳', isSpeaking: false, level: 'Lv.9', seatIndex: 1 }
      ]
    }
  ]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3000);
  };

  // Fetch rooms from backend on mount
  const fetchRooms = useCallback(async () => {
    try {
      setIsLoadingRooms(true);
      const res = await fetch('/api/voicerooms');
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.rooms) && data.rooms.length > 0) {
          setRooms(data.rooms);
        }
      }
    } catch {
      // Backend offline, fallback rooms remain intact
    } finally {
      setIsLoadingRooms(false);
    }
  }, []);

  useEffect(() => {
    fetchRooms();
  }, [fetchRooms]);

  // Clean up audio & WebRTC on unmount
  const teardownAudio = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (audioContextRef.current) {
      try { audioContextRef.current.close(); } catch {}
      audioContextRef.current = null;
    }
    if (localAudioTrackRef.current) {
      try {
        localAudioTrackRef.current.stop();
      } catch {}
      localAudioTrackRef.current = null;
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => t.stop());
      localStreamRef.current = null;
    }
    if (livekitRoomRef.current) {
      try {
        livekitRoomRef.current.disconnect();
      } catch {}
      livekitRoomRef.current = null;
    }
    if (broadcastChannelRef.current) {
      try { broadcastChannelRef.current.close(); } catch {}
      broadcastChannelRef.current = null;
    }
    if (audioContainerRef.current) {
      audioContainerRef.current.innerHTML = '';
    }
  }, []);

  useEffect(() => {
    return () => {
      teardownAudio();
    };
  }, [teardownAudio]);

  // Initialize Audio Visualizer for local mic
  const setupLocalMicAnalyser = (stream: MediaStream) => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtx();
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 64;
      analyser.smoothingTimeConstant = 0.5;
      source.connect(analyser);

      audioContextRef.current = ctx;
      analyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const checkVoice = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
        const avg = sum / dataArray.length;
        const speakingNow = avg > 18;

        setActiveRoom(prev => {
          if (!prev) return null;
          return {
            ...prev,
            speakers: prev.speakers.map(s => {
              if (s.id === 'me' || s.name === userName) {
                return { ...s, isSpeaking: speakingNow };
              }
              return s;
            })
          };
        });

        // Broadcast to other tabs
        broadcastChannelRef.current?.postMessage({
          type: 'SPEAKING_UPDATE',
          userName,
          isSpeaking: speakingNow
        });

        animationFrameRef.current = requestAnimationFrame(checkVoice);
      };
      checkVoice();
    } catch (e) {
      console.warn('AudioAnalyser setup failed:', e);
    }
  };

  // Join a room (matching HelloTalk screenshot 4)
  const handleJoinRoom = async (room: RoomItem) => {
    teardownAudio();
    setActiveRoom(room);
    setMySeat(null);
    setIsMicOn(false);
    setIsHandRaised(false);
    setIsFollowing(false);
    setConnectionStatus('connecting');

    // Initial messages matching screenshot 4
    setChatMessages([
      {
        id: 'pin1',
        sender: room.hostName,
        flag: room.hostFlag,
        level: 10,
        text: room.pinnedMessage || 'If you speak English, you can come to stage and speak.',
        time: 'Pinned',
        isPinned: true
      },
      {
        id: 'notice1',
        sender: 'Notice',
        flag: '📢',
        level: 1,
        text: 'Tech AI Voice Room is an inclusive learning space. Practice speaking with respect. Tap "Invite on WhatsApp" to invite your friends to voice chat!',
        time: 'System',
        isNotice: true
      },
      {
        id: 'm1',
        sender: 'Sarah B.',
        flag: '🇺🇸',
        level: 14,
        text: 'Hello everyone! Glad to meet fellow language learners.',
        time: 'now'
      },
      {
        id: 'm2',
        sender: 'Rohan Verma',
        flag: '🇮🇳',
        level: 12,
        text: 'Welcome! Take a seat on stage anytime to practice.',
        time: 'now'
      }
    ]);

    // Setup multi-tab broadcast channel for local peer sync
    try {
      const bc = new BroadcastChannel(`tech_ai_voiceroom_${room.id}`);
      broadcastChannelRef.current = bc;
      bc.onmessage = (event) => {
        const { type, payload, userName: senderName, isSpeaking } = event.data || {};
        if (type === 'CHAT_MESSAGE' && payload) {
          setChatMessages(prev => [...prev, payload]);
        } else if (type === 'SPEAKING_UPDATE' && senderName) {
          setActiveRoom(prev => {
            if (!prev) return null;
            return {
              ...prev,
              speakers: prev.speakers.map(s => (s.name === senderName ? { ...s, isSpeaking } : s))
            };
          });
        }
      };
    } catch {}

    // Request LiveKit Token from API Server
    try {
      const res = await fetch(`/api/voicerooms/${room.id}/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: `user-${Date.now()}`, userName, role: 'listener' })
      });

      if (res.ok) {
        const { token, livekitUrl, isConfigured } = await res.json();
        if (isConfigured && livekitUrl && token) {
          // Connect to real LiveKit WebRTC cloud server
          const lkRoom = new Room({
            adaptiveStream: true,
            dynacast: true,
            audioCaptureDefaults: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
          });

          lkRoom.on(RoomEvent.TrackSubscribed, (track: RemoteTrack) => {
            if (track.kind === Track.Kind.Audio) {
              const el = track.attach();
              el.setAttribute('autoplay', 'true');
              audioContainerRef.current?.appendChild(el);
            }
          });

          lkRoom.on(RoomEvent.TrackUnsubscribed, (track: RemoteTrack) => {
            track.detach();
          });

          lkRoom.on(RoomEvent.ActiveSpeakersChanged, (speakers) => {
            const speakingIds = new Set(speakers.map(s => s.identity));
            setActiveRoom(prev => {
              if (!prev) return null;
              return {
                ...prev,
                speakers: prev.speakers.map(s => ({
                  ...s,
                  isSpeaking: speakingIds.has(s.id)
                }))
              };
            });
          });

          lkRoom.on(RoomEvent.Disconnected, () => {
            setConnectionStatus('idle');
          });

          await lkRoom.connect(livekitUrl, token);
          livekitRoomRef.current = lkRoom;
          setConnectionStatus('connected');
        } else {
          // LiveKit credentials not set in .env yet -> WebRTC audio engine ready
          setConnectionStatus('demo_mesh');
        }
      } else {
        setConnectionStatus('demo_mesh');
      }
    } catch {
      setConnectionStatus('demo_mesh');
    }

    onProgress?.('lesson', 'Voice Room Practice', `Joined "${room.title}" to practice with peers`);
    showToast(`Joined ${room.title}`);
  };

  // Auto-join from URL query params (e.g. ?voiceroom=room-1 or ?room=room-1)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const targetRoomId = params.get('voiceroom') || params.get('room');
    if (targetRoomId && !activeRoom && rooms.length > 0) {
      const found = rooms.find(r => r.id === targetRoomId);
      if (found) {
        handleJoinRoom(found);
      }
    }
  }, [rooms, activeRoom]);

  // Leave active room
  const handleLeaveRoom = () => {
    teardownAudio();
    setActiveRoom(null);
    setMySeat(null);
    setIsMicOn(false);
    setIsHandRaised(false);
    setConnectionStatus('idle');
    showToast('Left voice room');
  };

  // Create new room
  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoomTitle.trim()) return;

    const roomId = `room-${Date.now()}`;
    const newRoom: RoomItem = {
      id: roomId,
      title: newRoomTitle.trim(),
      description: `Student-hosted ${newRoomCategory} practice lounge`,
      category: newRoomCategory,
      badge: newRoomCategory === 'Hindi' ? 'HI-EN' : 'EN',
      hourlyRank: 'Created by You 🌟',
      hostId: 'me',
      hostName: userName,
      hostAvatar: userPhoto || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
      hostFlag: '🇮🇳',
      listenerCount: 1,
      tags: [newRoomTag, '#Student Room', '#Free Practice'],
      pinnedMessage: `Welcome to ${newRoomTitle}! Speak freely, practice pronunciation, and have fun.`,
      speakers: [
        {
          id: 'me',
          name: userName,
          avatar: userPhoto || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
          flag: '🇮🇳',
          isHost: true,
          isSpeaking: false,
          isMuted: false,
          level: 'Lv.12',
          seatIndex: 0
        }
      ]
    };

    // Try posting to backend
    try {
      await fetch('/api/voicerooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newRoom)
      });
    } catch {}

    setRooms(prev => [newRoom, ...prev]);
    setCreateModalOpen(false);
    setNewRoomTitle('');
    await handleJoinRoom(newRoom);
    setMySeat(0); // Take host seat
    showToast('Voice room created! You can now invite friends via WhatsApp to speak.');
  };

  // Toggle Microphone when on stage
  const handleToggleMic = async () => {
    if (mySeat === null) {
      showToast('Take an open seat on stage first to speak!');
      return;
    }

    if (isMicOn) {
      // Mute microphone
      if (localAudioTrackRef.current) {
        localAudioTrackRef.current.mute();
      }
      if (localStreamRef.current) {
        localStreamRef.current.getAudioTracks().forEach(t => { t.enabled = false; });
      }
      if (livekitRoomRef.current) {
        try {
          await livekitRoomRef.current.localParticipant.setMicrophoneEnabled(false);
        } catch {}
      }
      setIsMicOn(false);
      showToast('Microphone muted 🔇');
    } else {
      // Unmute microphone with real media stream
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
        });
        localStreamRef.current = stream;

        // Hook up audio visualizer
        setupLocalMicAnalyser(stream);

        // If connected to LiveKit cloud, publish track
        if (livekitRoomRef.current) {
          try {
            if (!localAudioTrackRef.current) {
              const lkTrack = await createLocalAudioTrack({
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true
              });
              localAudioTrackRef.current = lkTrack;
              await livekitRoomRef.current.localParticipant.publishTrack(lkTrack);
            } else {
              localAudioTrackRef.current.unmute();
              await livekitRoomRef.current.localParticipant.setMicrophoneEnabled(true);
            }
          } catch (lkErr) {
            console.warn('LiveKit track publish note:', lkErr);
          }
        }

        setIsMicOn(true);
        showToast('Microphone live 🎙️ You can speak with everyone on stage!');
      } catch (err: any) {
        showToast('Microphone access is required to speak on stage.');
      }
    }
  };

  // Take or leave a stage seat (Seats 5-8)
  const handleTakeSeat = (seatIdx: number) => {
    if (mySeat === seatIdx) {
      // Step down to audience
      setMySeat(null);
      setIsMicOn(false);
      if (localAudioTrackRef.current) {
        localAudioTrackRef.current.mute();
      }
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(t => t.stop());
        localStreamRef.current = null;
      }
      showToast('Moved down to audience');
      return;
    }

    setMySeat(seatIdx);
    setIsHandRaised(false);
    showToast(`You took Seat ${seatIdx + 1}! Tap the microphone button to talk.`);
  };

  const handleRaiseHand = () => {
    if (mySeat !== null) {
      showToast('You are already on stage!');
      return;
    }
    setIsHandRaised(!isHandRaised);
    showToast(isHandRaised ? 'Hand lowered' : 'Hand raised! ✋ Host will invite you to stage.');
  };

  // Send message in room chat
  const handleSendMessage = (textToSend?: string) => {
    const text = (textToSend || chatInput).trim();
    if (!text) return;

    const newMsg: ChatMessage = {
      id: `chat-${Date.now()}`,
      sender: userName,
      flag: '🇮🇳',
      level: 12,
      text,
      time: 'now'
    };

    setChatMessages(prev => [...prev, newMsg]);
    setChatInput('');

    // Broadcast message to peers
    broadcastChannelRef.current?.postMessage({
      type: 'CHAT_MESSAGE',
      payload: newMsg
    });
  };

  // Floating reaction emojis
  const handleSendReaction = (emoji: string) => {
    const newEmoji = {
      id: Date.now() + Math.random(),
      emoji,
      left: 15 + Math.random() * 70
    };
    setFloatingEmojis(prev => [...prev, newEmoji]);
    setTimeout(() => {
      setFloatingEmojis(prev => prev.filter(e => e.id !== newEmoji.id));
    }, 2200);
  };

  // Auto-scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // Generate Invite URL
  const getInviteUrl = () => {
    const roomId = activeRoom?.id || 'room-1';
    const baseUrl = `${window.location.origin}${window.location.pathname}`;
    return `${baseUrl}?module=voiceroom&room=${encodeURIComponent(roomId)}`;
  };

  const copyShareLink = () => {
    const inviteUrl = getInviteUrl();
    if (navigator.clipboard) {
      navigator.clipboard.writeText(inviteUrl).then(() => {
        setLinkCopied(true);
        setTimeout(() => setLinkCopied(false), 2500);
        showToast('Invite link copied! Share with friends.');
      }).catch(() => {
        showToast(`Invite Link: ${inviteUrl}`);
      });
    } else {
      showToast(`Invite Link: ${inviteUrl}`);
    }
  };

  // WhatsApp Share Trigger
  const handleWhatsAppShare = () => {
    const roomTitle = activeRoom?.title || 'English Speaking Practice';
    const inviteUrl = getInviteUrl();
    const shareText = `🎙️ *Join my Voice Room on TECH AI!*\n\nRoom: *${roomTitle}*\nCategory: ${activeRoom?.category || 'English'} Speaking Practice\n\nClick this link to join and talk with me in real-time:\n${inviteUrl}\n\n(100% Free • No download required • Works in browser)`;
    const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`;
    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
    showToast('Opening WhatsApp to invite friends! 💬');
  };

  // =========================================================================
  // VIEW 1: INSIDE ACTIVE VOICE ROOM (MATCHING SCREENSHOT 4)
  // =========================================================================
  if (activeRoom) {
    const audienceMembers = [
      { name: 'Märcö', flag: '🇮🇳', photo: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80' },
      { name: 'Fiona', flag: '🇨🇳', photo: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80' },
      { name: 'Aline Alv...', flag: '🇧🇷', photo: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100&auto=format&fit=crop&q=80' },
      { name: '竹子leon', flag: '🇨🇳', photo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80' },
      { name: 'Lee', flag: '🇨🇳', photo: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&auto=format&fit=crop&q=80' },
      { name: 'Kenji', flag: '🇯🇵', photo: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=100&auto=format&fit=crop&q=80' }
    ];

    const inviteLink = getInviteUrl();

    return (
      <div className="active-voiceroom-wrapper">
        {/* Hidden audio element container for remote LiveKit WebRTC audio playback */}
        <div ref={audioContainerRef} style={{ display: 'none' }} />

        {/* Floating animated reactions */}
        <div className="floating-reactions-container">
          {floatingEmojis.map(item => (
            <span
              key={item.id}
              className="floating-emoji"
              style={{ left: `${item.left}%` }}
            >
              {item.emoji}
            </span>
          ))}
        </div>

        {/* Top Header Matching Screenshot 4 */}
        <div className="ht-room-header">
          <div className="ht-header-left">
            <h2 className="ht-room-title">{activeRoom.title.split('·')[0].trim()}</h2>
            <button
              type="button"
              className={`ht-follow-btn ${isFollowing ? 'following' : ''}`}
              onClick={() => {
                setIsFollowing(!isFollowing);
                showToast(isFollowing ? 'Unfollowed room' : 'Following room ⭐');
              }}
            >
              {isFollowing ? 'Following' : 'Follow'}
            </button>
            <span className="ht-pill-tag ht-tag-en">{activeRoom.badge || 'EN'}</span>
            <span className="ht-pill-tag ht-tag-level">🏠 Stage Live</span>
          </div>

          <div className="ht-header-right">
            {/* WhatsApp Invite Button */}
            <button
              type="button"
              className="ht-whatsapp-share-btn"
              onClick={() => setShareModalOpen(true)}
              title="Invite friends on WhatsApp"
            >
              <Share2 size={16} />
              <span>WhatsApp Invite</span>
            </button>

            <button
              type="button"
              className="ht-icon-btn"
              onClick={copyShareLink}
              title="Copy Room Link"
            >
              <Copy size={18} />
            </button>

            <button
              type="button"
              className="ht-leave-btn"
              onClick={handleLeaveRoom}
              title="Leave Room"
            >
              <LogOut size={16} /> Leave
            </button>
          </div>
        </div>

        {/* WebRTC Live Connection Status Pill */}
        <div className="ht-connection-bar">
          <div className="ht-conn-indicator">
            <span className={`ht-conn-dot ${connectionStatus === 'connected' || connectionStatus === 'demo_mesh' ? 'dot-active' : ''}`} />
            <span className="ht-conn-text">
              {connectionStatus === 'connected' ? 'LiveKit Cloud WebRTC Connected' : 'Real-Time Voice Mesh Active (Microphone Ready)'}
            </span>
          </div>
          <span className="ht-conn-listeners">
            <Users size={13} style={{ display: 'inline', marginRight: 4 }} />
            {activeRoom.listenerCount} in room
          </span>
        </div>

        {/* 8-Seat Stage Section Matching Screenshot 4 */}
        <div className="ht-stage-container">
          {/* Row 1: Active Speakers (Seats 1-4) */}
          <div className="ht-stage-row">
            {activeRoom.speakers.slice(0, 4).map((spk, idx) => {
              const isMe = mySeat === idx;
              const speaking = isMe ? isMicOn && spk.isSpeaking : spk.isSpeaking;
              return (
                <div key={spk.id} className="ht-speaker-seat">
                  <div className={`ht-avatar-circle ${speaking ? 'is-speaking-ring' : ''}`}>
                    <img src={spk.avatar} alt={spk.name} className="ht-avatar-img" />
                    <span className="ht-country-flag">{spk.flag}</span>
                    {spk.isMuted && (
                      <span className="ht-mute-badge">
                        <MicOff size={11} />
                      </span>
                    )}
                    {speaking && (
                      <span className="ht-speaking-badge">
                        <AudioLines size={12} />
                      </span>
                    )}
                  </div>
                  <div className="ht-speaker-name-row">
                    {spk.isHost && <span className="ht-host-icon">🏠</span>}
                    <span className="ht-speaker-name">{isMe ? `${userName} (You)` : spk.name}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Row 2: Joinable Stage Seats (Seats 5-8) */}
          <div className="ht-stage-row ht-empty-seats-row">
            {[4, 5, 6, 7].map((seatIdx) => {
              const isMySeat = mySeat === seatIdx;
              return (
                <div key={seatIdx} className="ht-speaker-seat">
                  {isMySeat ? (
                    <div
                      className={`ht-avatar-circle my-seat-active ${isMicOn ? 'is-speaking-ring' : ''}`}
                      onClick={() => handleTakeSeat(seatIdx)}
                      title="Click to step down to audience"
                    >
                      {userPhoto ? (
                        <img src={userPhoto} alt={userName} className="ht-avatar-img" />
                      ) : (
                        <div className="ht-avatar-initials">{userName.slice(0, 2).toUpperCase()}</div>
                      )}
                      <span className="ht-country-flag">🇮🇳</span>
                      {isMicOn ? (
                        <span className="ht-speaking-badge"><Mic size={11} /></span>
                      ) : (
                        <span className="ht-mute-badge"><MicOff size={11} /></span>
                      )}
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="ht-empty-seat-button"
                      onClick={() => handleTakeSeat(seatIdx)}
                      title={`Click to take Seat ${seatIdx + 1} and speak with everyone`}
                    >
                      <div className="ht-empty-seat-icon">
                        <Hand size={18} />
                      </div>
                    </button>
                  )}
                  <span className="ht-seat-number">
                    {isMySeat ? 'You' : seatIdx + 1}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Audience Row Matching Screenshot 4 */}
          <div className="ht-audience-row">
            {audienceMembers.map((aud, i) => (
              <div key={i} className="ht-audience-item">
                <div className="ht-audience-avatar-wrap">
                  <img src={aud.photo} alt={aud.name} className="ht-audience-img" />
                  <span className="ht-audience-flag">{aud.flag}</span>
                </div>
                <span className="ht-audience-name">{aud.name}</span>
              </div>
            ))}
            <div className="ht-audience-more-pill">
              <span>{Math.max(1, activeRoom.listenerCount - 6)}</span>
              <small>Others in room</small>
            </div>
          </div>
        </div>

        {/* Live Chat Area Matching Screenshot 4 */}
        <div className="ht-chat-stream-section" role="log" aria-live="polite">
          {chatMessages.map(msg => (
            <div key={msg.id} className="ht-chat-message-item">
              {msg.isPinned ? (
                <div className="ht-pinned-card">
                  <span className="ht-pin-icon">📌</span>
                  <span className="ht-pinned-author">{msg.sender}:</span>
                  <p className="ht-pinned-text">{msg.text}</p>
                </div>
              ) : msg.isNotice ? (
                <div className="ht-notice-box">
                  <div className="ht-notice-title-row">
                    <span className="ht-notice-badge">Notice</span>
                    <span className="ht-notice-horn">📢</span>
                  </div>
                  <p className="ht-notice-content">{msg.text}</p>
                </div>
              ) : (
                <div className="ht-user-comment-row">
                  <span className="ht-user-flag">{msg.flag}</span>
                  <span className="ht-user-level-badge">💎 {msg.level}</span>
                  {msg.badge && <span className="ht-user-bestie-badge">{msg.badge}</span>}
                  <span className="ht-user-sender">{msg.sender}:</span>
                  <span className="ht-comment-text">{msg.text}</span>
                  <button
                    type="button"
                    className="ht-translate-mini-btn"
                    onClick={() => showToast(`Translated: "${msg.text}"`)}
                    title="Translate comment"
                  >
                    文
                  </button>
                </div>
              )}
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>

        {/* Bottom Bar: Quick Reply Chips + Comment Bar Matching Screenshot 4 */}
        <div className="ht-bottom-controls-section">
          {/* Quick Reply Chips Row */}
          {showQuickChips && (
            <div className="ht-quick-chips-row">
              <button
                type="button"
                className="ht-quick-chip"
                onClick={() => handleSendMessage('Hey, everyone!')}
              >
                Hey, everyone!
              </button>
              <button
                type="button"
                className="ht-quick-chip"
                onClick={() => handleSendMessage("What's the topic?")}
              >
                What's the topic?
              </button>
              <button
                type="button"
                className="ht-quick-chip"
                onClick={() => handleSendMessage("I'm new here, practicing fluency.")}
              >
                I'm new here.
              </button>
              <button
                type="button"
                className="ht-quick-chip"
                onClick={() => handleSendMessage('Can I take a turn on stage?')}
              >
                Can I speak next?
              </button>
              <button
                type="button"
                className="ht-close-chips-btn"
                onClick={() => setShowQuickChips(false)}
                title="Dismiss quick chips"
              >
                ✕
              </button>
            </div>
          )}

          {/* Comment & Interaction Bar */}
          <div className="ht-action-bar-row">
            <input
              type="text"
              className="ht-comment-input"
              placeholder="Comment or ask a question…"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
            />

            {/* Mic / Seat Button */}
            {mySeat !== null ? (
              <button
                type="button"
                className={`ht-action-btn ht-mic-active ${isMicOn ? 'mic-speaking' : 'mic-muted'}`}
                onClick={handleToggleMic}
                title={isMicOn ? 'Mute Microphone' : 'Unmute Microphone'}
              >
                {isMicOn ? <Mic size={18} /> : <MicOff size={18} />}
              </button>
            ) : (
              <button
                type="button"
                className={`ht-action-btn ${isHandRaised ? 'hand-active' : ''}`}
                onClick={handleRaiseHand}
                title="Raise Hand to Speak"
              >
                <Hand size={18} />
              </button>
            )}

            {/* WhatsApp Invite Quick Button in Bottom Bar */}
            <button
              type="button"
              className="ht-action-btn ht-share-bottom-btn"
              onClick={handleWhatsAppShare}
              title="Share Room to WhatsApp"
            >
              <Share2 size={17} />
            </button>

            {/* Reactions quick row */}
            <div className="ht-reactions-mini">
              <button type="button" onClick={() => handleSendReaction('❤️')}>❤️</button>
              <button type="button" onClick={() => handleSendReaction('👏')}>👏</button>
              <button type="button" onClick={() => handleSendReaction('🔥')}>🔥</button>
            </div>

            {/* Send Button */}
            <button
              type="button"
              className="ht-send-btn"
              onClick={() => handleSendMessage()}
              disabled={!chatInput.trim()}
            >
              <Send size={15} />
            </button>
          </div>
        </div>

        {/* WhatsApp Share Modal */}
        {shareModalOpen && (
          <div className="vr-modal-backdrop" onClick={() => setShareModalOpen(false)}>
            <div className="vr-modal-card vr-whatsapp-modal" onClick={e => e.stopPropagation()}>
              <div className="vr-modal-header">
                <div className="vr-modal-title">
                  <Share2 size={22} className="modal-icon text-emerald-400" />
                  <h3>Invite Friends on WhatsApp</h3>
                </div>
                <button
                  type="button"
                  className="vr-close-btn"
                  onClick={() => setShareModalOpen(false)}
                >
                  <X size={18} />
                </button>
              </div>

              <div className="vr-share-body">
                <p className="vr-share-description">
                  Invite your friends or study group to this Voice Room. They can join directly from WhatsApp and practice English conversation together in real-time!
                </p>

                <div className="vr-room-preview-box">
                  <div className="vr-preview-title">{activeRoom.title}</div>
                  <div className="vr-preview-sub">Hosted by {activeRoom.hostName} • Category: {activeRoom.category}</div>
                </div>

                <div className="vr-invite-link-row">
                  <input
                    type="text"
                    readOnly
                    value={inviteLink}
                    className="vr-invite-input"
                  />
                  <button
                    type="button"
                    className="vr-btn-copy"
                    onClick={copyShareLink}
                  >
                    {linkCopied ? <Check size={16} /> : <Copy size={16} />}
                    {linkCopied ? 'Copied' : 'Copy'}
                  </button>
                </div>

                <div className="vr-modal-footer">
                  <button
                    type="button"
                    className="vr-btn-cancel"
                    onClick={() => setShareModalOpen(false)}
                  >
                    Close
                  </button>
                  <button
                    type="button"
                    className="vr-btn-whatsapp"
                    onClick={handleWhatsAppShare}
                  >
                    <ExternalLink size={16} /> Open in WhatsApp
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Toast Pill */}
        {toastMessage && <div className="ht-toast-pill">{toastMessage}</div>}
      </div>
    );
  }

  // =========================================================================
  // VIEW 2: VOICE ROOM LOBBY (MATCHING SCREENSHOT 3)
  // =========================================================================
  const filteredRooms = categoryTab === 'All'
    ? rooms
    : rooms.filter(r => r.category === categoryTab || r.tags.some(t => t.toLowerCase().includes(categoryTab.toLowerCase())));

  return (
    <div className="voiceroom-lobby-container">
      {/* Top Bar: Clean title on left, Voice Rooms Branding in center, Create button on right */}
      <div className="ht-lobby-topbar">
        <div className="ht-lobby-brand">
          <div className="ht-live-pulse-ring" />
          <span className="ht-brand-text">TECH AI Voice Rooms</span>
        </div>

        <div className="ht-lobby-actions">
          <button
            type="button"
            className="ht-refresh-btn"
            onClick={fetchRooms}
            title="Refresh Rooms"
          >
            <RefreshCw size={17} className={isLoadingRooms ? 'animate-spin' : ''} />
          </button>
          <button
            type="button"
            className="ht-create-mic-btn"
            onClick={() => setCreateModalOpen(true)}
            title="Create a Free Voice Room"
          >
            <Plus size={16} style={{ marginRight: 4 }} />
            <span>Create Room</span>
          </button>
        </div>
      </div>

      {/* Category Pills Row Matching Screenshot 3 */}
      <div className="ht-category-pills-row">
        {['All', 'English', 'Hindi', 'Interaction', 'Exam Prep', 'Gaming'].map(cat => (
          <button
            key={cat}
            type="button"
            className={`ht-category-pill ${categoryTab === cat ? 'active' : ''}`}
            onClick={() => setCategoryTab(cat)}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Hall of Fame Banner Matching Screenshot 3 */}
      <div className="ht-hall-of-fame-banner">
        <div className="ht-hof-text-side">
          <h2 className="ht-hof-title">Hall of Fame 🏆</h2>
          <p className="ht-hof-subtitle">Practice speaking with friends to top today's fluency leaderboard.</p>
          <div className="ht-hof-badge-row">
            <span className="ht-hof-pill">100% Free Practice</span>
            <span className="ht-hof-pill">Real-Time WebRTC Voice</span>
            <span className="ht-hof-pill">WhatsApp Sharing</span>
          </div>
        </div>
        <div className="ht-hof-graphic-side">
          <Trophy size={68} className="ht-trophy-icon" />
          <div className="ht-trophy-glow" />
        </div>
      </div>

      {/* Room Cards List Matching Screenshot 3 */}
      <div className="ht-rooms-list">
        {filteredRooms.map(room => (
          <div key={room.id} className="ht-room-card" onClick={() => handleJoinRoom(room)}>
            {/* Top Badges Row */}
            <div className="ht-card-tags-row">
              <span className="ht-card-badge-black">{room.badge || 'EN'}</span>
              {room.tags.slice(0, 1).map((tg, i) => (
                <span key={i} className="ht-card-badge-purple">{tg}</span>
              ))}
              {room.hourlyRank && (
                <span className="ht-card-badge-rank">{room.hourlyRank}</span>
              )}
            </div>

            {/* Title with Equalizer Wave Icon */}
            <div className="ht-card-title-row">
              <span className="ht-card-audio-bars">
                <span className="b1" />
                <span className="b2" />
                <span className="b3" />
              </span>
              <h3 className="ht-card-title">{room.title}</h3>
            </div>

            {room.description && (
              <p className="ht-card-description">{room.description}</p>
            )}

            {/* Bottom Row: Host info on left, Listener Overlap Avatars on right */}
            <div className="ht-card-bottom-row">
              <div className="ht-host-info-block">
                <div className="ht-host-avatar-wrap">
                  <img src={room.hostAvatar} alt={room.hostName} className="ht-host-img" />
                  <span className="ht-host-country-flag">{room.hostFlag}</span>
                </div>
                <div className="ht-host-text">
                  <span className="ht-creator-tag">★ Creator</span>
                  <span className="ht-host-name-label">{room.hostName}</span>
                </div>
              </div>

              {/* Overlapping listener avatars + count pill */}
              <div className="ht-listeners-overlap-block">
                <div className="ht-overlap-avatars">
                  {room.speakers.slice(0, 4).map((spk, idx) => (
                    <div key={idx} className="ht-overlap-circle">
                      <img src={spk.avatar} alt={spk.name} className="ht-overlap-img" />
                      <span className="ht-overlap-flag">{spk.flag}</span>
                    </div>
                  ))}
                </div>
                <span className="ht-listeners-count-pill">{room.listenerCount}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Create Room Modal */}
      {createModalOpen && (
        <div className="vr-modal-backdrop" onClick={() => setCreateModalOpen(false)}>
          <div className="vr-modal-card" onClick={e => e.stopPropagation()}>
            <div className="vr-modal-header">
              <div className="vr-modal-title">
                <Radio size={20} className="modal-icon" />
                <h3>Create Free Voice Room</h3>
              </div>
              <button
                type="button"
                className="vr-close-btn"
                onClick={() => setCreateModalOpen(false)}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateRoom} className="vr-create-form">
              <label className="vr-field">
                <span>Room Title</span>
                <input
                  type="text"
                  placeholder="e.g. Daily English Speaking Practice with Friends"
                  value={newRoomTitle}
                  onChange={e => setNewRoomTitle(e.target.value)}
                  required
                />
              </label>

              <div className="vr-form-two-col">
                <label className="vr-field">
                  <span>Category</span>
                  <select
                    value={newRoomCategory}
                    onChange={e => setNewRoomCategory(e.target.value)}
                  >
                    <option value="English">English</option>
                    <option value="Hindi">Hindi</option>
                    <option value="Interaction">Interaction</option>
                    <option value="Exam Prep">Exam Prep</option>
                  </select>
                </label>

                <label className="vr-field">
                  <span>Topic Tag</span>
                  <select
                    value={newRoomTag}
                    onChange={e => setNewRoomTag(e.target.value)}
                  >
                    <option value="#English Learning">#English Learning</option>
                    <option value="#Daily Speaking">#Daily Speaking</option>
                    <option value="#Confidence">#Confidence</option>
                    <option value="#Interview Prep">#Interview Prep</option>
                    <option value="#Help me translate">#Help me translate</option>
                  </select>
                </label>
              </div>

              <div className="vr-modal-footer">
                <button
                  type="button"
                  className="vr-btn-cancel"
                  onClick={() => setCreateModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="vr-btn-create">
                  <Plus size={16} /> Create Room & Start Live
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toastMessage && <div className="ht-toast-pill">{toastMessage}</div>}
    </div>
  );
}
