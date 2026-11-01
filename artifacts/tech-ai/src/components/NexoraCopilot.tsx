import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles, Bot, MessageSquare, Send, X, Minus, RotateCcw,
  Mic, MicOff, Volume2, VolumeX, Copy, Check, ExternalLink,
  ChevronRight, Compass, ShieldCheck, Zap, Radio, BookOpen,
  Camera, Sigma, Brain, Activity, User, ArrowRight
} from 'lucide-react';

export interface NexoraCopilotProps {
  currentModule: string;
  onNavigate: (module: any) => void;
  userName?: string;
}

interface Message {
  id: string;
  sender: 'ai' | 'user';
  text: string;
  timestamp: string;
  navigateTo?: string;
  suggestedQuestions?: string[];
}

const MODULE_NAV_MAP: Record<string, { label: string; icon: any; desc: string }> = {
  home: { label: 'Dashboard', icon: Compass, desc: 'Your personal study desk & overview' },
  teacher: { label: 'AI Teacher', icon: BookOpen, desc: 'Upload study notes for voice & text explanations' },
  voice: { label: 'English Practice', icon: Mic, desc: 'Speaking practice with animated AI voice orb' },
  voiceroom: { label: 'Voice Rooms', icon: Radio, desc: 'Real-time multi-user voice rooms with WhatsApp sharing' },
  docs: { label: 'Smart Doc', icon: Camera, desc: 'Document capture, crop, rotate & compress' },
  equations: { label: 'Equation Graph', icon: Sigma, desc: 'Live 2D mathematical curve grapher' },
  quiz: { label: 'Auto Quiz', icon: Brain, desc: 'Worksheet practice & AI step-by-step solver' },
  progress: { label: 'Progress', icon: Activity, desc: 'Private record of study minutes & sessions' },
  profile: { label: 'Student Profile', icon: User, desc: 'Account details and preferences' },
};

export function NexoraCopilot({ currentModule, onNavigate, userName = 'Student' }: NexoraCopilotProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [voiceSpeechEnabled, setVoiceSpeechEnabled] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [voiceLang, setVoiceLang] = useState<'en-US' | 'hi-IN'>('en-US');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesis | null>(typeof window !== 'undefined' ? window.speechSynthesis : null);

  const [messages, setMessages] = useState<Message[]>(() => {
    try {
      const saved = localStorage.getItem('nexora_copilot_chat');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return [
      {
        id: 'msg-welcome',
        sender: 'ai',
        text: `Hi! I'm **Nexora AI Copilot**, your website-wide intelligent assistant. How can I help you today?\n\nI can help you navigate tools, practice speaking, join **Voice Rooms**, explain study notes, solve quizzes, or compress documents.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        suggestedQuestions: [
          '🎙️ Take me to Voice Rooms',
          '🗣️ How do I practice speaking with AI?',
          '📚 Open AI Teacher for my notes',
          '📄 Help me compress a document',
        ],
      },
    ];
  });

  // Save conversation history
  useEffect(() => {
    try {
      localStorage.setItem('nexora_copilot_chat', JSON.stringify(messages.slice(-20)));
    } catch {}
  }, [messages]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (isOpen && !isMinimized && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isTyping, isOpen, isMinimized]);

  // Voice speech synthesis
  const speakText = (text: string) => {
    if (!voiceSpeechEnabled || !synthRef.current) return;
    try {
      synthRef.current.cancel();
      // Remove markdown formatting before speaking
      const cleanText = text
        .replace(/\*\*(.*?)\*\*/g, '$1')
        .replace(/`([^`]+)`/g, '$1')
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
        .replace(/[#*_~]/g, '');

      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.lang = voiceLang;
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      synthRef.current.speak(utterance);
    } catch {}
  };

  const stopSpeaking = () => {
    if (synthRef.current) {
      synthRef.current.cancel();
    }
  };

  // Speech Recognition (Voice Input)
  const toggleVoiceInput = () => {
    if (isListening) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsListening(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Speech recognition is not supported in this browser. Please use Google Chrome or Edge.');
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = voiceLang;
      recognition.continuous = false;
      recognition.interimResults = true;

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        const transcript = Array.from(event.results)
          .map((r: any) => r[0].transcript)
          .join('');
        setInputText(transcript);
      };

      recognition.onerror = () => {
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch {
      setIsListening(false);
    }
  };

  // Send message to backend
  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text || isTyping) return;

    stopSpeaking();

    const userMsg: Message = {
      id: `msg-${Date.now()}`,
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setIsTyping(true);

    try {
      const res = await fetch('/api/copilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          currentModule,
          userName,
          language: voiceLang,
          history: messages.slice(-5).map(m => ({ sender: m.sender === 'user' ? 'user' : 'assistant', text: m.text })),
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          const aiMsg: Message = {
            id: `msg-${Date.now() + 1}`,
            sender: 'ai',
            text: data.reply,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            navigateTo: data.navigateTo,
            suggestedQuestions: data.suggestedQuestions,
          };

          setMessages(prev => [...prev, aiMsg]);
          speakText(data.reply);

          // If navigation command is detected, handle it
          if (data.navigateTo && data.navigateTo !== currentModule && MODULE_NAV_MAP[data.navigateTo]) {
            setTimeout(() => {
              onNavigate(data.navigateTo);
            }, 800);
          }
          setIsTyping(false);
          return;
        }
      }
      throw new Error('API failed');
    } catch {
      // Offline fallback response
      let fallbackText = `I'm here to help! You are currently on the **${MODULE_NAV_MAP[currentModule]?.label || 'Workspace'}** page.\n\nTell me where you want to go or what you'd like to practice, and I'll take you there!`;
      let navTarget: string | undefined;

      const lower = text.toLowerCase();
      if (/voice\s*room|stage|call/i.test(lower)) {
        fallbackText = `Sure! I am taking you to **Student Voice Rooms** where you can create or join live audio rooms with real microphones.`;
        navTarget = 'voiceroom';
      } else if (/teacher|notes|study/i.test(lower)) {
        fallbackText = `Opening **AI Teacher**! You can upload notes or PDFs to get spoken and written explanations.`;
        navTarget = 'teacher';
      } else if (/english|voice\s*practice|speaking|orb/i.test(lower)) {
        fallbackText = `Opening **English Practice & AI Voice Studio**! Talk with the animated AI orb to practice conversational speaking.`;
        navTarget = 'voice';
      } else if (/doc|scan|compress|pdf/i.test(lower)) {
        fallbackText = `Opening **Smart Doc**! Capture documents or compress PDFs to your desired size.`;
        navTarget = 'docs';
      } else if (/equation|graph|math/i.test(lower)) {
        fallbackText = `Opening **Equation Graph**! Plot 2D mathematical curves and find intersections.`;
        navTarget = 'equations';
      } else if (/quiz|test|solve/i.test(lower)) {
        fallbackText = `Opening **Auto Quiz**! Practice worksheet questions or use the step-by-step AI solver.`;
        navTarget = 'quiz';
      }

      const aiMsg: Message = {
        id: `msg-${Date.now() + 1}`,
        sender: 'ai',
        text: fallbackText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        navigateTo: navTarget,
        suggestedQuestions: [
          '🎙️ Open Voice Rooms',
          '📚 Open AI Teacher',
          '🗣️ Practice English',
        ],
      };

      setMessages(prev => [...prev, aiMsg]);
      speakText(fallbackText);

      if (navTarget && navTarget !== currentModule) {
        setTimeout(() => {
          onNavigate(navTarget);
        }, 800);
      }
    } finally {
      setIsTyping(false);
    }
  };

  const handleCopyMessage = (id: string, text: string) => {
    try {
      navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {}
  };

  const handleClearChat = () => {
    stopSpeaking();
    const initial: Message = {
      id: `msg-${Date.now()}`,
      sender: 'ai',
      text: `Chat cleared! How can I assist you right now?`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      suggestedQuestions: [
        '🎙️ Open Voice Rooms',
        '🗣️ Start Speaking Practice',
        '📖 Explain Study Material',
      ],
    };
    setMessages([initial]);
    localStorage.removeItem('nexora_copilot_chat');
  };

  const formatMessageText = (content: string) => {
    // Simple inline markdown parsing for bold, code, and bullet points
    const lines = content.split('\n');
    return lines.map((line, idx) => {
      let formatted = line;
      // Bold
      const parts = [];
      const boldRegex = /\*\*(.*?)\*\*/g;
      let lastIndex = 0;
      let match;

      while ((match = boldRegex.exec(line)) !== null) {
        if (match.index > lastIndex) {
          parts.push(line.substring(lastIndex, match.index));
        }
        parts.push(<strong key={`b-${match.index}`}>{match[1]}</strong>);
        lastIndex = match.index + match[0].length;
      }
      if (lastIndex < line.length) {
        parts.push(line.substring(lastIndex));
      }

      if (line.trim().startsWith('•') || line.trim().startsWith('-') || line.trim().startsWith('*')) {
        return (
          <li key={idx} className="copilot-bullet-item">
            {parts.length > 0 ? parts : line.replace(/^[-*•]\s*/, '')}
          </li>
        );
      }

      return (
        <p key={idx} className="copilot-line">
          {parts.length > 0 ? parts : formatted}
        </p>
      );
    });
  };

  return (
    <>
      {/* ─── 1. FLOATING PILL LAUNCHER BUTTON ─── */}
      {!isOpen && (
        <aside aria-label="Nexora AI Copilot" className="fixed bottom-6 right-6 z-[99999] pointer-events-auto">
          <button
            type="button"
            onClick={() => { setIsOpen(true); setIsMinimized(false); }}
            className="group relative flex items-center gap-3 px-5 py-3.5 rounded-full shadow-[0_8px_32px_rgba(0,180,255,0.4)] backdrop-blur-xl border border-cyan-400/40 bg-gradient-to-r from-slate-950/90 via-indigo-950/90 to-blue-950/90 hover:border-cyan-300 hover:shadow-[0_12px_40px_rgba(0,210,255,0.6)] hover:scale-105 active:scale-95 transition-all duration-300 cursor-pointer"
            aria-label="Open Nexora AI Copilot"
          >
            {/* Pulsing ring aura */}
            <span className="absolute -inset-1 rounded-full bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-600 opacity-40 blur-md group-hover:opacity-75 transition-opacity duration-500 animate-pulse" />

            {/* Glowing Icon */}
            <span className="relative flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-tr from-cyan-400 to-blue-600 shadow-[0_0_15px_rgba(56,189,248,0.8)] text-slate-950">
              <Sparkles size={18} className="animate-spin-slow" />
            </span>

            {/* Branding Text */}
            <div className="relative flex flex-col text-left">
              <span className="text-[10px] font-bold tracking-widest text-cyan-400 uppercase leading-none">
                AI ASSISTANT
              </span>
              <span className="text-sm font-extrabold tracking-tight text-white flex items-center gap-1.5 leading-tight">
                NEXORA AI <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400">COPILOT</span>
              </span>
            </div>

            {/* Online Status Dot */}
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400" />
            </span>
          </button>
        </aside>
      )}

      {/* ─── 2. COPILOT CHAT PANEL ─── */}
      {isOpen && (
        <aside
          aria-label="Nexora AI Copilot Chat Interface"
          className={`fixed bottom-6 right-6 z-[99999] pointer-events-auto transition-all duration-300 ${
            isMinimized
              ? 'w-80 h-16'
              : 'w-[92vw] max-w-[430px] h-[85vh] max-h-[640px]'
          } rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.7),0_0_40px_rgba(56,189,248,0.25)] border border-cyan-500/30 backdrop-blur-2xl bg-gradient-to-b from-slate-950/95 via-slate-900/95 to-slate-950/95 flex flex-col overflow-hidden text-slate-100 font-sans`}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3.5 border-b border-cyan-500/20 bg-gradient-to-r from-cyan-950/40 via-indigo-950/40 to-slate-950/40 select-none">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center text-white shadow-[0_0_12px_rgba(6,182,212,0.6)]">
                <Bot size={18} />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="text-sm font-bold tracking-tight text-white">NEXORA AI</h3>
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-400/30">
                    COPILOT
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Context: <b className="text-cyan-300">{MODULE_NAV_MAP[currentModule]?.label || 'Workspace'}</b></span>
                </div>
              </div>
            </div>

            {/* Header Control Buttons */}
            <div className="flex items-center gap-1 text-slate-400">
              <button
                type="button"
                onClick={() => setVoiceSpeechEnabled(!voiceSpeechEnabled)}
                className={`p-1.5 rounded-lg hover:text-white hover:bg-slate-800 transition-colors ${voiceSpeechEnabled ? 'text-cyan-400' : 'text-slate-500'}`}
                title={voiceSpeechEnabled ? 'Mute AI voice output' : 'Enable AI voice output'}
              >
                {voiceSpeechEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
              </button>

              <button
                type="button"
                onClick={handleClearChat}
                className="p-1.5 rounded-lg hover:text-white hover:bg-slate-800 transition-colors"
                title="Clear conversation"
              >
                <RotateCcw size={15} />
              </button>

              <button
                type="button"
                onClick={() => setIsMinimized(!isMinimized)}
                className="p-1.5 rounded-lg hover:text-white hover:bg-slate-800 transition-colors"
                title={isMinimized ? 'Expand' : 'Minimize'}
              >
                <Minus size={16} />
              </button>

              <button
                type="button"
                onClick={() => { setIsOpen(false); stopSpeaking(); }}
                className="p-1.5 rounded-lg hover:text-rose-400 hover:bg-slate-800 transition-colors"
                title="Close Copilot"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Minimized View */}
          {isMinimized ? (
            <div
              onClick={() => setIsMinimized(false)}
              className="flex-1 flex items-center justify-between px-4 cursor-pointer hover:bg-slate-900/50 transition-colors"
            >
              <span className="text-xs text-slate-300">Click to expand chat…</span>
              <span className="text-xs text-cyan-400 font-medium">Expand ↗</span>
            </div>
          ) : (
            <>
              {/* Messages Body */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-cyan-500/20 scrollbar-track-transparent">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex gap-2.5 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    {msg.sender === 'ai' && (
                      <div className="w-7 h-7 rounded-lg bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-300 shrink-0 mt-0.5">
                        <Sparkles size={14} />
                      </div>
                    )}

                    <div className={`max-w-[85%] flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}>
                      <div
                        className={`group relative px-4 py-3 rounded-2xl text-xs leading-relaxed shadow-sm ${
                          msg.sender === 'user'
                            ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-br-xs'
                            : 'bg-slate-900/80 border border-slate-800/80 text-slate-200 rounded-bl-xs'
                        }`}
                      >
                        {formatMessageText(msg.text)}

                        {/* Navigation pill if AI suggests navigating */}
                        {msg.navigateTo && MODULE_NAV_MAP[msg.navigateTo] && (
                          <div className="mt-3 pt-2.5 border-t border-slate-700/50">
                            <button
                              type="button"
                              onClick={() => onNavigate(msg.navigateTo)}
                              className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-gradient-to-r from-cyan-600/30 to-blue-600/30 border border-cyan-400/40 hover:border-cyan-300 hover:from-cyan-600/50 hover:to-blue-600/50 transition-all text-cyan-200 font-semibold group/btn"
                            >
                              <span className="flex items-center gap-2">
                                <ArrowRight size={14} className="text-cyan-400 group-hover/btn:translate-x-0.5 transition-transform" />
                                <span>Go to {MODULE_NAV_MAP[msg.navigateTo].label}</span>
                              </span>
                              <ExternalLink size={12} className="text-cyan-300/70" />
                            </button>
                          </div>
                        )}

                        {/* Copy message button */}
                        {msg.sender === 'ai' && (
                          <button
                            type="button"
                            onClick={() => handleCopyMessage(msg.id, msg.text)}
                            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1 rounded bg-slate-800/80 text-slate-400 hover:text-white transition-opacity"
                            title="Copy reply"
                          >
                            {copiedId === msg.id ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                          </button>
                        )}
                      </div>

                      <span className="text-[10px] text-slate-500 mt-1 px-1">
                        {msg.timestamp}
                      </span>
                    </div>
                  </div>
                ))}

                {/* Typing Indicator */}
                {isTyping && (
                  <div className="flex items-center gap-2 text-cyan-400 text-xs py-1">
                    <div className="w-6 h-6 rounded-lg bg-cyan-500/20 border border-cyan-400/30 flex items-center justify-center">
                      <Sparkles size={12} className="animate-spin-slow" />
                    </div>
                    <div className="flex items-center gap-1 bg-slate-900/80 px-3 py-2 rounded-full border border-slate-800">
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                      <span className="text-[11px] text-slate-400 ml-1">Nexora is thinking…</span>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Quick Suggestion Chips */}
              <div className="px-3 py-2 border-t border-slate-800/80 bg-slate-950/60 overflow-x-auto flex gap-1.5 no-scrollbar">
                {[
                  { label: '🎙️ Voice Rooms', target: 'voiceroom' },
                  { label: '🗣️ English Practice', target: 'voice' },
                  { label: '📚 AI Teacher', target: 'teacher' },
                  { label: '📄 Smart Doc', target: 'docs' },
                  { label: '🧮 Equations', target: 'equations' },
                  { label: '❓ Auto Quiz', target: 'quiz' },
                ].map(chip => (
                  <button
                    key={chip.target}
                    type="button"
                    onClick={() => handleSendMessage(`Take me to ${chip.label}`)}
                    className="shrink-0 text-[11px] px-2.5 py-1 rounded-full bg-slate-900 hover:bg-cyan-950/60 border border-slate-800 hover:border-cyan-400/40 text-slate-300 hover:text-cyan-200 transition-all cursor-pointer"
                  >
                    {chip.label}
                  </button>
                ))}
              </div>

              {/* Chat Input Bar */}
              <form
                onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }}
                className="p-3 border-t border-cyan-500/20 bg-gradient-to-b from-slate-950/90 to-slate-900/90 flex items-center gap-2"
              >
                {/* Voice Input Button */}
                <button
                  type="button"
                  onClick={toggleVoiceInput}
                  className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
                    isListening
                      ? 'bg-rose-500 text-white border-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.6)] animate-pulse'
                      : 'bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-cyan-300 border-slate-800'
                  }`}
                  title={isListening ? 'Listening… click to stop' : 'Speak your question (English / Hindi)'}
                >
                  {isListening ? <MicOff size={16} /> : <Mic size={16} />}
                </button>

                {/* Language Toggle for Voice */}
                <button
                  type="button"
                  onClick={() => setVoiceLang(voiceLang === 'en-US' ? 'hi-IN' : 'en-US')}
                  className="px-2 py-1 text-[10px] font-bold rounded-lg bg-slate-900 border border-slate-800 text-cyan-300 hover:border-cyan-400/40 transition-colors"
                  title="Toggle voice language"
                >
                  {voiceLang === 'en-US' ? 'EN' : 'HI'}
                </button>

                {/* Input Text Box */}
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder={isListening ? 'Listening to your voice…' : 'Ask Nexora AI anything…'}
                  className="flex-1 bg-slate-900/90 border border-slate-800 focus:border-cyan-400 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 outline-none transition-colors"
                />

                {/* Send Button */}
                <button
                  type="submit"
                  disabled={!inputText.trim() || isTyping}
                  className="p-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_0_15px_rgba(6,182,212,0.4)] transition-all cursor-pointer"
                  title="Send message"
                >
                  <Send size={15} />
                </button>
              </form>
            </>
          )}
        </aside>
      )}
    </>
  );
}
