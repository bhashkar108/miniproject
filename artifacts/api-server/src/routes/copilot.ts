import { Router, type IRouter } from "express";
import { generateText } from "../lib/gemini";
import { logger } from "../lib/logger";

const router: IRouter = Router();

interface CopilotRequestBody {
  message: string;
  currentModule?: string;
  userName?: string;
  history?: Array<{ sender: "user" | "assistant"; text: string }>;
  language?: string;
}

const MODULE_DESCRIPTIONS: Record<string, { title: string; route: string; description: string }> = {
  home: {
    title: "Student Workspace Dashboard",
    route: "home",
    description: "Overview of all study tools, personal study minutes, quiz scores, and recent activities.",
  },
  teacher: {
    title: "AI Teacher",
    route: "teacher",
    description: "Upload study materials (PDF, DOCX, TXT, images) to get interactive spoken or text explanations in 25+ languages, with continuous hands-free voice mode.",
  },
  voice: {
    title: "English Practice & AI Voice Studio",
    route: "voice",
    description: "Real-time AI voice conversation partner with animated orb, multi-language support (English, Hindi, Spanish, French, etc.), difficulty levels (Beginner, Intermediate, Advanced), and dynamic topic switching.",
  },
  voiceroom: {
    title: "Student Voice Rooms",
    route: "voiceroom",
    description: "Real-time group voice calling platform with WebRTC audio, unique WhatsApp invitation links, stage host controls, and live in-room text chat.",
  },
  docs: {
    title: "Smart Doc",
    route: "docs",
    description: "Document scanner and camera capture tool with 90° rotation, crop, target size compression, and format conversion (PDF, PNG, JPG).",
  },
  equations: {
    title: "Equation Graph",
    route: "equations",
    description: "Visual 2D mathematical function plotter with live intersection calculation and OCR to read equations from images/PDFs.",
  },
  quiz: {
    title: "Auto Quiz",
    route: "quiz",
    description: "Upload worksheets or import quiz links to practice interactive questions, chat with an AI step-by-step solver, or auto-solve to a target score.",
  },
  progress: {
    title: "Activity Progress",
    route: "progress",
    description: "Private timeline of study sessions, practice scores, and minutes spent learning.",
  },
  profile: {
    title: "Student Profile",
    route: "profile",
    description: "Manage student account details, profile photo, and local privacy preferences.",
  },
};

function detectNavigationIntent(message: string): string | undefined {
  const lower = message.toLowerCase();

  if (/(voice\s*room|audio\s*room|stage|mic\s*room|call\s*room|calling)/i.test(lower)) {
    return "voiceroom";
  }
  if (/(english\s*practice|voice\s*studio|voice\s*practice|speaking\s*practice|speak\s*with\s*ai|orb)/i.test(lower)) {
    return "voice";
  }
  if (/(ai\s*teacher|teacher|notes|study\s*material|explain\s*document|lesson)/i.test(lower)) {
    return "teacher";
  }
  if (/(smart\s*doc|document|camera|scan|compress\s*pdf|rotate|crop)/i.test(lower)) {
    return "docs";
  }
  if (/(equation|graph|plot|math\s*curve|function\s*graph|algebra)/i.test(lower)) {
    return "equations";
  }
  if (/(quiz|test|exam|worksheet|auto\s*solve|solve\s*questions)/i.test(lower)) {
    return "quiz";
  }
  if (/(progress|activity|stats|history|minutes\s*studied)/i.test(lower)) {
    return "progress";
  }
  if (/(profile|account|setting|settings|my\s*details|photo)/i.test(lower)) {
    return "profile";
  }
  if (/(dashboard|home|workspace|main\s*page|desk)/i.test(lower)) {
    return "home";
  }

  return undefined;
}

function getLocalFallbackResponse(
  message: string,
  currentModule: string = "home",
  userName: string = "Student",
  language: string = "en",
): { reply: string; navigateTo?: string } {
  const lower = message.toLowerCase();
  const navTarget = detectNavigationIntent(lower);
  const isHindi = language.startsWith("hi") || /[क-ह]/.test(message) || /(kaha|kaise|karo|batao|kholo|jaana|madad)/i.test(lower);

  if (navTarget) {
    const mod = MODULE_DESCRIPTIONS[navTarget];
    if (isHindi) {
      return {
        reply: `बिल्कुल! मैं आपको **${mod.title}** पर ले जा रहा हूँ।\n\n📌 **विवरण:** ${mod.description}\n\nआप नीचे दिए गए बटन पर क्लिक करके सीधे जा सकते हैं।`,
        navigateTo: navTarget,
      };
    }
    return {
      reply: `Sure! I'm guiding you to **${mod.title}**.\n\n📌 **Feature:** ${mod.description}\n\nClick the link or button below to jump straight there!`,
      navigateTo: navTarget,
    };
  }

  // General questions
  if (/(who\s*are\s*you|what\s*is\s*nexora|koun\s*ho)/i.test(lower)) {
    if (isHindi) {
      return {
        reply: `नमस्ते ${userName}! 👋 मैं **Nexora AI Copilot** हूँ—आपकी पूरी वेबसाइट का प्रीमियम AI असिस्टेंट। मैं आपको सभी टूल्स (AI Teacher, Voice Rooms, English Practice, Smart Doc, Equation Graph, Auto Quiz) का उपयोग करने और नेविगेट करने में मदद कर सकता हूँ। आप मुझसे कोई भी सवाल पूछ सकते हैं!`,
      };
    }
    return {
      reply: `Hi ${userName}! 👋 I am **Nexora AI Copilot**, your website-wide intelligent assistant. I can guide you through every study tool—from **Voice Rooms** and **English Practice** to **AI Teacher**, **Smart Doc**, **Equation Graph**, and **Auto Quiz**. Just tell me what you need!`,
    };
  }

  // Help with current module
  const currentModInfo = MODULE_DESCRIPTIONS[currentModule] || MODULE_DESCRIPTIONS.home;
  if (isHindi) {
    return {
      reply: `आप अभी **${currentModInfo.title}** पर हैं।\n\n💡 **यहाँ क्या कर सकते हैं:** ${currentModInfo.description}\n\nयदि आप किसी अन्य सेक्शन में जाना चाहते हैं या कोई मदद चाहिए, तो बस मुझे बताएं!`,
    };
  }

  return {
    reply: `You are currently on **${currentModInfo.title}**.\n\n💡 **What you can do here:** ${currentModInfo.description}\n\nFeel free to ask questions about this tool, or tell me where you'd like to navigate!`,
  };
}

router.post("/copilot", async (req, res): Promise<void> => {
  try {
    const {
      message = "",
      currentModule = "home",
      userName = "Student",
      history = [],
      language = "en",
    } = (req.body || {}) as CopilotRequestBody;

    const trimmedMsg = message.trim();
    if (!trimmedMsg) {
      res.status(400).json({ success: false, error: "Message cannot be empty" });
      return;
    }

    const detectedNav = detectNavigationIntent(trimmedMsg);

    // Build context-aware prompt for Gemini
    const systemPrompt = `
You are NEXORA AI COPILOT, a premium, intelligent, friendly, website-wide assistant for the Nexora / TECH AI Smart Way platform.
User's Name: ${userName}
User's Current Page/Module: "${currentModule}" (${MODULE_DESCRIPTIONS[currentModule]?.title || "Workspace"})
Target Language: ${language}

WEBSITE STRUCTURE & MODULES:
1. "home" - Student Workspace Dashboard (overview, study streak, quick launches)
2. "teacher" - AI Teacher (upload notes/PDF/images, spoken explanations in 25+ languages, continuous voice conversation)
3. "voice" - English Practice & AI Voice Studio (interactive voice orb, speech recognition, Beginner/Intermediate/Advanced levels, dynamic topic selection, suggested response lines)
4. "voiceroom" - Student Voice Rooms (create live audio rooms, share unique WhatsApp invite links, P2P/LiveKit real WebRTC voice, live text chat, host controls)
5. "docs" - Smart Doc (camera document capture, 90° rotation, crop, target KB compression, PDF/JPG/PNG exports)
6. "equations" - Equation Graph (2D live math graph, intercept detection, image equation OCR)
7. "quiz" - Auto Quiz (worksheet analysis, manual practice, AI step-by-step math/science tutor, auto-solve)
8. "progress" - Study activity progress timeline and records
9. "profile" - Student profile, avatar photo, account details

BEHAVIOR & GUIDELINES:
- Provide clear, helpful, encouraging answers.
- If the user asks how to do something, give specific step-by-step instructions based on the real website features.
- If the user wants to navigate to a page (e.g. "Take me to Voice Rooms", "Open dashboard", "Settings", "Mujhe voice room kholna hai"), clearly tell them you are navigating there and specify the target module.
- Understand English, Hindi, and Hinglish naturally. If the user writes in Hindi/Hinglish, reply politely in Hindi/Hinglish!
- Keep responses concise (2 to 4 sentences or formatted bullet points). Avoid fluff.
`.trim();

    const conversationHistoryText = history
      .slice(-6)
      .map((h) => `${h.sender === "user" ? "User" : "Nexora Copilot"}: ${h.text}`)
      .join("\n");

    const fullPrompt = `
${systemPrompt}

RECENT CONVERSATION:
${conversationHistoryText}

CURRENT USER MESSAGE:
"${trimmedMsg}"

REPLY AS NEXORA AI COPILOT:
`.trim();

    let reply = "";
    try {
      reply = await generateText(fullPrompt);
    } catch (apiErr) {
      logger.warn({ err: apiErr }, "Gemini generation failed for copilot, using fallback");
    }

    if (!reply || reply.length < 5) {
      const fallback = getLocalFallbackResponse(trimmedMsg, currentModule, userName, language);
      reply = fallback.reply;
    }

    // Suggested questions for next turns
    const suggestedQuestions = [
      "🎙️ Take me to Voice Rooms",
      "🗣️ How do I practice speaking with AI?",
      "📚 Explain my notes with AI Teacher",
      "📄 Help me compress a document",
    ];

    res.json({
      success: true,
      reply,
      navigateTo: detectedNav,
      suggestedQuestions,
    });
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : "Unknown error";
    logger.error({ err }, "Copilot endpoint error");
    res.status(500).json({ success: false, error: errorMsg });
  }
});

export default router;
