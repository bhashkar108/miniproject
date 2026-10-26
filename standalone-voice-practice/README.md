# TECH AI | Smart Way – AI Voice Practice

A modern, responsive AI English Speaking Practice website featuring a dynamic sky-blue voice visualizer orb and real-time interactive conversation studio.

## 🚀 Key Features

1. **Dual-Panel Responsive Layout:**
   - **Laptop & Desktop (Side by Side):** Voice Visualizer is situated on the **LEFT** and the Conversation Studio is on the **RIGHT**.
   - **Mobile / Tablet:** Smooth vertical stack with the visualizer on top and chat beneath it.
   - Zero horizontal overflow.

2. **Animated AI Sky Orb & Visualizer:**
   - Animated glowing cyan/sky-blue orb with particle clouds, atmospheric halo, and wave rings.
   - Animates actively while the AI or user is speaking or listening.
   - Synchronized audio equalizer bars.
   - Clear status indicators: *Ready*, *Listening to you…*, *Thinking & analyzing…*, *AI is speaking…*, and *Paused*.

3. **Audio & Voice Controls:**
   - **Start / Mic:** Browser Web Speech API (`SpeechRecognition`).
   - **Pause / Resume:** Temporarily pause voice playback and resume on demand.
   - **Stop Speech:** Immediately halts speech synthesis and recognition.
   - **Repeat:** Re-listen to the last sentence.
   - **Voice Speed:** Dynamic rate adjustment from `0.7×` to `1.3×`.
   - **Voice Selector:** Choose from your operating system's installed speech voices.

4. **3 Speaking Levels:**
   - 🌱 **Beginner:** Concise vocabulary, simple grammar, friendly guidance.
   - ✨ **Intermediate:** Balanced conversational speed and natural sentence structures.
   - 🚀 **Advanced:** Sophisticated phrasing, analytical questions, and professional vocabulary.

5. **Learning & Practice Tools:**
   - **Polite Grammar Correction:** Detects common errors (e.g. *“I am agree”* ➔ *“I agree”*, *“Myself …”* ➔ *“My name is …”*) and displays actionable tips.
   - **Hindi / Local Meaning:** Tap *“Translate / Explain”* to read clear explanations in Hindi or simple English.
   - **Suggested Responses:** One-click pronunciation practice and quick response loading.
   - **Favorites List:** Bookmark useful expressions and review them anytime.
   - **Topics:** Daily life, College & studies, Hobbies, Travel, Job interviews, Food, Technology & AI, Friendship.

## 📁 Project Structure

```
standalone-voice-practice/
├── index.html       # HTML structure
├── css/
│   └── style.css    # Premium dark theme & responsive layout
├── js/
│   └── app.js       # Web Speech & conversational engine
└── README.md        # Documentation
```

## 💻 How to Run Locally

Simply double-click or open `index.html` in any modern web browser (Google Chrome, Microsoft Edge, Safari, or Firefox). No build step or server required!
