import React, { useState, useEffect, useRef } from 'react';
import {
  Mic, MicOff, Volume2, Globe, Sparkles, Check, Copy, Bookmark, BookmarkCheck,
  RotateCcw, Download, Play, Pause, Square, Repeat, MessageSquare, ArrowRight, X
} from 'lucide-react';

interface VoicePracticeProps {
  onProgress?: (kind: 'lesson' | 'document' | 'form' | 'quiz' | 'equation', title: string, details: string) => void;
}

interface MessageItem {
  id: string;
  sender: 'ai' | 'user';
  text: string;
  correction?: string;
  time: string;
}

export function VoicePractice({ onProgress }: VoicePracticeProps) {
  // State
  const [level, setLevel] = useState<'Beginner' | 'Intermediate' | 'Advanced'>('Beginner');
  const [autoVoice, setAutoVoice] = useState(true);
  const [listening, setListening] = useState(false);
  const [micMode, setMicMode] = useState(false);
  const [orbState, setOrbState] = useState<'idle' | 'speaking' | 'listening' | 'thinking' | 'paused' | 'stopped'>('idle');
  const [orbCaption, setOrbCaption] = useState('Tap the microphone or choose a reply to start practising.');
  const [currentTopic, setCurrentTopic] = useState('Daily life');
  const [speechRate, setSpeechRate] = useState(1.0);
  const [practiceLang, setPracticeLang] = useState('en-US');
  const [supportLang, setSupportLang] = useState('hi');
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState('default');
  const [isPaused, setIsPaused] = useState(false);
  const [inputVal, setInputVal] = useState('');
  const [favorites, setFavorites] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('techai_favorites') || '[]');
    } catch {
      return [];
    }
  });

  const [favModalOpen, setFavModalOpen] = useState(false);
  const [topicModalOpen, setTopicModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const [messages, setMessages] = useState<MessageItem[]>([
    {
      id: 'm1',
      sender: 'ai',
      text: "Hello! 👋 Welcome to your English speaking practice session. Let's talk about your daily life.\n\nQuestion: What do you usually like to do in your free time?",
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const [currentQuestion, setCurrentQuestion] = useState('What do you usually like to do in your free time?');
  const [lastAIReply, setLastAIReply] = useState("What do you usually like to do in your free time?");

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const toastTimerRef = useRef<any>(null);

  // Suggestions Dictionary
  const suggestions: Record<string, Record<'Beginner' | 'Intermediate' | 'Advanced', string>> = {
    'free time': {
      Beginner: 'In my free time, I like playing cricket.',
      Intermediate: 'In my free time, I enjoy playing cricket with my friends because it keeps me active.',
      Advanced: 'During my leisure hours, I usually engage in cricket, which not only keeps me physically active but also hones my leadership skills.'
    },
    'subject': {
      Beginner: 'I like computer science.',
      Intermediate: 'My favourite subject is computer science because I love solving logical problems.',
      Advanced: 'I am passionate about computer science, especially software engineering and modern AI technologies.'
    },
    'college': {
      Beginner: 'I study engineering in college.',
      Intermediate: 'I am currently pursuing my degree in college and learning new technical skills.',
      Advanced: 'I am an undergraduate student focused on mastering core engineering principles while building practical applications.'
    },
    'day': {
      Beginner: 'My day was really good.',
      Intermediate: 'My day was quite productive because I attended my classes and completed my assignments.',
      Advanced: 'It was a fulfilling day; I managed to balance my academic schedule with some personal project development.'
    },
    'default': {
      Beginner: 'I like learning English every day.',
      Intermediate: 'I want to improve my spoken English so that I can communicate confidently in my career.',
      Advanced: 'Developing strong communication skills is essential for effective cross-cultural collaboration and career growth.'
    }
  };

  const getSuggestion = () => {
    const q = currentQuestion.toLowerCase();
    for (const key of Object.keys(suggestions)) {
      if (key !== 'default' && q.includes(key)) {
        return suggestions[key][level];
      }
    }
    return suggestions.default[level];
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToastMessage(''), 2500);
  };

  // Populate Voices
  useEffect(() => {
    if (!('speechSynthesis' in window)) return;
    const updateVoices = () => {
      setVoices(window.speechSynthesis.getVoices());
    };
    updateVoices();
    window.speechSynthesis.onvoiceschanged = updateVoices;
    return () => {
      window.speechSynthesis.cancel();
    };
  }, []);

  // Scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Save favorites
  useEffect(() => {
    localStorage.setItem('techai_favorites', JSON.stringify(favorites));
  }, [favorites]);

  // Speech playback
  const readText = (text: string, onComplete?: () => void) => {
    if (!('speechSynthesis' in window)) {
      showToast('Speech playback is not supported in this browser.');
      onComplete?.();
      return;
    }

    window.speechSynthesis.cancel();
    setIsPaused(false);

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = practiceLang;
    utterance.rate = speechRate;

    if (selectedVoice !== 'default') {
      const v = voices[Number(selectedVoice)];
      if (v) utterance.voice = v;
    } else {
      const match = voices.find(v => v.lang === practiceLang) ||
                    voices.find(v => v.lang.startsWith(practiceLang.slice(0, 2)));
      if (match) utterance.voice = match;
    }

    utterance.onstart = () => {
      setOrbState('speaking');
      setOrbCaption('Listen carefully to pronunciation, then try repeating.');
    };

    utterance.onend = () => {
      setOrbState('idle');
      setOrbCaption('Tap the microphone or choose a reply to start practising.');
      onComplete?.();
    };

    utterance.onerror = () => {
      setOrbState('idle');
      setOrbCaption('Playback encountered an issue.');
      onComplete?.();
    };

    window.speechSynthesis.speak(utterance);
  };

  // Evaluate grammar mistakes politely
  const checkGrammar = (raw: string) => {
    const lower = raw.toLowerCase().trim();
    if (/\bi am agree\b/i.test(lower)) {
      return 'Say “I agree” instead of “I am agree”. In English, “agree” is already a verb.';
    }
    if (/\bi likes\b/i.test(lower)) {
      return 'Use “I like” with the first person (e.g. “I like reading”, not “I likes”).';
    }
    if (/\bmyself\s+[a-z]+/i.test(lower)) {
      return 'In English introductions, say “My name is …” or “I am …” instead of “Myself …”.';
    }
    if (/\bhe go\b/i.test(lower)) {
      return 'With third-person singular (he/she/it), use “goes” (e.g. “He goes to college”).';
    }
    if (/\bi have\s+\d+\s+years\b/i.test(lower)) {
      return 'For age, say “I am … years old” rather than “I have … years”.';
    }
    return '';
  };

  // Generate dynamic response
  const generateAIResponse = (userText: string) => {
    const t = userText.toLowerCase();

    if (/cricket|football|game|sport|play/.test(t)) {
      if (level === 'Beginner') return "That sounds like a lot of fun! Who do you usually play sports with?";
      if (level === 'Intermediate') return "Sports are wonderful for fitness and teamwork. How often do you play, and what role do you enjoy most?";
      return "Engaging in sports cultivates discipline and strategic thinking. In your view, how does playing sports influence your daily focus?";
    }

    if (/college|school|study|engineering|student|class/.test(t)) {
      if (level === 'Beginner') return "Nice! Which subject or class do you enjoy the most in your studies?";
      if (level === 'Intermediate') return "College gives you great opportunities. Which subject do you find most interesting, and why?";
      return "Balancing academic rigor with practical skill development is key for modern students. What specific academic project has challenged you the most this year?";
    }

    if (/good|fine|great|happy|awesome|well/.test(t)) {
      if (level === 'Beginner') return "I'm glad to hear that! What was the best part of your day?";
      if (level === 'Intermediate') return "That's wonderful to hear! Can you tell me about one interesting thing that happened today?";
      return "Positive momentum makes a significant difference in productivity. What key goal or milestone did you focus on today?";
    }

    if (/tech|coding|programming|computer|ai/.test(t)) {
      if (level === 'Beginner') return "Technology is so cool! What do you like making with computers?";
      if (level === 'Intermediate') return "That's great! Working with technology opens up a lot of career paths. Which programming language or tool are you exploring currently?";
      return "Artificial intelligence and software engineering are evolving rapidly. How do you envision AI shaping your target industry over the next five years?";
    }

    if (level === 'Beginner') return "Good answer! 😊 Can you tell me a little bit more about that in one simple sentence?";
    if (level === 'Intermediate') return "Thanks for sharing that! Could you elaborate further or give me a practical example from your experience?";
    return "That is a well-articulated perspective. Could you expand on the underlying reasoning behind that point of view?";
  };

  // Send message
  const handleSend = (textToSend?: string) => {
    const text = (textToSend || inputVal).trim();
    if (!text || orbState === 'thinking') return;

    if (recognitionRef.current && listening) {
      try { recognitionRef.current.stop(); } catch {}
    }

    const correction = checkGrammar(text);

    const userMsg: MessageItem = {
      id: `u-${Date.now()}`,
      sender: 'user',
      text,
      correction: correction || undefined,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages(prev => [...prev, userMsg]);
    setInputVal('');
    setOrbState('thinking');
    setOrbCaption('Analyzing your reply and preparing the next question…');

    setTimeout(() => {
      const reply = generateAIResponse(text);
      setLastAIReply(reply);
      setCurrentQuestion(reply);

      const aiMsg: MessageItem = {
        id: `ai-${Date.now()}`,
        sender: 'ai',
        text: reply,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages(prev => [...prev, aiMsg]);

      if (autoVoice) {
        readText(reply, () => {
          if (micMode) startListening();
        });
      } else {
        setOrbState('idle');
        setOrbCaption('Tap the microphone or choose a reply to start practising.');
        if (micMode) startListening();
      }

      onProgress?.('lesson', 'Voice Practice', `Practised speaking: "${text.slice(0, 30)}…"`);
    }, 700);
  };

  // Start microphone recognition
  const startListening = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      showToast('Speech recognition is not supported in this browser. Please type.');
      setMicMode(false);
      return;
    }

    try {
      const rec = new SpeechRecognition();
      recognitionRef.current = rec;
      rec.lang = practiceLang;
      rec.interimResults = false;
      rec.maxAlternatives = 1;

      rec.onstart = () => {
        setListening(true);
        setOrbState('listening');
        setOrbCaption('Listening to you… Speak clearly.');
      };

      rec.onresult = (e: any) => {
        const transcript = e.results[0][0].transcript;
        setListening(false);
        handleSend(transcript);
      };

      rec.onerror = (e: any) => {
        if (e.error !== 'no-speech') {
          showToast(`Microphone error: ${e.error}`);
        }
      };

      rec.onend = () => {
        setListening(false);
        if (micMode && orbState !== 'thinking' && orbState !== 'speaking') {
          setTimeout(() => {
            if (micMode) startListening();
          }, 350);
        }
      };

      rec.start();
    } catch {
      setTimeout(() => {
        if (micMode) startListening();
      }, 500);
    }
  };

  // Toggle mic mode
  const toggleMic = () => {
    if (micMode) {
      setMicMode(false);
      setListening(false);
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch {}
      }
      setOrbState('idle');
      showToast('Continuous microphone turned off.');
    } else {
      setMicMode(true);
      showToast('Microphone on. Speak naturally; it pauses during AI replies.');
      startListening();
    }
  };

  // Explain in selected language
  const explainInLanguage = (sentence: string) => {
    const explanations: Record<string, string> = {
      hi: `🇮🇳 हिंदी में अर्थ / व्याख्या:
"${sentence}"
यह सवाल आपसे आपके विचारों या अनुभवों को शेयर करने के लिए पूछा गया है। आप सरल और पूरे वाक्यों में जवाब दे सकते हैं।`,
      en: `💡 Explanation:
"${sentence}"
This question invites you to share your thoughts. Try responding in 1 or 2 complete sentences with an example.`,
      es: `🇪🇸 Explicación:
"${sentence}"
Esta pregunta te invita a compartir tus ideas.`,
      fr: `🇫🇷 Explication:
"${sentence}"
Cette question vous invite à vous exprimer simplement.`,
    };

    const expText = explanations[supportLang] || explanations.en;
    setMessages(prev => [
      ...prev,
      {
        id: `ai-exp-${Date.now()}`,
        sender: 'ai',
        text: expText,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
    showToast('Hindi / Language explanation added to chat.');
  };

  // Toggle favorite sentence
  const toggleFavorite = (text: string) => {
    if (favorites.includes(text)) {
      setFavorites(prev => prev.filter(f => f !== text));
      showToast('Removed from favorites.');
    } else {
      setFavorites(prev => [...prev, text]);
      showToast('Saved to favorite expressions! ⭐');
    }
  };

  // Change Topic
  const topicsList = [
    'Daily life', 'College & studies', 'Hobbies & sports', 'Travel & culture',
    'Job interviews', 'Food & cooking', 'Technology & AI', 'Friendship & family'
  ];

  const handleSelectTopic = (top: string) => {
    setCurrentTopic(top);
    setTopicModalOpen(false);

    const starters: Record<string, string> = {
      'Daily life': 'Let’s talk about daily life! What is your favorite time of the day and why?',
      'College & studies': 'Awesome, let’s focus on college & studies! What is your major, and what project are you working on?',
      'Hobbies & sports': 'Great choice! What hobby or sport brings you the most joy when you have free time?',
      'Travel & culture': 'Travel is exciting! If you could travel to any place in the world tomorrow, where would you go?',
      'Job interviews': 'Interview practice mode: Can you introduce yourself and tell me why you chose your field of study?',
      'Food & cooking': 'Food is a great topic! What is your all-time favorite meal, and can you cook it yourself?',
      'Technology & AI': 'Technology session started! In what ways do you use computers or smartphone apps to study better?',
      'Friendship & family': 'Let’s discuss friendship! What qualities do you value most in a close friend?'
    };

    const q = starters[top] || `Let’s practice discussing ${top}! What is your opinion on this topic?`;
    setCurrentQuestion(q);
    setLastAIReply(q);

    setMessages(prev => [
      ...prev,
      {
        id: `ai-top-${Date.now()}`,
        sender: 'ai',
        text: `🎯 Topic changed to: ${top}.\n\n${q}`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);

    if (autoVoice) readText(q);
    showToast(`Topic set to: ${top}`);
  };

  // Voice Controls
  const handleStopSpeech = () => {
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    setMicMode(false);
    setListening(false);
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
    }
    setOrbState('stopped');
    setOrbCaption('Speech stopped. You can continue whenever you are ready.');
    showToast('Speech playback and microphone stopped.');
  };

  const handlePauseResume = () => {
    if (!('speechSynthesis' in window)) return;
    if (window.speechSynthesis.speaking && !isPaused) {
      window.speechSynthesis.pause();
      setIsPaused(true);
      setOrbState('paused');
      setOrbCaption('Voice paused. Click Resume to continue listening.');
      showToast('Voice paused.');
    } else if (isPaused) {
      window.speechSynthesis.resume();
      setIsPaused(false);
      setOrbState('speaking');
      setOrbCaption('Voice resumed.');
      showToast('Voice resumed.');
    } else {
      readText(lastAIReply);
    }
  };

  const handleRepeat = () => {
    if (lastAIReply) {
      showToast('Repeating last sentence…');
      readText(lastAIReply);
    }
  };

  const resetSession = () => {
    if (!confirm('Start a fresh practice session? Previous messages will be cleared.')) return;
    const starter = `Welcome back! Let’s practise talking about ${currentTopic}. How are you feeling right now?`;
    setCurrentQuestion(starter);
    setLastAIReply(starter);
    setMessages([
      {
        id: `m-init-${Date.now()}`,
        sender: 'ai',
        text: starter,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
    setOrbState('idle');
    setOrbCaption('Tap the microphone or choose a reply to start practising.');
    if (autoVoice) readText(starter);
  };

  return (
    <div className="voice-studio-container">
      {/* Top action toolbar */}
      <div className="voice-studio-topbar">
        <div className="voice-studio-badge">
          <span className="voice-pulse-dot" />
          <span>AI English Speaking Coach</span>
        </div>
        <div className="voice-studio-actions">
          <button type="button" className="pill-btn" onClick={() => setTopicModalOpen(true)}>
            ▦ Topics
          </button>
          <button type="button" className="pill-btn" onClick={() => explainInLanguage(lastAIReply)}>
            文 Hindi Meaning
          </button>
          <button type="button" className="pill-btn" onClick={() => setFavModalOpen(true)}>
            ▮ Favorites ({favorites.length})
          </button>
          <button type="button" className="pill-btn" onClick={resetSession}>
            ＋ New Session
          </button>
          <a
            href="/tech-ai-voice-practice.zip"
            download="TECH-AI-Voice-Practice.zip"
            className="pill-btn pill-btn-download"
            title="Download complete standalone HTML/CSS/JS source code in ZIP"
          >
            <Download size={14} /> Download Code (ZIP)
          </a>
        </div>
      </div>

      {/* Main Studio Dual-Panel Grid: LEFT = Visualizer, RIGHT = Conversation */}
      <div className="voice-studio-grid">
        {/* ============================================================== */}
        {/* LEFT PANEL: AI Voice Visualizer (Laptop / Desktop LEFT)          */}
        {/* ============================================================== */}
        <div className="panel voice-visualizer-card">
          <div className="visualizer-card-header">
            <div>
              <h3>AI Voice Visualizer</h3>
              <p className="sub">Your conversation, brought to life</p>
            </div>
            <select
              className="select-voice-dropdown"
              value={selectedVoice}
              onChange={(e) => setSelectedVoice(e.target.value)}
              aria-label="Select AI Voice"
            >
              <option value="default">✨ Default Voice</option>
              {voices.map((v, i) => (
                <option key={v.voiceURI || i} value={String(i)}>
                  {v.name} ({v.lang})
                </option>
              ))}
            </select>
          </div>

          {/* Animated Sky-Blue & Cyan AI Orb */}
          <div className={`orb-wrap ${orbState}`}>
            <div className="orb-halo" />
            <div className="orb-wave" />
            <div className="orb">
              <div className="cloud" />
              <div className="cloud two" />
              <div className="cloud three" />
              <div className="orb-ring" />
              <div className="orb-core">✦</div>
            </div>
          </div>

          {/* Equalizer Audio Waves */}
          <div className={`audio-bars ${orbState === 'speaking' || orbState === 'listening' ? 'active' : ''}`}>
            <span className="bar" />
            <span className="bar" />
            <span className="bar" />
            <span className="bar" />
            <span className="bar" />
            <span className="bar" />
            <span className="bar" />
          </div>

          {/* State & Dynamic Caption */}
          <div className="orb-state-text">
            {orbState === 'speaking' && 'AI is speaking…'}
            {orbState === 'listening' && 'Listening to you…'}
            {orbState === 'thinking' && 'Thinking & analyzing…'}
            {orbState === 'paused' && 'Speech paused'}
            {orbState === 'stopped' && 'Speech stopped'}
            {orbState === 'idle' && 'AI is ready'}
          </div>
          <p className="orb-caption-text">{orbCaption}</p>

          {/* Controls: Stop, Pause/Resume, Repeat, Voice Toggle */}
          <div className="voice-controls-grid">
            <button type="button" className="control-btn" onClick={handleStopSpeech} title="Stop voice speech">
              <Square size={13} /> Stop speech
            </button>
            <button type="button" className="control-btn" onClick={handlePauseResume} title="Pause or Resume voice">
              {isPaused ? <Play size={13} /> : <Pause size={13} />} {isPaused ? 'Resume' : 'Pause'}
            </button>
            <button type="button" className="control-btn" onClick={handleRepeat} title="Repeat sentence">
              <Repeat size={13} /> Repeat
            </button>
            <button
              type="button"
              className={`control-btn ${autoVoice ? 'active' : ''}`}
              onClick={() => {
                setAutoVoice(v => !v);
                if (autoVoice && 'speechSynthesis' in window) window.speechSynthesis.cancel();
                showToast(!autoVoice ? 'Spoken AI voice enabled' : 'Spoken AI voice muted');
              }}
            >
              <Volume2 size={13} /> {autoVoice ? 'Voice: On' : 'Voice: Off'}
            </button>
          </div>

          {/* Speed & Language Settings Box */}
          <div className="voice-settings-box">
            <div className="settings-field">
              <label className="settings-field-label">
                <span>Speaking Speed</span>
                <b>{speechRate.toFixed(1)}×</b>
              </label>
              <input
                type="range"
                min="0.7"
                max="1.3"
                step="0.1"
                value={speechRate}
                onChange={(e) => setSpeechRate(parseFloat(e.target.value))}
                className="voice-speed-slider"
              />
            </div>

            <div className="settings-field">
              <label className="settings-field-label">Practice Language / Accent</label>
              <select
                className="select-voice-dropdown full-width"
                value={practiceLang}
                onChange={(e) => setPracticeLang(e.target.value)}
              >
                <option value="en-US">English (US)</option>
                <option value="en-GB">English (UK)</option>
                <option value="en-IN">English (India)</option>
                <option value="hi-IN">Hindi (हिंदी)</option>
                <option value="es-ES">Spanish</option>
                <option value="fr-FR">French</option>
                <option value="de-DE">German</option>
              </select>
            </div>

            <div className="settings-field">
              <label className="settings-field-label">Explanation Language</label>
              <select
                className="select-voice-dropdown full-width"
                value={supportLang}
                onChange={(e) => setSupportLang(e.target.value)}
              >
                <option value="hi">Explain in Hindi (हिंदी)</option>
                <option value="en">Explain in Simple English</option>
                <option value="es">Explain in Spanish</option>
                <option value="fr">Explain in French</option>
              </select>
            </div>
          </div>

          <small className="visualizer-footnote">
            Uses browser Web Speech API. Microphone audio stays strictly private on your device.
          </small>
        </div>

        {/* ============================================================== */}
        {/* RIGHT PANEL: Conversation Studio (Laptop / Desktop RIGHT)       */}
        {/* ============================================================== */}
        <div className="panel voice-chat-card">
          <div className="chat-card-header">
            <div>
              <h3>Conversation Studio</h3>
              <p className="sub">Practise speaking with your AI tutor</p>
            </div>
            <div className="chat-status-pill">
              <span className={`status-dot ${orbState === 'listening' ? 'dot-red' : ''}`} />
              <span>
                {orbState === 'listening'
                  ? 'Listening…'
                  : orbState === 'speaking'
                  ? 'AI Speaking…'
                  : orbState === 'thinking'
                  ? 'AI Thinking…'
                  : 'Ready to practise'}
              </span>
            </div>
          </div>

          {/* Quick Toolbar */}
          <div className="chat-toolbar">
            <button type="button" className="toolbar-btn" onClick={() => setTopicModalOpen(true)}>
              <span>▦</span> Topic: <b>{currentTopic}</b>
            </button>
            <button type="button" className="toolbar-btn" onClick={() => explainInLanguage(lastAIReply)}>
              <span>文</span> Hindi Meaning
            </button>
            <button type="button" className="toolbar-btn" onClick={() => setFavModalOpen(true)}>
              <span>▮</span> Favorites ({favorites.length})
            </button>
          </div>

          {/* Chat Messages */}
          <div className="chat-messages-container" aria-live="polite">
            {messages.map((m) => (
              <div key={m.id} className={`chat-bubble-wrap ${m.sender}`}>
                <span className="chat-bubble-sender">
                  {m.sender === 'ai' ? 'TECH AI Tutor' : 'You'} · {m.time}
                </span>
                <div className={`chat-bubble ${m.sender}`}>
                  {m.correction && (
                    <div className="grammar-correction-tip">
                      💡 <b>Grammar Tip:</b> {m.correction}
                    </div>
                  )}
                  <span>{m.text}</span>
                </div>
                <div className="chat-bubble-actions">
                  {m.sender === 'ai' && (
                    <>
                      <button type="button" className="action-pill-mini" onClick={() => readText(m.text)}>
                        🔊 Read
                      </button>
                      <button type="button" className="action-pill-mini" onClick={() => explainInLanguage(m.text)}>
                        文 Hindi
                      </button>
                    </>
                  )}
                  <button
                    type="button"
                    className="action-pill-mini"
                    onClick={() => {
                      navigator.clipboard?.writeText(m.text);
                      showToast('Copied to clipboard!');
                    }}
                  >
                    <Copy size={11} /> Copy
                  </button>
                  <button
                    type="button"
                    className="action-pill-mini"
                    onClick={() => toggleFavorite(m.text)}
                  >
                    {favorites.includes(m.text) ? <BookmarkCheck size={11} /> : <Bookmark size={11} />} Favorite
                  </button>
                </div>
              </div>
            ))}
            {orbState === 'thinking' && (
              <div className="chat-bubble-wrap ai">
                <span className="chat-bubble-sender">TECH AI · thinking</span>
                <div className="chat-bubble ai">
                  <span className="typing-dots">
                    <i /><i /><i />
                  </span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Interactive Composer */}
          <div className="chat-composer-section">
            <span className="level-select-label">Choose speaking level:</span>
            <div className="level-selector-row">
              <button
                type="button"
                className={`level-btn ${level === 'Beginner' ? 'active' : ''}`}
                onClick={() => setLevel('Beginner')}
              >
                <b>🌱 Beginner</b>
                <small>Simple & short</small>
              </button>
              <button
                type="button"
                className={`level-btn ${level === 'Intermediate' ? 'active' : ''}`}
                onClick={() => setLevel('Intermediate')}
              >
                <b>✨ Intermediate</b>
                <small>Natural sentences</small>
              </button>
              <button
                type="button"
                className={`level-btn ${level === 'Advanced' ? 'active' : ''}`}
                onClick={() => setLevel('Advanced')}
              >
                <b>🚀 Advanced</b>
                <small>Fluent & detailed</small>
              </button>
            </div>

            {/* Suggested Response Pill */}
            <div className="suggested-response-pill">
              <span className="suggested-text">“{getSuggestion()}”</span>
              <div className="suggested-actions">
                <button
                  type="button"
                  className="suggest-btn"
                  onClick={() => readText(getSuggestion())}
                  title="Listen to pronunciation"
                >
                  <Volume2 size={13} /> Listen
                </button>
                <button
                  type="button"
                  className="suggest-btn suggest-use-btn"
                  onClick={() => setInputVal(getSuggestion())}
                >
                  Use reply
                </button>
              </div>
            </div>

            {/* Send Row */}
            <div className="composer-send-row">
              <input
                type="text"
                className="composer-input"
                placeholder="Type your sentence or tap the mic to speak…"
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleSend();
                  }
                }}
              />
              <button
                type="button"
                className={`composer-mic-btn ${micMode ? 'active' : ''}`}
                onClick={toggleMic}
                title={micMode ? 'Turn off mic' : 'Turn on continuous mic'}
              >
                <Mic size={18} />
              </button>
              <button
                type="button"
                className="composer-send-btn"
                onClick={() => handleSend()}
                disabled={!inputVal.trim() && orbState === 'thinking'}
              >
                Send <ArrowRight size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Topic Picker Modal */}
      {topicModalOpen && (
        <div className="voice-modal-backdrop" onClick={() => setTopicModalOpen(false)}>
          <div className="voice-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="voice-modal-header">
              <h4>▦ Choose Conversation Topic</h4>
              <button type="button" className="close-btn" onClick={() => setTopicModalOpen(false)}>
                <X size={16} />
              </button>
            </div>
            <div className="voice-modal-list">
              {topicsList.map((top) => (
                <div key={top} className="voice-modal-item">
                  <span>
                    <b>{top}</b> {top === currentTopic ? '✓ (Current)' : ''}
                  </span>
                  <button type="button" className="select-topic-btn" onClick={() => handleSelectTopic(top)}>
                    Select
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Favorites Modal */}
      {favModalOpen && (
        <div className="voice-modal-backdrop" onClick={() => setFavModalOpen(false)}>
          <div className="voice-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="voice-modal-header">
              <h4>⭐ Saved Favorite Expressions</h4>
              <button type="button" className="close-btn" onClick={() => setFavModalOpen(false)}>
                <X size={16} />
              </button>
            </div>
            <div className="voice-modal-list">
              {favorites.length === 0 ? (
                <p className="empty-fav-note">No favorite sentences saved yet. Click “▮ Favorite” on any message!</p>
              ) : (
                favorites.map((fav, i) => (
                  <div key={i} className="voice-modal-item">
                    <span>{i + 1}. {fav}</span>
                    <div className="fav-item-actions">
                      <button type="button" className="mini-icon-btn" onClick={() => readText(fav)} title="Listen">
                        <Volume2 size={13} />
                      </button>
                      <button type="button" className="mini-icon-btn" onClick={() => toggleFavorite(fav)} title="Remove">
                        <X size={13} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div className="voice-toast-pill">
          {toastMessage}
        </div>
      )}
    </div>
  );
}
