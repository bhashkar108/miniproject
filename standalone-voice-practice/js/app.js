/**
 * TECH AI | Smart Way – AI Voice Practice
 * JavaScript Controller (Vanilla JS)
 */

(function () {
  'use strict';

  const $ = (id) => document.getElementById(id);

  // State
  let level = 'Beginner';
  let autoVoice = true;
  let listening = false;
  let micMode = false;
  let waitingForAI = false;
  let currentTopic = 'Daily life';
  let favorites = JSON.parse(localStorage.getItem('techai_favorites') || '[]');
  let speechRate = 1.0;
  let lastAIReply = "Hello! Welcome to your English practice session. Let's talk about your day. What do you usually like to do in your free time?";
  let currentQuestion = 'What do you usually like to do in your free time?';
  let isPaused = false;

  // Question Suggestions dictionary for different topics & levels
  const suggestions = {
    'free time': {
      Beginner: 'In my free time, I like playing cricket.',
      Intermediate: 'In my free time, I enjoy playing cricket with my friends because it keeps me active.',
      Advanced: 'During my leisure hours, I usually engage in cricket, which not only keeps me physically active but also hones my leadership skills.'
    },
    'subject': {
      Beginner: 'I like computer science.',
      Intermediate: 'My favourite subject is computer science because I love solving logical problems.',
      Advanced: 'I am passionate about computer science, especially software development and artificial intelligence.'
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
    'hobby': {
      Beginner: 'My hobby is reading books and listening to music.',
      Intermediate: 'In my spare time, I love reading self-improvement books and listening to melodic music.',
      Advanced: 'I dedicate my weekends to exploring technical literature and exploring innovative web technologies.'
    },
    'default': {
      Beginner: 'I like learning English every day.',
      Intermediate: 'I want to improve my spoken English so that I can communicate confidently in my career.',
      Advanced: 'Developing strong communication skills is essential for effective cross-cultural collaboration and career growth.'
    }
  };

  // Toast Notification
  function showToast(msg) {
    const t = $('toast');
    if (!t) return;
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(window.toastTimer);
    window.toastTimer = setTimeout(() => t.classList.remove('show'), 2400);
  }

  // Update Visualizer Orb State
  function setOrb(state, customCaption) {
    const wrap = $('orbWrap');
    const bars = $('audioBars');
    const orbState = $('orbState');
    const caption = $('orbCaption');

    if (!wrap) return;

    wrap.classList.remove('speaking', 'listening', 'thinking');
    if (bars) bars.classList.remove('active');

    if (state === 'speaking') {
      wrap.classList.add('speaking');
      if (bars) bars.classList.add('active');
      if (orbState) orbState.textContent = 'AI is speaking…';
    } else if (state === 'listening') {
      wrap.classList.add('listening');
      if (bars) bars.classList.add('active');
      if (orbState) orbState.textContent = 'Listening to you…';
    } else if (state === 'thinking') {
      wrap.classList.add('thinking');
      if (orbState) orbState.textContent = 'Thinking & analyzing…';
    } else if (state === 'paused') {
      if (orbState) orbState.textContent = 'Speech paused';
    } else if (state === 'stopped') {
      if (orbState) orbState.textContent = 'Speech stopped';
    } else {
      if (orbState) orbState.textContent = 'AI is ready';
    }

    const defaultCaptions = {
      speaking: 'Listen carefully, notice the pronunciation, then try repeating the sentence.',
      listening: 'Speak clearly into your microphone. Your words will appear in the chat.',
      thinking: 'Analyzing your response, grammar, and preparing the next question…',
      paused: 'Voice playback is paused. Click Resume to continue listening.',
      stopped: 'Voice playback stopped. Click Listen or send a message to continue.',
      idle: 'Tap the microphone or choose a reply to start your conversation practice.'
    };

    if (caption) {
      caption.textContent = customCaption || defaultCaptions[state] || defaultCaptions.idle;
    }
  }

  // Text to Speech
  function readText(text, afterCallback) {
    if (!('speechSynthesis' in window)) {
      showToast('Speech playback is not supported in this browser.');
      if (afterCallback) afterCallback();
      return;
    }

    window.speechSynthesis.cancel();
    isPaused = false;

    const utterance = new SpeechSynthesisUtterance(text);
    const langSelect = $('practiceLang');
    utterance.lang = langSelect ? langSelect.value : 'en-US';
    utterance.rate = speechRate;

    const voices = window.speechSynthesis.getVoices();
    const voiceSelect = $('voiceSelect');
    if (voiceSelect && voiceSelect.value !== 'default') {
      const chosen = voices[Number(voiceSelect.value)];
      if (chosen) utterance.voice = chosen;
    } else {
      const match = voices.find((v) => v.lang === utterance.lang) ||
                    voices.find((v) => v.lang.startsWith(utterance.lang.slice(0, 2)));
      if (match) utterance.voice = match;
    }

    utterance.onstart = () => {
      setOrb('speaking');
    };

    utterance.onend = () => {
      setOrb('idle');
      if (afterCallback) afterCallback();
    };

    utterance.onerror = (e) => {
      setOrb('idle', 'Speech playback encountered an issue.');
      if (afterCallback) afterCallback();
    };

    window.speechSynthesis.speak(utterance);
  }

  // Timestamp generator
  function getTimeString() {
    return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  // Add Message to Chat Panel
  function addMessage(who, text, correction) {
    const container = $('messages');
    if (!container) return;

    const msg = document.createElement('div');
    msg.className = `msg ${who}`;

    const sender = document.createElement('div');
    sender.className = 'sender';
    sender.textContent = `${who === 'ai' ? 'TECH AI Tutor' : 'You'} · ${getTimeString()}`;

    const bubble = document.createElement('div');
    bubble.className = 'bubble';

    if (correction) {
      const cBox = document.createElement('span');
      cBox.className = 'correction-badge';
      cBox.innerHTML = `💡 <b>Grammar Tip:</b> ${correction}`;
      bubble.appendChild(cBox);
    }

    const textNode = document.createElement('span');
    textNode.textContent = text;
    bubble.appendChild(textNode);

    const actions = document.createElement('div');
    actions.className = 'msg-actions';

    if (who === 'ai') {
      const readBtn = document.createElement('button');
      readBtn.className = 'mini-btn';
      readBtn.textContent = '🔊 Read';
      readBtn.onclick = () => readText(text);
      actions.appendChild(readBtn);

      const transBtn = document.createElement('button');
      transBtn.className = 'mini-btn';
      transBtn.textContent = '文 Translate';
      transBtn.onclick = () => explainInLanguage(text);
      actions.appendChild(transBtn);
    }

    const copyBtn = document.createElement('button');
    copyBtn.className = 'mini-btn';
    copyBtn.textContent = '▢ Copy';
    copyBtn.onclick = () => {
      if (navigator.clipboard) {
        navigator.clipboard.writeText(text).then(() => showToast('Copied to clipboard!'));
      } else {
        showToast('Clipboard not available');
      }
    };
    actions.appendChild(copyBtn);

    const favBtn = document.createElement('button');
    favBtn.className = 'mini-btn';
    favBtn.textContent = '▮ Favorite';
    favBtn.onclick = () => toggleFavorite(text);
    actions.appendChild(favBtn);

    msg.appendChild(sender);
    msg.appendChild(bubble);
    msg.appendChild(actions);

    container.appendChild(msg);
    container.scrollTop = container.scrollHeight;

    return msg;
  }

  // Favorite sentences manager
  function toggleFavorite(text) {
    const idx = favorites.indexOf(text);
    if (idx === -1) {
      favorites.push(text);
      showToast('Saved to favorite expressions! ⭐');
    } else {
      favorites.splice(idx, 1);
      showToast('Removed from favorites.');
    }
    localStorage.setItem('techai_favorites', JSON.stringify(favorites));
    updateFavoritesCount();
  }

  function updateFavoritesCount() {
    const el = $('favCount');
    if (el) el.textContent = favorites.length;
  }

  // Grammar & conversational intelligence
  function evaluateGrammar(raw) {
    const lower = raw.toLowerCase().trim();
    let correction = '';

    if (/\bi am agree\b/i.test(lower)) {
      correction = 'Say <b>“I agree”</b> instead of <i>“I am agree”</i>. In English, “agree” is already a verb.';
    } else if (/\bi likes\b/i.test(lower)) {
      correction = 'Use <b>“I like”</b> with the first person pronoun (e.g. “I like reading”, not “I likes”).';
    } else if (/\bmyself\s+[a-z]+/i.test(lower)) {
      correction = 'In English introductions, say <b>“My name is …”</b> or <b>“I am …”</b> instead of <i>“Myself …”</i>.';
    } else if (/\bhe go\b/i.test(lower)) {
      correction = 'With third-person singular (he/she/it), use <b>“goes”</b> (e.g. “He goes to college”).';
    } else if (/\bi have\s+\d+\s+years\b/i.test(lower)) {
      correction = 'For age, say <b>“I am … years old”</b> rather than “I have … years”.';
    } else if (/\bmore better\b/i.test(lower)) {
      correction = 'Use <b>“better”</b> or <b>“much better”</b> instead of <i>“more better”</i>.';
    }

    return correction;
  }

  // Dynamic reply generator based on selected speaking level and topic
  function generateReply(userText) {
    const t = userText.toLowerCase();

    if (/cricket|football|game|sport|play/.test(t)) {
      if (level === 'Beginner') {
        return "That sounds like a lot of fun! Who do you usually play sports with?";
      } else if (level === 'Intermediate') {
        return "Sports are wonderful for both fitness and teamwork. How often do you play, and what role do you enjoy most?";
      } else {
        return "Participating in sports is an outstanding way to cultivate resilience and strategic thinking. In your view, how does playing sports influence your daily focus and discipline?";
      }
    }

    if (/college|school|study|engineering|student|class/.test(t)) {
      if (level === 'Beginner') {
        return "Nice! Which subject or class do you enjoy the most in your studies?";
      } else if (level === 'Intermediate') {
        return "College life gives you so many opportunities. Which subject do you find most interesting, and how do you plan to use it?";
      } else {
        return "Balancing academic rigor with practical skill development is key for modern students. What specific academic project has challenged you the most this year?";
      }
    }

    if (/good|fine|great|happy|awesome|well/.test(t)) {
      if (level === 'Beginner') {
        return "I'm glad to hear that! What was the best part of your day?";
      } else if (level === 'Intermediate') {
        return "That's wonderful to hear! Can you tell me about one interesting thing that happened today?";
      } else {
        return "Positive momentum makes a significant difference in productivity. What key goal or milestone did you focus on today?";
      }
    }

    if (/tech|coding|programming|computer|ai/.test(t)) {
      if (level === 'Beginner') {
        return "Technology is so cool! What do you like making with computers?";
      } else if (level === 'Intermediate') {
        return "That's great! Working with technology opens up a lot of career paths. Which programming language or tool are you exploring currently?";
      } else {
        return "Artificial intelligence and modern software engineering are evolving at unprecedented speeds. How do you envision AI shaping your target industry over the next five years?";
      }
    }

    // Default response tailored to Level
    if (level === 'Beginner') {
      return "Good answer! 😊 Can you tell me a little bit more about that in one simple sentence?";
    } else if (level === 'Intermediate') {
      return "Thanks for sharing that! Could you elaborate further or give me a practical example from your experience?";
    } else {
      return "That is a well-articulated perspective. Could you expand on the underlying reasoning behind that point of view?";
    }
  }

  // Get Suggestion for Current Context
  function getSuggestion() {
    const q = currentQuestion.toLowerCase();
    for (const key of Object.keys(suggestions)) {
      if (key !== 'default' && q.includes(key)) {
        return suggestions[key][level] || suggestions[key].Beginner;
      }
    }
    return suggestions.default[level];
  }

  function updateSuggestionBox() {
    const el = $('suggestion');
    if (el) {
      el.textContent = `“${getSuggestion()}”`;
    }
  }

  // Send User Message
  function handleSendMessage(rawText) {
    const text = (rawText || '').trim();
    if (!text || waitingForAI) return;

    waitingForAI = true;

    // Stop recognition while AI prepares reply
    if (window.recognitionInstance && listening) {
      try { window.recognitionInstance.stop(); } catch (e) {}
    }

    // Check grammar
    const correction = evaluateGrammar(text);

    // Display user message
    addMessage('user', text, correction);

    const input = $('messageInput');
    if (input) input.value = '';

    const statusEl = $('chatStatus');
    if (statusEl) statusEl.textContent = 'AI is thinking…';
    setOrb('thinking');

    // Add typing indicator
    const typing = document.createElement('div');
    typing.className = 'msg ai';
    typing.innerHTML = '<div class="sender">TECH AI · typing</div><div class="bubble"><span class="typing-dots"><i></i><i></i><i></i></span></div>';
    $('messages').appendChild(typing);
    $('messages').scrollTop = $('messages').scrollHeight;

    // Simulate AI response with natural pause
    setTimeout(() => {
      typing.remove();
      const reply = generateReply(text);
      lastAIReply = reply;
      currentQuestion = reply;

      addMessage('ai', reply);
      updateSuggestionBox();

      if (statusEl) statusEl.textContent = 'Conversation active';
      waitingForAI = false;

      if (autoVoice) {
        readText(reply, () => {
          if (micMode && !waitingForAI) {
            startSpeechRecognition();
          }
        });
      } else {
        setOrb('idle');
        if (micMode && !waitingForAI) {
          startSpeechRecognition();
        }
      }
    }, 750);
  }

  // Web Speech Recognition (Mic Input)
  function startSpeechRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      showToast('Speech recognition is not supported in this browser. Please type your reply.');
      micMode = false;
      return;
    }

    if (!micMode || waitingForAI) return;

    try {
      const recognition = new SpeechRecognition();
      window.recognitionInstance = recognition;

      const langSelect = $('practiceLang');
      recognition.lang = langSelect ? langSelect.value : 'en-US';
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        listening = true;
        const micBtn = $('micBtn');
        if (micBtn) {
          micBtn.classList.add('listening');
          micBtn.textContent = '⏹';
        }
        const statusEl = $('chatStatus');
        if (statusEl) statusEl.textContent = 'Listening to you…';
        setOrb('listening');
      };

      recognition.onresult = (e) => {
        const transcript = e.results[0][0].transcript;
        waitingForAI = true;
        listening = false;
        handleSendMessage(transcript);
      };

      recognition.onerror = (e) => {
        if (e.error !== 'no-speech') {
          showToast(`Microphone error: ${e.error}. You can type your answer.`);
        }
      };

      recognition.onend = () => {
        listening = false;
        const micBtn = $('micBtn');
        if (micBtn && !micMode) {
          micBtn.classList.remove('listening');
          micBtn.textContent = '🎙️';
        }

        // Continuous loop if micMode is kept on
        if (micMode && !waitingForAI) {
          setTimeout(() => {
            if (micMode && !waitingForAI) startSpeechRecognition();
          }, 350);
        }
      };

      recognition.start();
    } catch (err) {
      setTimeout(() => {
        if (micMode && !waitingForAI) startSpeechRecognition();
      }, 500);
    }
  }

  // Toggle Microphone
  function toggleMicrophone() {
    if (micMode) {
      micMode = false;
      listening = false;
      if (window.recognitionInstance) {
        try { window.recognitionInstance.stop(); } catch (e) {}
      }
      const micBtn = $('micBtn');
      if (micBtn) {
        micBtn.classList.remove('listening');
        micBtn.textContent = '🎙️';
      }
      showToast('Microphone turned off.');
      setOrb('idle');
    } else {
      micMode = true;
      waitingForAI = false;
      const micBtn = $('micBtn');
      if (micBtn) {
        micBtn.textContent = '⏹';
      }
      showToast('Microphone active. Speak naturally; it pauses during AI replies.');
      startSpeechRecognition();
    }
  }

  // Explain in selected language (Hindi / English / etc.)
  function explainInLanguage(sentence) {
    const supportLang = $('supportLang') ? $('supportLang').value : 'hi';
    const explanations = {
      hi: `🇮🇳 हिंदी में अर्थ / व्याख्या:
"${sentence}"
यह वाक्य बातचीत को आगे बढ़ाने और अपने विचारों को स्पष्ट रूप से व्यक्त करने के लिए पूछा गया है। आप सरल वाक्यों में जवाब दे सकते हैं।`,
      en: `💡 Explanation & Meaning:
"${sentence}"
This question invites you to share your perspective. Feel free to respond with a simple, direct statement followed by an example.`,
      es: `🇪🇸 Explicación:
"${sentence}"
Esta pregunta te invita a compartir tu opinión o experiencia de forma natural.`,
      fr: `🇫🇷 Explication:
"${sentence}"
Cette question vous invite à vous exprimer simplement avec des exemples concrets.`
    };

    addMessage('ai', explanations[supportLang] || explanations.en);
    showToast('Explanation added to conversation.');
  }

  // Topic Switcher
  const topicsList = [
    'Daily life',
    'College & studies',
    'Hobbies & sports',
    'Travel & culture',
    'Job interviews',
    'Food & cooking',
    'Technology & AI',
    'Friendship & family'
  ];

  function openTopicPicker() {
    const modal = $('topicModal');
    if (!modal) return;
    const list = $('topicList');
    if (list) {
      list.innerHTML = '';
      topicsList.forEach((top) => {
        const item = document.createElement('div');
        item.className = 'modal-item';
        item.innerHTML = `<span><b>${top}</b> ${top === currentTopic ? '✓ (Current)' : ''}</span>`;
        const selectBtn = document.createElement('button');
        selectBtn.className = 'mini-btn';
        selectBtn.style.background = '#0284c7';
        selectBtn.style.color = '#fff';
        selectBtn.textContent = 'Select';
        selectBtn.onclick = () => {
          changeTopic(top);
          closeModals();
        };
        item.appendChild(selectBtn);
        list.appendChild(item);
      });
    }
    modal.classList.add('open');
  }

  function changeTopic(newTopic) {
    currentTopic = newTopic;
    const starterQuestions = {
      'Daily life': 'Let’s talk about daily life! What is your favorite time of the day and why?',
      'College & studies': 'Awesome, let’s focus on college & studies! What is your major, and what project are you working on?',
      'Hobbies & sports': 'Great choice! What hobby or sport brings you the most joy when you have free time?',
      'Travel & culture': 'Travel is exciting! If you could travel to any place in the world tomorrow, where would you go?',
      'Job interviews': 'Interview practice mode: Can you introduce yourself and tell me why you chose your field of study?',
      'Food & cooking': 'Food is a great topic! What is your all-time favorite meal, and can you cook it yourself?',
      'Technology & AI': 'Technology session started! In what ways do you use computers or smartphone apps to study better?',
      'Friendship & family': 'Let’s discuss friendship! What qualities do you value most in a close friend?'
    };

    const q = starterQuestions[newTopic] || `Let’s practice discussing ${newTopic}! What is your opinion on this topic?`;
    currentQuestion = q;
    lastAIReply = q;

    addMessage('ai', `🎯 Topic changed to: **${newTopic}**.\n\n${q}`);
    updateSuggestionBox();
    showToast(`Topic set to: ${newTopic}`);

    if (autoVoice) {
      readText(q);
    }
  }

  // Favorites Modal
  function openFavoritesModal() {
    const modal = $('favModal');
    if (!modal) return;
    const list = $('favList');
    if (list) {
      list.innerHTML = '';
      if (!favorites.length) {
        list.innerHTML = '<p style="color:#94a3b8;text-align:center;padding:20px;">No favorite sentences saved yet. Click “▮ Favorite” on any message to save it here!</p>';
      } else {
        favorites.forEach((fav, i) => {
          const item = document.createElement('div');
          item.className = 'modal-item';
          item.innerHTML = `<span>${i + 1}. ${fav}</span>`;

          const actions = document.createElement('div');
          actions.style.display = 'flex';
          actions.style.gap = '6px';

          const listenBtn = document.createElement('button');
          listenBtn.className = 'mini-btn';
          listenBtn.textContent = '🔊';
          listenBtn.title = 'Listen to sentence';
          listenBtn.onclick = () => readText(fav);

          const removeBtn = document.createElement('button');
          removeBtn.className = 'mini-btn';
          removeBtn.textContent = '✕';
          removeBtn.title = 'Remove';
          removeBtn.onclick = () => {
            toggleFavorite(fav);
            openFavoritesModal();
          };

          actions.appendChild(listenBtn);
          actions.appendChild(removeBtn);
          item.appendChild(actions);
          list.appendChild(item);
        });
      }
    }
    modal.classList.add('open');
  }

  function closeModals() {
    document.querySelectorAll('.modal-overlay').forEach((m) => m.classList.remove('open'));
  }

  // Voice Controls: Pause, Resume, Stop, Repeat
  function setupVoiceControls() {
    const stopBtn = $('stopBtn');
    if (stopBtn) {
      stopBtn.onclick = () => {
        if ('speechSynthesis' in window) window.speechSynthesis.cancel();
        micMode = false;
        waitingForAI = false;
        if (window.recognitionInstance && listening) {
          try { window.recognitionInstance.stop(); } catch (e) {}
          listening = false;
        }
        const micBtn = $('micBtn');
        if (micBtn) {
          micBtn.classList.remove('listening');
          micBtn.textContent = '🎙️';
        }
        setOrb('stopped');
        showToast('Playback and microphone stopped.');
      };
    }

    const pauseResumeBtn = $('pauseResumeBtn');
    if (pauseResumeBtn) {
      pauseResumeBtn.onclick = () => {
        if (!('speechSynthesis' in window)) return;
        if (window.speechSynthesis.speaking && !isPaused) {
          window.speechSynthesis.pause();
          isPaused = true;
          pauseResumeBtn.textContent = '▶ Resume';
          setOrb('paused');
          showToast('Voice paused.');
        } else if (isPaused) {
          window.speechSynthesis.resume();
          isPaused = false;
          pauseResumeBtn.textContent = '⏸ Pause';
          setOrb('speaking');
          showToast('Voice resumed.');
        } else {
          readText(lastAIReply);
        }
      };
    }

    const repeatBtn = $('repeatBtn');
    if (repeatBtn) {
      repeatBtn.onclick = () => {
        if (lastAIReply) {
          showToast('Repeating last AI response…');
          readText(lastAIReply);
        }
      };
    }

    const autoBtn = $('autoBtn');
    if (autoBtn) {
      autoBtn.onclick = () => {
        autoVoice = !autoVoice;
        autoBtn.textContent = autoVoice ? '◉ Voice: On' : '◯ Voice: Off';
        autoBtn.classList.toggle('active', autoVoice);
        if (!autoVoice && 'speechSynthesis' in window) {
          window.speechSynthesis.cancel();
        }
        showToast(autoVoice ? 'Spoken AI voice enabled' : 'Spoken AI voice muted');
      };
    }

    // Speaking speed
    const speedSlider = $('speedSlider');
    const speedVal = $('speedVal');
    if (speedSlider) {
      speedSlider.oninput = (e) => {
        speechRate = parseFloat(e.target.value);
        if (speedVal) speedVal.textContent = `${speechRate.toFixed(1)}×`;
      };
    }
  }

  // Load voices into voiceSelect
  function populateVoiceList() {
    if (!('speechSynthesis' in window)) return;
    const voices = window.speechSynthesis.getVoices();
    const sel = $('voiceSelect');
    if (!sel) return;

    const currentVal = sel.value;
    sel.innerHTML = '<option value="default">✨ Default voice</option>';

    voices.forEach((voice, index) => {
      const opt = document.createElement('option');
      opt.value = String(index);
      opt.textContent = `${voice.name} (${voice.lang})`;
      sel.appendChild(opt);
    });

    if (currentVal && [...sel.options].some((o) => o.value === currentVal)) {
      sel.value = currentVal;
    }
  }

  // Initialize
  function init() {
    // Level selection
    document.querySelectorAll('.level-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.level-btn').forEach((b) => b.classList.remove('selected'));
        btn.classList.add('selected');
        level = btn.dataset.level || 'Beginner';
        updateSuggestionBox();
        showToast(`${level} level active. Questions adjusted.`);
      });
    });

    // Suggestion Buttons
    const suggestReadBtn = $('suggestRead');
    if (suggestReadBtn) {
      suggestReadBtn.onclick = () => readText(getSuggestion());
    }

    const useSuggestionBtn = $('useSuggestion');
    if (useSuggestionBtn) {
      useSuggestionBtn.onclick = () => {
        const input = $('messageInput');
        if (input) {
          input.value = getSuggestion();
          input.focus();
        }
      };
    }

    // Send button & Enter key
    const sendBtn = $('sendBtn');
    const input = $('messageInput');
    if (sendBtn && input) {
      sendBtn.onclick = () => handleSendMessage(input.value);
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          handleSendMessage(input.value);
        }
      });
    }

    // Mic button
    const micBtn = $('micBtn');
    if (micBtn) {
      micBtn.onclick = toggleMicrophone;
    }

    // Top buttons
    if ($('topicBtn')) $('topicBtn').onclick = openTopicPicker;
    if ($('topicQuickBtn')) $('topicQuickBtn').onclick = openTopicPicker;

    if ($('translateBtn')) {
      $('translateBtn').onclick = () => explainInLanguage(lastAIReply);
    }
    if ($('translateQuickBtn')) {
      $('translateQuickBtn').onclick = () => explainInLanguage(lastAIReply);
    }

    if ($('favoritesBtn')) $('favoritesBtn').onclick = openFavoritesModal;
    if ($('favoriteViewPill')) $('favoriteViewPill').onclick = openFavoritesModal;

    if ($('newBtn')) {
      $('newBtn').onclick = () => {
        if (!confirm('Start a fresh practice session? Previous chat will be reset.')) return;
        const msgContainer = $('messages');
        if (msgContainer) msgContainer.innerHTML = '';
        lastAIReply = `Welcome back! Let’s practise talking about ${currentTopic}. How are you feeling right now?`;
        currentQuestion = lastAIReply;
        addMessage('ai', lastAIReply);
        updateSuggestionBox();
        setOrb('idle');
        const st = $('chatStatus');
        if (st) st.textContent = 'Ready to practise';
      };
    }

    // Close modals
    document.querySelectorAll('.modal-close-btn').forEach((btn) => {
      btn.onclick = closeModals;
    });

    document.querySelectorAll('.modal-overlay').forEach((overlay) => {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) closeModals();
      });
    });

    // Voices
    if ('speechSynthesis' in window) {
      populateVoiceList();
      window.speechSynthesis.onvoiceschanged = populateVoiceList;
    }

    setupVoiceControls();
    updateFavoritesCount();
    updateSuggestionBox();
  }

  // Run on DOM loaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
