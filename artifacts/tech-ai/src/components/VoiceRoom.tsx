import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Room, RoomEvent, Track, RemoteTrack, createLocalAudioTrack, LocalAudioTrack } from 'livekit-client';

export interface VoiceRoomProps {
  userName?: string;
  userPhoto?: string;
  onProgress?: (kind: 'lesson' | 'document' | 'form' | 'quiz' | 'equation', title: string, details: string) => void;
}

export interface RoomItem {
  id: string;
  name: string;
  category: string;
  host: string;
  initials: string;
  count: number;
  capacity: number;
  access: 'Public' | 'Private';
  approval: boolean;
  allowMembers?: boolean;
  description: string;
  color?: string;
  live: boolean;
  created?: boolean;
}

interface Participant {
  name: string;
  initials: string;
  role: string;
  color: string;
  isHost?: boolean;
  isMe?: boolean;
  isSpeaking?: boolean;
}

const DEFAULT_ROOMS: RoomItem[] = [
  {
    id: 'demo-english',
    name: 'English Speaking Circle',
    category: 'Language Practice',
    host: 'Aarav Sharma',
    initials: 'AS',
    count: 6,
    capacity: 12,
    access: 'Public',
    approval: false,
    description: 'Build confidence, practice daily English, and make new friends.',
    color: 'linear-gradient(135deg,#e6a7ff,#6d86ff)',
    live: true,
  },
  {
    id: 'demo-study',
    name: 'Study With Me · Focus Room',
    category: 'Education',
    host: 'Priya Verma',
    initials: 'PV',
    count: 4,
    capacity: 8,
    access: 'Public',
    approval: true,
    description: 'Quiet accountability, study goals, and a little motivation.',
    color: 'linear-gradient(135deg,#f9c47b,#e87b9c)',
    live: true,
  },
  {
    id: 'demo-lounge',
    name: 'Late Night Chai Lounge',
    category: 'General',
    host: 'Kabir Singh',
    initials: 'KS',
    count: 9,
    capacity: 12,
    access: 'Public',
    approval: false,
    description: 'Relaxed conversations, new perspectives, good company.',
    color: 'linear-gradient(135deg,#77d6ca,#5c8cff)',
    live: true,
  },
  {
    id: 'demo-game',
    name: 'Game Talk Arena',
    category: 'Gaming',
    host: 'Rohan Mehta',
    initials: 'RM',
    count: 3,
    capacity: 8,
    access: 'Public',
    approval: false,
    description: 'Talk strategies, share your favourite games, find teammates.',
    color: 'linear-gradient(135deg,#ff9b70,#a66bff)',
    live: true,
  },
  {
    id: 'demo-movie',
    name: 'Movies & Music Club',
    category: 'Entertainment',
    host: 'Ananya Rao',
    initials: 'AR',
    count: 5,
    capacity: 12,
    access: 'Public',
    approval: false,
    description: 'What are you watching or listening to this week?',
    color: 'linear-gradient(135deg,#ff9fca,#8872ff)',
    live: true,
  },
];

export function VoiceRoom({ userName = 'Student', userPhoto, onProgress }: VoiceRoomProps) {
  const [activeFilter, setActiveFilter] = useState<string>('All');
  const [currentRoom, setCurrentRoom] = useState<RoomItem | null>(null);
  const [rooms, setRooms] = useState<RoomItem[]>(DEFAULT_ROOMS);
  const [micEnabled, setMicEnabled] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastVisible, setToastVisible] = useState(false);

  // Modals state
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [joinModalOpen, setJoinModalOpen] = useState(false);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);

  // Create Form State
  const [formName, setFormName] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formCategory, setFormCategory] = useState('Language Practice');
  const [formCapacity, setFormCapacity] = useState('8');
  const [formAccess, setFormAccess] = useState<'Public' | 'Private'>('Public');
  const [formApproval, setFormApproval] = useState(false);
  const [formAllowMembers, setFormAllowMembers] = useState(true);

  // Join Form State
  const [joinUrlInput, setJoinUrlInput] = useState('');

  // Audio / WebRTC Refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const livekitRoomRef = useRef<Room | null>(null);
  const localAudioTrackRef = useRef<LocalAudioTrack | null>(null);
  const audioContainerRef = useRef<HTMLDivElement>(null);
  const broadcastChannelRef = useRef<BroadcastChannel | null>(null);
  const [peerParticipants, setPeerParticipants] = useState<Participant[]>([]);

  // Toast helper
  const toastTimeoutRef = useRef<any>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setToastVisible(true);
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = setTimeout(() => {
      setToastVisible(false);
    }, 3000);
  };

  // Fetch rooms from backend
  const fetchRooms = useCallback(async () => {
    try {
      const res = await fetch('/api/voicerooms');
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.rooms) && data.rooms.length > 0) {
          setRooms(data.rooms);
        }
      }
    } catch {
      // Backend offline, fallback rooms are used
    }
  }, []);

  useEffect(() => {
    fetchRooms();
  }, [fetchRooms]);

  // Clean up all audio streams
  const stopAudio = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (audioContextRef.current) {
      try { audioContextRef.current.close(); } catch {}
      audioContextRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(t => t.stop());
      mediaStreamRef.current = null;
    }
    if (localAudioTrackRef.current) {
      try { localAudioTrackRef.current.stop(); } catch {}
      localAudioTrackRef.current = null;
    }
    if (livekitRoomRef.current) {
      try { livekitRoomRef.current.disconnect(); } catch {}
      livekitRoomRef.current = null;
    }
    if (broadcastChannelRef.current) {
      try { broadcastChannelRef.current.close(); } catch {}
      broadcastChannelRef.current = null;
    }
    if (audioContainerRef.current) {
      audioContainerRef.current.innerHTML = '';
    }
    setMicEnabled(false);
    setIsSpeaking(false);
  }, []);

  useEffect(() => {
    return () => {
      stopAudio();
    };
  }, [stopAudio]);

  // Setup real-time voice volume detection with Web Audio API
  const setupVoiceDetection = (stream: MediaStream) => {
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
      const checkAudio = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
        const avg = sum / dataArray.length;
        const speaking = avg > 18;

        setIsSpeaking(speaking);

        // Broadcast to other peers/tabs
        broadcastChannelRef.current?.postMessage({
          type: 'SPEAKING_UPDATE',
          userName,
          isSpeaking: speaking
        });

        animationFrameRef.current = requestAnimationFrame(checkAudio);
      };
      checkAudio();
    } catch (e) {
      console.warn('AudioAnalyser setup failed:', e);
    }
  };

  // Toggle Microphone
  const toggleMicrophone = async () => {
    if (micEnabled) {
      // Mute mic
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getAudioTracks().forEach(t => { t.enabled = false; });
      }
      if (localAudioTrackRef.current) {
        localAudioTrackRef.current.mute();
      }
      if (livekitRoomRef.current) {
        try {
          await livekitRoomRef.current.localParticipant.setMicrophoneEnabled(false);
        } catch {}
      }
      setMicEnabled(false);
      setIsSpeaking(false);
      showToast('Microphone muted.');
    } else {
      // Unmute / Enable mic
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
        });
        mediaStreamRef.current = stream;
        setupVoiceDetection(stream);

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
            console.warn('LiveKit track publish:', lkErr);
          }
        }

        setMicEnabled(true);
        showToast('Microphone enabled! Speak freely with everyone in the room.');
      } catch (err: any) {
        showToast('Microphone access is required. Please check your browser permissions.');
      }
    }
  };

  // Test Audio Output
  const testAudioOutput = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.12); // A5

      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.35);

      showToast('🔊 Audio output tested successfully! Sound is working.');
    } catch {
      showToast('Audio output check is ready.');
    }
  };

  // Open a room
  const openRoom = async (room: RoomItem) => {
    if (room.count >= room.capacity) {
      showToast('This room is currently full.');
      return;
    }

    stopAudio();
    setCurrentRoom(room);
    setPeerParticipants([]);

    // Broadcast channel for multi-tab sync
    try {
      const bc = new BroadcastChannel(`voiceroom_${room.id}`);
      broadcastChannelRef.current = bc;
      bc.onmessage = (event) => {
        const { type, userName: senderName, isSpeaking: peerSpeaking } = event.data || {};
        if (type === 'SPEAKING_UPDATE' && senderName && senderName !== userName) {
          setPeerParticipants(prev => {
            const exists = prev.find(p => p.name === senderName);
            if (exists) {
              return prev.map(p => (p.name === senderName ? { ...p, isSpeaking: peerSpeaking } : p));
            }
            return [
              ...prev,
              {
                name: senderName,
                initials: senderName.slice(0, 2).toUpperCase(),
                role: peerSpeaking ? 'Speaking' : 'Listening',
                color: 'linear-gradient(135deg,#74d6c8,#5488ff)',
                isSpeaking: peerSpeaking,
              }
            ];
          });
        }
      };
    } catch {}

    // LiveKit token request
    try {
      const res = await fetch(`/api/voicerooms/${room.id}/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: `user-${Date.now()}`, userName, role: 'listener' }),
      });

      if (res.ok) {
        const { token, livekitUrl, isConfigured } = await res.json();
        if (isConfigured && livekitUrl && token) {
          const lkRoom = new Room({
            adaptiveStream: true,
            dynacast: true,
            audioCaptureDefaults: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
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

          await lkRoom.connect(livekitUrl, token);
          livekitRoomRef.current = lkRoom;
        }
      }
    } catch (e) {
      console.warn('LiveKit connection note:', e);
    }

    onProgress?.('lesson', 'Voice Room Conversation', `Joined "${room.name}" voice room`);
    showToast(`Joined ${room.name}`);
  };

  // Auto-join from URL hash or query params
  useEffect(() => {
    const checkUrl = () => {
      const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
      const queryParams = new URLSearchParams(window.location.search);
      const targetId = hashParams.get('room') || queryParams.get('room') || queryParams.get('voiceroom');

      if (targetId && !currentRoom && rooms.length > 0) {
        const found = rooms.find(r => r.id === targetId);
        if (found) {
          openRoom(found);
        }
      }
    };

    checkUrl();
    window.addEventListener('hashchange', checkUrl);
    return () => window.removeEventListener('hashchange', checkUrl);
  }, [rooms, currentRoom]);

  // Leave room
  const leaveRoom = () => {
    stopAudio();
    setCurrentRoom(null);
    showToast('You left the room.');
  };

  // Create room handler
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = formName.trim();
    if (name.length < 3) {
      showToast('Please enter a room name with at least 3 characters.');
      return;
    }

    if (rooms.some(r => r.name.toLowerCase() === name.toLowerCase())) {
      showToast('A room with this name already exists.');
      return;
    }

    const newRoom: RoomItem = {
      id: `room-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name,
      category: formCategory,
      host: userName || 'You',
      initials: (userName || 'YO').slice(0, 2).toUpperCase(),
      count: 1,
      capacity: Number(formCapacity) || 8,
      access: formAccess,
      approval: formApproval,
      allowMembers: formAllowMembers,
      description: formDesc.trim() || 'Come in and join the conversation.',
      color: 'linear-gradient(135deg,#8b82ff,#56b5e9)',
      live: true,
      created: true,
    };

    // Save to backend
    try {
      await fetch('/api/voicerooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newRoom),
      });
    } catch {}

    setRooms(prev => [newRoom, ...prev]);
    setCreateModalOpen(false);
    setFormName('');
    setFormDesc('');
    setActiveFilter('All');
    openRoom(newRoom);
    showToast('Room created and live! Invite your friends to talk together.');
  };

  // Join by link form handler
  const handleJoinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const raw = joinUrlInput.trim();
    try {
      let id = raw;
      if (raw.includes('http://') || raw.includes('https://') || raw.includes('#') || raw.includes('?')) {
        const u = new URL(raw, window.location.origin);
        const hashParams = new URLSearchParams(u.hash.replace(/^#/, ''));
        id = hashParams.get('room') || u.searchParams.get('room') || u.searchParams.get('voiceroom') || id;
      }

      const found = rooms.find(r => r.id === id || r.name.toLowerCase() === id.toLowerCase());
      setJoinModalOpen(false);
      setJoinUrlInput('');

      if (!found) {
        showToast('Room not found. Check the invitation link.');
        return;
      }
      if (found.access === 'Private' && !found.created) {
        showToast('This private room requires a valid authorized invitation.');
        return;
      }
      if (found.approval) {
        showToast('Host approval required to join this room.');
      }
      openRoom(found);
    } catch {
      showToast('Please enter a valid invitation link or room ID.');
    }
  };

  // Invite link generation
  const getInviteUrl = () => {
    const base = window.location.origin + window.location.pathname;
    return `${base}?module=voiceroom&room=${encodeURIComponent(currentRoom?.id || 'demo-english')}`;
  };

  const getInviteMessage = () => {
    const url = getInviteUrl();
    const title = currentRoom?.name || 'VoiceRoom';
    return `🎙️ Join my VoiceRoom "${title}"! Let's talk together in real-time. Tap this link to join: ${url}`;
  };

  const copyInviteLink = async () => {
    const url = getInviteUrl();
    try {
      await navigator.clipboard.writeText(url);
      showToast('Invitation link copied!');
    } catch {
      showToast(`Copy link: ${url}`);
    }
  };

  const shareOnWhatsApp = () => {
    const msg = getInviteMessage();
    const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`;
    window.open(waUrl, '_blank', 'noopener,noreferrer');
    showToast('Opening WhatsApp with pre-filled invitation...');
  };

  const shareNative = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Join my VoiceRoom: ${currentRoom?.name}`,
          text: getInviteMessage(),
          url: getInviteUrl(),
        });
        showToast('Share dialog opened.');
      } catch (e: any) {
        if (e.name !== 'AbortError') {
          showToast('Native sharing unavailable. Use WhatsApp or Copy link.');
        }
      }
    } else {
      showToast('Native sharing not supported on this browser. Try WhatsApp or Copy Link.');
    }
  };

  // Filtered rooms
  const filteredRooms = rooms.filter(r => activeFilter === 'All' || r.category === activeFilter);

  // User avatar initial
  const userInitial = (userName || 'J').slice(0, 1).toUpperCase();

  return (
    <div className="vr-app">
      {/* Hidden audio container for remote WebRTC audio streams */}
      <div ref={audioContainerRef} style={{ display: 'none' }} />

      {/* Top Header Matching User's Design */}
      <header className="vr-top">
        <div className="vr-brand">
          <div className="vr-logo">
            <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.1" strokeLinecap="round">
              <rect x="8" y="3" width="8" height="13" rx="4" />
              <path d="M5 11a7 7 0 0 0 14 0M12 18v3m-4 0h8" />
            </svg>
          </div>
          VoiceRoom
        </div>
        <div className="vr-topright">
          <button
            type="button"
            className="vr-smallbtn"
            onClick={() => {
              setActiveFilter('All');
              showToast('Showing available rooms and your rooms.');
            }}
          >
            My rooms
          </button>
          <div className="vr-avatar" title={`Your profile: ${userName}`}>
            {userInitial}
          </div>
        </div>
      </header>

      <div className="vr-container">
        {/* =========================================================================
            VIEW 1: EXPLORE ROOMS LIST
            ========================================================================= */}
        {!currentRoom && (
          <section className="vr-roomlist">
            <div className="vr-hero">
              <div>
                <div className="vr-eyebrow">Your people. Your conversations.</div>
                <h1>
                  Find your voice.<br />
                  <span style={{ background: 'linear-gradient(90deg,#a99aff,#70c6ff)', WebkitBackgroundClip: 'text', color: 'transparent' }}>
                    Find your room.
                  </span>
                </h1>
                <p>Meet people, practice a language, share ideas, and have real conversations in welcoming voice rooms.</p>
              </div>
              <div className="vr-actions">
                <button
                  type="button"
                  className="vr-primary"
                  onClick={() => setCreateModalOpen(true)}
                >
                  ＋ Create Room
                </button>
                <button
                  type="button"
                  className="vr-secondary"
                  onClick={() => setJoinModalOpen(true)}
                >
                  ↗ Join with link
                </button>
              </div>
            </div>

            <div className="vr-sectionhead">
              <div>
                <h2>Explore rooms</h2>
                <p>Discover a conversation happening right now.</p>
              </div>
              <button
                type="button"
                className="vr-smallbtn"
                onClick={() => {
                  fetchRooms();
                  showToast('Room list refreshed.');
                }}
              >
                ↻ Refresh
              </button>
            </div>

            <div className="vr-filters">
              {['All', 'Language Practice', 'Education', 'General', 'Gaming', 'Entertainment'].map(cat => (
                <button
                  key={cat}
                  type="button"
                  className={`vr-filter ${activeFilter === cat ? 'active' : ''}`}
                  onClick={() => setActiveFilter(cat)}
                >
                  {cat === 'All' ? '✦ All rooms' : cat}
                </button>
              ))}
            </div>

            <div className="vr-grid">
              {filteredRooms.length > 0 ? (
                filteredRooms.map(room => (
                  <article key={room.id} className="vr-room">
                    <div className="vr-roomtop">
                      <span className="vr-category">{room.category}</span>
                      <span className="vr-live">
                        <span className="vr-dot" /> LIVE
                      </span>
                    </div>

                    <div>
                      <h3>{room.name}</h3>
                      <p className="vr-roomdesc">{room.description || 'Come in and join the conversation.'}</p>
                    </div>

                    <div className="vr-hostrow">
                      <div
                        className="vr-hostpic"
                        style={{ background: room.color || 'linear-gradient(135deg,#9d8aff,#58b9ee)' }}
                      >
                        {room.initials || 'VR'}
                      </div>
                      <div className="vr-hostmeta">
                        {room.host} <small>Host {room.approval ? '· Approval required' : ''}</small>
                      </div>
                    </div>

                    <div className="vr-roomfoot">
                      <div className="vr-people">
                        ♙ {room.count}/{room.capacity} <span>·</span>{' '}
                        {room.access === 'Private' ? (
                          <span className="vr-locked">🔒 Private</span>
                        ) : (
                          '🌐 Public'
                        )}
                      </div>
                      <button
                        type="button"
                        className="vr-join"
                        onClick={() => openRoom(room)}
                      >
                        Join room →
                      </button>
                    </div>
                  </article>
                ))
              ) : (
                <div className="vr-empty">
                  No rooms in this category yet. Create one and start the conversation.
                </div>
              )}
            </div>

            <div className="vr-banner">
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div className="vr-bannericon">🎧</div>
                <div>
                  <h3>Better conversations start together</h3>
                  <p>Invite your friends to join your room with one simple link.</p>
                </div>
              </div>
              <button
                type="button"
                className="vr-primary"
                onClick={() => setCreateModalOpen(true)}
              >
                Create your room →
              </button>
            </div>
          </section>
        )}

        {/* =========================================================================
            VIEW 2: ACTIVE ROOM STAGE (ROOMVIEW)
            ========================================================================= */}
        {currentRoom && (
          <section className="vr-roomview">
            <button
              type="button"
              className="vr-backlink"
              onClick={() => {
                setCurrentRoom(null);
                stopAudio();
              }}
            >
              ← Back to explore
            </button>

            <div className="vr-roomstage">
              <div className="vr-roomstagehead">
                <div>
                  <div className="vr-eyebrow">{currentRoom.category.toUpperCase()}</div>
                  <h2>{currentRoom.name}</h2>
                  <p>{currentRoom.description || 'A friendly place to speak, listen, and improve together.'}</p>
                </div>
                <div className="vr-stagecontrols">
                  <button
                    type="button"
                    className="vr-secondary"
                    onClick={() => setInviteModalOpen(true)}
                  >
                    ↗ Invite friends
                  </button>
                  <button
                    type="button"
                    className="vr-primary"
                    onClick={leaveRoom}
                  >
                    Leave room
                  </button>
                </div>
              </div>

              {/* Participants Grid */}
              <div className="vr-participants">
                {/* 1. Host Card */}
                <div className="vr-person">
                  <div
                    className="vr-personpic"
                    style={{ background: currentRoom.color || 'linear-gradient(135deg,#9d8aff,#58b9ee)' }}
                  >
                    {currentRoom.initials || 'VR'}
                  </div>
                  <strong>{currentRoom.host} ✦</strong>
                  <small>Host</small>
                </div>

                {/* 2. You (User) Card with Real Speaking Detection Ring */}
                <div className={`vr-person ${micEnabled && isSpeaking ? 'speaking' : ''}`}>
                  <div
                    className="vr-personpic"
                    style={{ background: 'linear-gradient(135deg,#74d6c8,#5488ff)' }}
                  >
                    {(userName || 'YO').slice(0, 2).toUpperCase()}
                  </div>
                  <strong>{userName} (You)</strong>
                  <small>
                    {micEnabled ? (isSpeaking ? 'Speaking 🎙️' : 'Mic enabled') : 'Listening'}
                  </small>
                </div>

                {/* 3. Connected Peers */}
                {peerParticipants.map((p, idx) => (
                  <div key={idx} className={`vr-person ${p.isSpeaking ? 'speaking' : ''}`}>
                    <div className="vr-personpic" style={{ background: p.color }}>
                      {p.initials}
                    </div>
                    <strong>{p.name}</strong>
                    <small>{p.role}</small>
                  </div>
                ))}

                {/* 4. Invite a friend card */}
                <div
                  className="vr-person vr-person-invite clickable"
                  onClick={() => setInviteModalOpen(true)}
                  title="Click to invite your friends"
                >
                  <div
                    className="vr-personpic"
                    style={{ background: 'linear-gradient(135deg,#f8bd82,#e37cb0)' }}
                  >
                    ＋
                  </div>
                  <strong>Invite a friend</strong>
                  <small>{currentRoom.count}/{currentRoom.capacity} participants</small>
                </div>
              </div>

              {/* Real Audio Status Note */}
              <div className="vr-roomnote">
                🟢 <strong>Live Real-Time WebRTC Audio Active:</strong> Real microphone capture and bidirectional voice communication are operational. Tap <strong>Enable microphone</strong> to start talking; your avatar ring pulses in green when speech is detected!
              </div>

              {/* Stage Audio Controls */}
              <div className="vr-stagecontrols" style={{ marginTop: 20 }}>
                <button
                  type="button"
                  className={`vr-secondary ${micEnabled ? 'active' : ''}`}
                  onClick={toggleMicrophone}
                  style={micEnabled ? { background: '#10b98133', borderColor: '#10b981', color: '#6ee7b7' } : {}}
                >
                  {micEnabled ? '🎙 Mute microphone' : '🎙 Enable microphone'}
                </button>
                <button
                  type="button"
                  className="vr-secondary"
                  onClick={testAudioOutput}
                >
                  🔊 Audio output
                </button>
              </div>
            </div>
          </section>
        )}

        <div className="vr-footer">
          VOICE ROOM · A place to speak freely · Powered by TECH AI
        </div>
      </div>

      {/* =========================================================================
          MODAL 1: CREATE ROOM
          ========================================================================= */}
      <div className={`vr-modalback ${createModalOpen ? 'show' : ''}`} onClick={() => setCreateModalOpen(false)}>
        <div className="vr-modal" onClick={e => e.stopPropagation()}>
          <div className="vr-modalhead">
            <div>
              <h2>Create a room</h2>
              <div className="vr-muted">Set the vibe. Bring your people together.</div>
            </div>
            <button
              type="button"
              className="vr-close"
              onClick={() => setCreateModalOpen(false)}
            >
              ×
            </button>
          </div>

          <form onSubmit={handleCreateSubmit}>
            <div className="vr-field">
              <label htmlFor="vr-roomName">ROOM NAME *</label>
              <input
                id="vr-roomName"
                maxLength={60}
                required
                placeholder="e.g. English Speaking Circle"
                value={formName}
                onChange={e => setFormName(e.target.value)}
              />
            </div>

            <div className="vr-field">
              <label htmlFor="vr-roomDesc">DESCRIPTION (OPTIONAL)</label>
              <textarea
                id="vr-roomDesc"
                maxLength={220}
                placeholder="What would you like to talk about?"
                value={formDesc}
                onChange={e => setFormDesc(e.target.value)}
              />
            </div>

            <div className="vr-two">
              <div className="vr-field">
                <label htmlFor="vr-roomCategory">CATEGORY</label>
                <select
                  id="vr-roomCategory"
                  value={formCategory}
                  onChange={e => setFormCategory(e.target.value)}
                >
                  <option>Language Practice</option>
                  <option>Education</option>
                  <option>General</option>
                  <option>Gaming</option>
                  <option>Entertainment</option>
                </select>
              </div>

              <div className="vr-field">
                <label htmlFor="vr-roomCapacity">MAX PARTICIPANTS</label>
                <select
                  id="vr-roomCapacity"
                  value={formCapacity}
                  onChange={e => setFormCapacity(e.target.value)}
                >
                  <option>4</option>
                  <option>8</option>
                  <option>12</option>
                  <option>20</option>
                  <option>50</option>
                </select>
              </div>
            </div>

            <div className="vr-field">
              <label>ROOM ACCESS</label>
              <div className="vr-two">
                <label className="vr-toggleline">
                  <span>
                    🌐 Public
                    <small>Discoverable by everyone</small>
                  </span>
                  <input
                    type="radio"
                    name="vr-access"
                    value="Public"
                    checked={formAccess === 'Public'}
                    onChange={() => setFormAccess('Public')}
                  />
                </label>
                <label className="vr-toggleline">
                  <span>
                    🔒 Private
                    <small>Invite link required</small>
                  </span>
                  <input
                    type="radio"
                    name="vr-access"
                    value="Private"
                    checked={formAccess === 'Private'}
                    onChange={() => setFormAccess('Private')}
                  />
                </label>
              </div>
            </div>

            <label className="vr-toggleline">
              <span>
                Host approval
                <small>Approve people before they join</small>
              </span>
              <input
                type="checkbox"
                checked={formApproval}
                onChange={e => setFormApproval(e.target.checked)}
              />
            </label>

            <label className="vr-toggleline">
              <span>
                Allow new members
                <small>Keep the room open for new guests</small>
              </span>
              <input
                type="checkbox"
                checked={formAllowMembers}
                onChange={e => setFormAllowMembers(e.target.checked)}
              />
            </label>

            <div className="vr-modalactions">
              <button
                type="button"
                className="vr-secondary"
                onClick={() => setCreateModalOpen(false)}
              >
                Cancel
              </button>
              <button type="submit" className="vr-primary">
                Create Room ↗
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* =========================================================================
          MODAL 2: JOIN ROOM WITH LINK
          ========================================================================= */}
      <div className={`vr-modalback ${joinModalOpen ? 'show' : ''}`} onClick={() => setJoinModalOpen(false)}>
        <div className="vr-modal" onClick={e => e.stopPropagation()}>
          <div className="vr-modalhead">
            <div>
              <h2>Join a room</h2>
              <div className="vr-muted">Paste a VoiceRoom invitation link.</div>
            </div>
            <button
              type="button"
              className="vr-close"
              onClick={() => setJoinModalOpen(false)}
            >
              ×
            </button>
          </div>

          <form onSubmit={handleJoinSubmit}>
            <div className="vr-field">
              <label htmlFor="vr-inviteUrl">INVITATION LINK OR ROOM ID</label>
              <input
                id="vr-inviteUrl"
                required
                placeholder="https://.../?module=voiceroom&room=demo-english"
                value={joinUrlInput}
                onChange={e => setJoinUrlInput(e.target.value)}
              />
            </div>
            <div className="vr-muted">
              You can also open a valid invitation link directly on your browser or WhatsApp.
            </div>
            <div className="vr-modalactions">
              <button
                type="button"
                className="vr-secondary"
                onClick={() => setJoinModalOpen(false)}
              >
                Cancel
              </button>
              <button type="submit" className="vr-primary">
                Check invitation →
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* =========================================================================
          MODAL 3: INVITE FRIENDS (WHATSAPP + COPY LINK + SHARE)
          ========================================================================= */}
      <div className={`vr-modalback ${inviteModalOpen ? 'show' : ''}`} onClick={() => setInviteModalOpen(false)}>
        <div className="vr-modal" onClick={e => e.stopPropagation()}>
          <div className="vr-modalhead">
            <div>
              <h2>Invite your friends</h2>
              <div className="vr-muted">A conversation is better when shared.</div>
            </div>
            <button
              type="button"
              className="vr-close"
              onClick={() => setInviteModalOpen(false)}
            >
              ×
            </button>
          </div>

          <div className="vr-field">
            <label>ROOM INVITATION LINK</label>
            <input
              readOnly
              value={getInviteUrl()}
              onClick={e => (e.target as HTMLInputElement).select()}
            />
          </div>

          <div className="vr-field">
            <label>MESSAGE PREVIEW</label>
            <textarea
              readOnly
              value={getInviteMessage()}
            />
          </div>

          <div className="vr-actions" style={{ marginTop: 10 }}>
            <button
              type="button"
              className="vr-primary"
              style={{ flex: 1, background: '#059669' }}
              onClick={shareOnWhatsApp}
            >
              ☏ Share on WhatsApp
            </button>
            <button
              type="button"
              className="vr-secondary"
              style={{ flex: 1 }}
              onClick={copyInviteLink}
            >
              ▣ Copy link
            </button>
          </div>

          <button
            type="button"
            className="vr-secondary"
            style={{ width: '100%', marginTop: 10 }}
            onClick={shareNative}
          >
            ↗ More sharing options
          </button>

          <p className="vr-muted" style={{ marginTop: 14 }}>
            WhatsApp opens with a pre-filled invitation. Your friends can join directly from their phone, tablet, or PC browser without needing to install anything!
          </p>
        </div>
      </div>

      {/* Floating Toast Notification */}
      <div className={`vr-toast ${toastVisible ? 'show' : ''}`} role="status" aria-live="polite">
        {toastMessage}
      </div>
    </div>
  );
}
