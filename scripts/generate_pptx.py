"""
TECH AI | Smart Way — Premium 16:9 Widescreen PPTX Generator
Ultra-polished glassmorphism dark-theme deck with rich visual hierarchy.
"""
import os
from pptx import Presentation
from pptx.util import Inches, Pt, Emu
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.enum.shapes import MSO_SHAPE
from pptx.oxml.ns import qn

# ── Palette ──────────────────────────────────────────────
BG         = RGBColor(9, 13, 22)
BG2        = RGBColor(12, 17, 30)
CARD       = RGBColor(16, 23, 39)
CARD_LITE  = RGBColor(22, 30, 50)
SKY        = RGBColor(56, 189, 248)
CYAN       = RGBColor(34, 211, 238)
MINT       = RGBColor(52, 211, 153)
VIOLET     = RGBColor(139, 92, 246)
AMBER      = RGBColor(251, 191, 36)
ROSE       = RGBColor(251, 113, 133)
WHITE      = RGBColor(241, 245, 249)
MUTED      = RGBColor(148, 163, 184)
DIM        = RGBColor(100, 116, 139)
BORDER     = RGBColor(30, 41, 59)
DARK_CARD  = RGBColor(15, 23, 42)

W = Inches(13.333)
H = Inches(7.5)

def make_pptx(out):
    prs = Presentation()
    prs.slide_width = W
    prs.slide_height = H
    blank = prs.slide_layouts[6]

    # ── helpers ───────────────────────────────────────
    def bg(s):
        r = s.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, W, H)
        r.fill.solid(); r.fill.fore_color.rgb = BG; r.line.fill.background()
        # top-left glow blob
        g1 = s.shapes.add_shape(MSO_SHAPE.OVAL, Inches(-2), Inches(-2), Inches(7), Inches(7))
        g1.fill.solid(); g1.fill.fore_color.rgb = RGBColor(14, 30, 55); g1.line.fill.background()
        # bottom-right glow
        g2 = s.shapes.add_shape(MSO_SHAPE.OVAL, Inches(8), Inches(3), Inches(8), Inches(8))
        g2.fill.solid(); g2.fill.fore_color.rgb = RGBColor(12, 25, 48); g2.line.fill.background()

    def txt(s, x, y, w, h, text, sz=12, bold=False, color=WHITE, align=PP_ALIGN.LEFT, font="Segoe UI"):
        tb = s.shapes.add_textbox(x, y, w, h)
        tf = tb.text_frame; tf.word_wrap = True
        p = tf.paragraphs[0]; p.text = text
        p.font.size = Pt(sz); p.font.bold = bold; p.font.color.rgb = color
        p.font.name = font; p.alignment = align
        return tf

    def badge(s, x, y, label, accent=SKY):
        bw = Inches(2.6); bh = Inches(0.36)
        r = s.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, x, y, bw, bh)
        r.fill.solid(); r.fill.fore_color.rgb = DARK_CARD
        r.line.color.rgb = accent; r.line.width = Pt(1.2)
        tf = r.text_frame; tf.word_wrap = False
        p = tf.paragraphs[0]; p.text = label.upper()
        p.font.size = Pt(9.5); p.font.bold = True; p.font.color.rgb = accent
        p.font.name = "Segoe UI"; p.alignment = PP_ALIGN.CENTER

    def slide_num(s, num):
        txt(s, Inches(11.5), Inches(0.42), Inches(1.2), Inches(0.35),
            f"{num:02d} / 10", 11, True, DIM, PP_ALIGN.RIGHT)

    def heading(s, title, sub=""):
        txt(s, Inches(0.9), Inches(0.95), Inches(11.5), Inches(0.65),
            title, 28, True, WHITE, font="Segoe UI Semibold")
        if sub:
            txt(s, Inches(0.9), Inches(1.55), Inches(10.5), Inches(0.42),
                sub, 13.5, False, MUTED)

    def accent_line(s, x, y, w, color=SKY):
        ln = s.shapes.add_shape(MSO_SHAPE.RECTANGLE, x, y, w, Pt(3))
        ln.fill.solid(); ln.fill.fore_color.rgb = color; ln.line.fill.background()

    def card(s, x, y, w, h, icon, title, bullets, accent=SKY):
        # card background
        r = s.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, x, y, w, h)
        r.fill.solid(); r.fill.fore_color.rgb = CARD
        r.line.color.rgb = BORDER; r.line.width = Pt(1)
        # top accent strip
        accent_line(s, x + Inches(0.15), y + Inches(0.06), w - Inches(0.3), accent)
        # icon circle
        ic = Inches(0.48)
        circ = s.shapes.add_shape(MSO_SHAPE.OVAL, x + Inches(0.22), y + Inches(0.28), ic, ic)
        circ.fill.solid(); circ.fill.fore_color.rgb = DARK_CARD
        circ.line.color.rgb = accent; circ.line.width = Pt(1.5)
        tf_ic = circ.text_frame; p_ic = tf_ic.paragraphs[0]
        p_ic.text = icon; p_ic.font.size = Pt(16); p_ic.alignment = PP_ALIGN.CENTER
        # title
        txt(s, x + Inches(0.82), y + Inches(0.28), w - Inches(1.05), Inches(0.38),
            title, 15, True, WHITE)
        # bullets
        tb = s.shapes.add_textbox(x + Inches(0.25), y + Inches(0.85), w - Inches(0.5), h - Inches(1.0))
        tf = tb.text_frame; tf.word_wrap = True
        for i, b in enumerate(bullets):
            p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
            p.text = f"▸  {b}"
            p.font.size = Pt(11); p.font.color.rgb = RGBColor(203, 213, 225)
            p.font.name = "Segoe UI"; p.space_before = Pt(5)

    def pill(s, x, y, label, accent=SKY):
        pw = Inches(2.65); ph = Inches(0.58)
        r = s.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, x, y, pw, ph)
        r.fill.solid(); r.fill.fore_color.rgb = CARD
        r.line.color.rgb = accent; r.line.width = Pt(1)
        # dot
        d = s.shapes.add_shape(MSO_SHAPE.OVAL, x + Inches(0.15), y + Inches(0.2), Inches(0.18), Inches(0.18))
        d.fill.solid(); d.fill.fore_color.rgb = accent; d.line.fill.background()
        txt(s, x + Inches(0.42), y + Inches(0.1), pw - Inches(0.55), Inches(0.38),
            label, 11, True, WHITE, PP_ALIGN.LEFT)

    # ═══════════════════════════════════════════════════
    # SLIDE 01 — WELCOME HERO
    # ═══════════════════════════════════════════════════
    s = prs.slides.add_slide(blank); bg(s)

    # decorative badge
    badge(s, Inches(5.35), Inches(0.45), "✦  Project Showcase  ✦", SKY)

    # orb
    orb = s.shapes.add_shape(MSO_SHAPE.OVAL, Inches(5.65), Inches(1.15), Inches(2.0), Inches(2.0))
    orb.fill.solid(); orb.fill.fore_color.rgb = SKY
    orb.line.color.rgb = CYAN; orb.line.width = Pt(4)
    # inner orb highlight
    orb2 = s.shapes.add_shape(MSO_SHAPE.OVAL, Inches(6.0), Inches(1.45), Inches(1.3), Inches(1.3))
    orb2.fill.solid(); orb2.fill.fore_color.rgb = RGBColor(125, 211, 252)
    orb2.line.fill.background()

    # title
    txt(s, Inches(0.5), Inches(3.3), Inches(12.333), Inches(0.95),
        "TECH AI | SMART WAY", 48, True, WHITE, PP_ALIGN.CENTER, "Segoe UI Black")

    # subtitle
    txt(s, Inches(1.5), Inches(4.25), Inches(10.333), Inches(0.6),
        "Next-Generation AI Voice English Practice & Smart Student Workspace", 20, False, SKY, PP_ALIGN.CENTER)

    # accent line center
    accent_line(s, Inches(5.5), Inches(4.85), Inches(2.333), SKY)

    # 4 feature pills
    pills_data = [
        ("🎙️  AI Voice Practice Studio", SKY),
        ("💡  Grammar & Hindi Guidance", CYAN),
        ("📄  Smart Doc & Equation Graph", MINT),
        ("🎯  Auto Quiz & Analytics", AMBER),
    ]
    for i, (pl, ac) in enumerate(pills_data):
        pill(s, Inches(0.7) + i * Inches(3.05), Inches(5.15), pl, ac)

    # footer
    txt(s, Inches(0.5), Inches(6.5), Inches(12.333), Inches(0.4),
        "Presented by Tech AI Team  •  Modern Academic AI Solution  •  2026",
        11, False, DIM, PP_ALIGN.CENTER)

    # ═══════════════════════════════════════════════════
    # SLIDE 02 — PROBLEM STATEMENT
    # ═══════════════════════════════════════════════════
    s = prs.slides.add_slide(blank); bg(s)
    badge(s, Inches(0.9), Inches(0.42), "Problem Statement", ROSE)
    slide_num(s, 2)
    heading(s, "The Real Challenges Faced by Students Today",
            "Millions of students struggle with English anxiety, tool fragmentation, and privacy risks.")

    card(s, Inches(0.6), Inches(2.2), Inches(3.9), Inches(4.8),
         "🗣️", "English Speaking Anxiety", [
             "Fear of judgment when speaking in front of peers or interviewers",
             "Lack of accessible 1-on-1 conversational English partners",
             "Grammatical errors go uncorrected or create embarrassment",
             "Expensive spoken English coaching institutes out of reach",
             "Hesitation in campus placement vivas and group discussions"
         ], ROSE)

    card(s, Inches(4.7), Inches(2.2), Inches(3.9), Inches(4.8),
         "📚", "Scattered Academic Tools", [
             "Students juggle 4–5 different websites for notes, tests, and docs",
             "Generic chatbots hallucinate without student's syllabus context",
             "Static quiz PDFs without immediate automated scoring feedback",
             "Manual document compression often corrupts file quality",
             "No unified student desk connecting learning & practice tools"
         ], AMBER)

    card(s, Inches(8.8), Inches(2.2), Inches(3.9), Inches(4.8),
         "🔒", "Privacy & Accessibility Gaps", [
             "Sensitive IDs & marksheets uploaded to unknown third-party servers",
             "Zero native Hindi / regional language explanations available",
             "Rigid form templates that don't adapt to student's own material",
             "Poor mobile responsiveness on budget smartphones and slow internet",
             "Data leakage risk with cloud-based document processors"
         ], VIOLET)

    # ═══════════════════════════════════════════════════
    # SLIDE 03 — PROPOSED SOLUTION
    # ═══════════════════════════════════════════════════
    s = prs.slides.add_slide(blank); bg(s)
    badge(s, Inches(0.9), Inches(0.42), "Proposed Solution", MINT)
    slide_num(s, 3)
    heading(s, "TECH AI | Smart Way — The Unified Ecosystem",
            "A purpose-built, privacy-centric AI companion that transforms how students speak, study, and prepare.")

    card(s, Inches(0.6), Inches(2.2), Inches(5.85), Inches(4.8),
         "🎙️", "Interactive AI Voice Practice Studio", [
             "Animated Sky-Blue Orb on LEFT + Conversation Panel on RIGHT",
             "Real-Time browser speech recognition & expressive TTS synthesis",
             "3 Adaptive Levels: Beginner → Intermediate → Advanced difficulty",
             "Polite grammar corrections with improved sentence suggestions",
             "Instant Hindi / Hinglish explanations for complex English phrases",
             "8 practice topics: College, Interviews, Travel, Tech, Daily Life",
             "Favorites vault to save golden sentences and vocabulary"
         ], SKY)

    card(s, Inches(6.7), Inches(2.2), Inches(5.85), Inches(4.8),
         "⚡", "Complete Academic Toolkit", [
             "AI Teacher — Grounded lessons from your own PDF / DOCX / images",
             "Voice Questions — Speak doubts, AI responds with adjustable pace",
             "Smart Doc — Camera scanner, rotate, crop, and KB-precise compressor",
             "Equation Grapher — Interactive 2D curve plotter with OCR import",
             "Auto Quiz — Past papers → interactive MCQ tests + auto-solver",
             "Streamlined Profile — Only 8 essential student fields, zero clutter",
             "100% Client-Side Privacy — Sensitive files never leave your device"
         ], MINT)

    # ═══════════════════════════════════════════════════
    # SLIDE 04 — VOICE PRACTICE STUDIO
    # ═══════════════════════════════════════════════════
    s = prs.slides.add_slide(blank); bg(s)
    badge(s, Inches(0.9), Inches(0.42), "Flagship Feature", SKY)
    slide_num(s, 4)
    heading(s, "AI Voice Practice & English Studio",
            "Dual-column desktop layout: Animated Visualizer on LEFT, Conversation Studio on RIGHT.")

    # LEFT card — Visualizer
    card(s, Inches(0.6), Inches(2.2), Inches(5.2), Inches(4.8),
         "🔮", "Animated AI Voice Visualizer", [
             "Sky-Blue & Cyan voice orb pulsing dynamically during AI speech",
             "24-band real-time audio frequency equalizer bars animation",
             "6 Live States: Speaking • Listening • Thinking • Paused • Stopped • Idle",
             "Complete Controls: Start, Stop, Pause, Resume, Repeat buttons",
             "Speed slider: 0.7x to 1.4x speaking pace adjustment",
             "AI voice toggle & browser voice selection dropdown",
             "Independently scrollable with balanced column widths"
         ], CYAN)

    # Decorative mini orb inside left area
    mo = s.shapes.add_shape(MSO_SHAPE.OVAL, Inches(2.6), Inches(2.6), Inches(0.7), Inches(0.7))
    mo.fill.solid(); mo.fill.fore_color.rgb = SKY; mo.line.color.rgb = CYAN; mo.line.width = Pt(2)

    # RIGHT card — Conversation
    card(s, Inches(6.05), Inches(2.2), Inches(6.65), Inches(4.8),
         "💬", "Conversation Studio Features", [
             "Beginner: Simple sentences, gentle grammar hints, slow pace",
             "Intermediate: Natural conversational flow with common idioms",
             "Advanced: Complex structure, professional interview vocabulary",
             "Polite Corrections: Highlights mistakes with improved alternatives",
             "Hindi Explanations: Instant Hinglish tooltips for vocabulary gaps",
             "Favorites Vault: 1-click save for golden sentences & interview answers",
             "Auto-scroll chat bubbles with user/AI message differentiation",
             "Responsive: Stacks vertically on mobile without overflow"
         ], SKY)

    # ═══════════════════════════════════════════════════
    # SLIDE 05 — AI TEACHER
    # ═══════════════════════════════════════════════════
    s = prs.slides.add_slide(blank); bg(s)
    badge(s, Inches(0.9), Inches(0.42), "Study Companion", MINT)
    slide_num(s, 5)
    heading(s, "AI Teacher: Grounded Learning From Your Notes",
            "Upload lecture slides, notes, or textbook photos. Learn without AI hallucination or internet noise.")

    card(s, Inches(0.6), Inches(2.2), Inches(3.9), Inches(4.8),
         "📖", "Your Own Material", [
             "Accepts PDF, DOCX, TXT, Markdown, and scanned note images",
             "Extracts text cleanly for student review and direct editing",
             "Zero prefilled dummy data — strictly grounded in your syllabus",
             "One-click ingestion of Smart Doc processed copies",
             "Eliminates AI hallucination by anchoring to your uploaded content"
         ], MINT)

    card(s, Inches(4.7), Inches(2.2), Inches(3.9), Inches(4.8),
         "🎙️", "Voice Questions & Dictation", [
             "Speak your doubts aloud using browser speech recognition",
             "AI auto-processes question when speech ends naturally",
             "Synthesizes spoken lessons with custom pacing (0.5x – 1.5x)",
             "Key Takeaway cards: 'Keep these in mind' structured summaries",
             "Dynamic follow-up prompts suggesting deeper exploration paths"
         ], SKY)

    card(s, Inches(8.8), Inches(2.2), Inches(3.9), Inches(4.8),
         "🌐", "Multilingual Explanations", [
             "Understand complex concepts in your mother tongue",
             "Supports: English, Hindi, Hinglish, Bengali, Tamil, Telugu, etc.",
             "12+ UI language options with high-contrast dark mode dropdown",
             "Instant concept clarity without language barriers",
             "Private session: notes and answers stay inside your workspace"
         ], VIOLET)

    # ═══════════════════════════════════════════════════
    # SLIDE 06 — SMART DOC & EQUATION
    # ═══════════════════════════════════════════════════
    s = prs.slides.add_slide(blank); bg(s)
    badge(s, Inches(0.9), Inches(0.42), "Document & Math Tools", CYAN)
    slide_num(s, 6)
    heading(s, "Smart Doc Studio & Equation Grapher",
            "100% in-browser document manipulation and interactive mathematical curve exploration.")

    card(s, Inches(0.6), Inches(2.2), Inches(5.85), Inches(4.8),
         "📄", "Smart Doc: In-Browser Optimizer", [
             "Direct Camera Scanning: Full-screen viewfinder with capture flash",
             "Format Conversion: Export processed copy as PDF, PNG, or JPEG",
             "Persistent Adjustments: 90° step rotation & 4-sided edge crop",
             "Precise KB Target: Dial in exact file size limits for college portals",
             "Side-by-Side View: Compare original & processed with synced zoom",
             "Full-Screen Inspector: Detailed modal review with download button",
             "100% Privacy: Confidential docs never touch any external server"
         ], CYAN)

    card(s, Inches(6.7), Inches(2.2), Inches(5.85), Inches(4.8),
         "📈", "Equation Graph Visualizer", [
             "2D Interactive SVG plotting: linear, polynomial, trig & exponential",
             "Dual Curve Comparison: Graph two functions simultaneously",
             "Auto Intercepts: Computes axis roots and crossing points instantly",
             "Image OCR Import: Snap photo of handwritten equations to auto-plot",
             "Dynamic Domain Range: Adjust horizontal scale from –12 to +12",
             "Safe AST Parser: Restricted mathjs evaluation, no code injection risk",
             "Quick Chip Presets: sin(x), x², cos(x), sqrt(abs(x)) for fast access"
         ], VIOLET)

    # ═══════════════════════════════════════════════════
    # SLIDE 07 — AUTO QUIZ & ANALYTICS
    # ═══════════════════════════════════════════════════
    s = prs.slides.add_slide(blank); bg(s)
    badge(s, Inches(0.9), Inches(0.42), "Assessment & Analytics", AMBER)
    slide_num(s, 7)
    heading(s, "Auto Quiz Engine & Student Momentum",
            "Turn question papers into interactive gamified practice tests with target-score solvers.")

    card(s, Inches(0.6), Inches(2.2), Inches(3.9), Inches(4.8),
         "🎯", "Worksheet → Quiz Ingestion", [
             "Upload past exam papers: PDF, DOCX, Images, TXT",
             "Import public online quiz links via URL parser",
             "AI auto-detects question text, options, and answer keys",
             "Embedded preview of source paper alongside extracted MCQs",
             "Eliminates tedious manual question retyping completely"
         ], AMBER)

    card(s, Inches(4.7), Inches(2.2), Inches(3.9), Inches(4.8),
         "🤖", "Practice & Auto-Solve Modes", [
             "Manual Practice: Timed test with instant correctness feedback",
             "Auto-Solve: AI solves to your exact target correct score",
             "Detailed Explanations: Why each option is right or wrong",
             "In-Quiz AI Tutor: Ask follow-up doubts about any question",
             "Scorecard Summary: Time spent, correct/incorrect breakdown"
         ], MINT)

    card(s, Inches(8.8), Inches(2.2), Inches(3.9), Inches(4.8),
         "📊", "Private Momentum Tracker", [
             "Activity Log: Tracks study sessions, quizzes, equations, docs",
             "Aggregated Stats: Total minutes, quiz count, average score %",
             "Guest Mode: Saved in localStorage, no mandatory login needed",
             "Optional Cloud Sync: Connect account for cross-device access",
             "Streamlined Profile: 8 core student fields, zero bloat"
         ], SKY)

    # ═══════════════════════════════════════════════════
    # SLIDE 08 — TECH STACK
    # ═══════════════════════════════════════════════════
    s = prs.slides.add_slide(blank); bg(s)
    badge(s, Inches(0.9), Inches(0.42), "System Architecture", SKY)
    slide_num(s, 8)
    heading(s, "Technology Stack & Architecture",
            "Built with modern web standards, client-side speed, and robust TypeScript engineering.")

    qw = Inches(2.9); qg = Inches(0.2)
    stack = [
        ("⚡", "Frontend Core", ["React 19 + TypeScript", "Vite 7 Fast Bundler", "TailwindCSS 4 Utility Engine",
         "Lucide Modern Icon Set", "Wouter Lightweight Router", "TanStack Query Caching"], SKY),
        ("🎙️", "Speech & Audio", ["Web Speech API (STT)", "SpeechSynthesis (TTS)", "Web Audio API Visualizer",
         "Canvas 24-Band Equalizer", "Dynamic Voice Pitch/Rate", "Standalone Vanilla JS Bundle"], CYAN),
        ("📄", "Local Processing", ["PDF-Lib (Client PDF Gen)", "PDF.js Web Worker Thread", "HTML5 Canvas 2D API",
         "Mathjs Safe AST Parser", "Client Photo Compressor", "Zero-Leakage File Pipeline"], MINT),
        ("🛡️", "Backend & Security", ["Node.js Express Server", "Argon2 Password Hashing", "SQLite Session Store",
         "Strict URL Sanitization", "Guest localStorage Mode", "Vercel / Docker Deploy Ready"], AMBER),
    ]
    for i, (ic, ti, bu, ac) in enumerate(stack):
        card(s, Inches(0.6) + i * (qw + qg), Inches(2.2), qw, Inches(4.8), ic, ti, bu, ac)

    # ═══════════════════════════════════════════════════
    # SLIDE 09 — IMPACT & ROADMAP
    # ═══════════════════════════════════════════════════
    s = prs.slides.add_slide(blank); bg(s)
    badge(s, Inches(0.9), Inches(0.42), "Impact & Future Scope", MINT)
    slide_num(s, 9)
    heading(s, "Real-World Impact & Project Roadmap",
            "Democratizing quality English speaking mentorship and smart study tools for every student.")

    card(s, Inches(0.6), Inches(2.2), Inches(5.85), Inches(4.8),
         "🌟", "Student Impact & Outcomes", [
             "Overcomes Speaking Hesitation: Safe, judgement-free 24/7 practice zone",
             "Interview Readiness: Tailored practice for campus placements & vivas",
             "Zero Financial Burden: Replaces costly English coaching with free AI mentor",
             "High Academic Efficiency: 5 fragmented tools → 1 unified workspace",
             "Bilingual Inclusivity: Hindi / Hinglish explanations bridge language gaps",
             "Data Privacy Assured: Sensitive documents never leave the student's browser",
             "Mobile Responsive: Works on budget smartphones and slow connections"
         ], MINT)

    card(s, Inches(6.7), Inches(2.2), Inches(5.85), Inches(4.8),
         "🚀", "Future Development Roadmap", [
             "Phase 1: Phoneme-level AI pronunciation scoring via audio spectrograms",
             "Phase 2: Peer-to-peer live student discussion rooms with AI moderation",
             "Phase 3: WebAssembly (WASM) local AI models for 100% offline speech",
             "Phase 4: Progressive Web App (PWA) for Android & iOS installability",
             "Phase 5: Automated mock placement interview scoring with resume alignment",
             "Phase 6: Regional language voice practice (Hindi, Tamil, Telugu, Bengali)",
             "Phase 7: AI-powered resume builder integrated with voice practice history"
         ], SKY)

    # ═══════════════════════════════════════════════════
    # SLIDE 10 — THANK YOU & 5 TEAM MEMBERS
    # ═══════════════════════════════════════════════════
    s = prs.slides.add_slide(blank); bg(s)

    # top accent line full width
    accent_line(s, Inches(0.5), Inches(0.35), Inches(12.333), SKY)

    # Thank You title
    txt(s, Inches(0.5), Inches(0.5), Inches(12.333), Inches(0.8),
        "Thank You for Your Time!", 36, True, WHITE, PP_ALIGN.CENTER, "Segoe UI Black")

    txt(s, Inches(0.5), Inches(1.25), Inches(12.333), Inches(0.4),
        "TECH AI | SMART WAY  •  Questions & Discussion Warmly Welcomed", 15, False, SKY, PP_ALIGN.CENTER)

    # accent line below subtitle
    accent_line(s, Inches(4.5), Inches(1.72), Inches(4.333), CYAN)

    # 5 Team member cards
    team = [
        ("Bhashkar Sharma", "Team Lead &\nFull-Stack Architect", "System Architecture\n& AI Integration", SKY),
        ("Team Member 2", "AI & Speech\nEngineer", "Web Speech API\n& NLP Studio", CYAN),
        ("Team Member 3", "UI/UX &\nFrontend Lead", "React 19, CSS\n& Animations", MINT),
        ("Team Member 4", "Backend &\nSecurity Lead", "Node.js, Express\n& Auth System", VIOLET),
        ("Team Member 5", "QA, Testing &\nDocumentation", "Testing, Research\n& Project Reports", AMBER),
    ]

    cw = Inches(2.25); cg = Inches(0.16)
    sx = Inches(0.6)

    for i, (name, role, tag, accent) in enumerate(team):
        x = sx + i * (cw + cg)
        ty = Inches(2.0)

        # card bg
        r = s.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, x, ty, cw, Inches(4.65))
        r.fill.solid(); r.fill.fore_color.rgb = CARD
        r.line.color.rgb = accent; r.line.width = Pt(1.5)

        # top accent strip
        accent_line(s, x + Inches(0.1), ty + Inches(0.06), cw - Inches(0.2), accent)

        # photo circle
        cd = Inches(1.3)
        cx = x + (cw - cd) / 2
        cy = ty + Inches(0.3)
        photo = s.shapes.add_shape(MSO_SHAPE.OVAL, cx, cy, cd, cd)
        photo.fill.solid(); photo.fill.fore_color.rgb = DARK_CARD
        photo.line.color.rgb = accent; photo.line.width = Pt(2.5)
        ptf = photo.text_frame; pp = ptf.paragraphs[0]
        pp.text = "👤"; pp.font.size = Pt(30); pp.alignment = PP_ALIGN.CENTER

        # name
        txt(s, x + Inches(0.05), ty + Inches(1.75), cw - Inches(0.1), Inches(0.35),
            name, 14, True, WHITE, PP_ALIGN.CENTER)

        # role
        tb_role = s.shapes.add_textbox(x + Inches(0.05), ty + Inches(2.15), cw - Inches(0.1), Inches(0.55))
        tf_r = tb_role.text_frame; tf_r.word_wrap = True
        p_r = tf_r.paragraphs[0]; p_r.text = role
        p_r.font.size = Pt(11); p_r.font.bold = True; p_r.font.color.rgb = accent
        p_r.font.name = "Segoe UI"; p_r.alignment = PP_ALIGN.CENTER

        # tag pill
        tag_y = ty + Inches(2.85)
        tag_r = s.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE,
                                    x + Inches(0.15), tag_y, cw - Inches(0.3), Inches(0.6))
        tag_r.fill.solid(); tag_r.fill.fore_color.rgb = DARK_CARD
        tag_r.line.color.rgb = BORDER; tag_r.line.width = Pt(0.8)
        tb_tag = s.shapes.add_textbox(x + Inches(0.2), tag_y + Inches(0.05),
                                       cw - Inches(0.4), Inches(0.5))
        tf_tag = tb_tag.text_frame; tf_tag.word_wrap = True
        p_t = tf_tag.paragraphs[0]; p_t.text = tag
        p_t.font.size = Pt(9.5); p_t.font.color.rgb = MUTED
        p_t.font.name = "Segoe UI"; p_t.alignment = PP_ALIGN.CENTER

        # "Add Photo" note
        txt(s, x + Inches(0.05), ty + Inches(3.6), cw - Inches(0.1), Inches(0.55),
            "↑ Replace with\nactual photo", 8.5, False, DIM, PP_ALIGN.CENTER)

    # Footer
    accent_line(s, Inches(0.5), Inches(6.85), Inches(12.333), BORDER)
    txt(s, Inches(0.5), Inches(6.95), Inches(6.0), Inches(0.3),
        "GitHub: github.com/bhashkar108/miniproject", 10.5, True, MUTED, PP_ALIGN.LEFT)
    txt(s, Inches(6.5), Inches(6.95), Inches(6.333), Inches(0.3),
        "TECH AI | SMART WAY  •  2026 Academic Edition", 10.5, False, DIM, PP_ALIGN.RIGHT)

    # ── Save ────────────────────
    prs.save(out)
    print(f"✅ Premium PPT saved: {out}")

if __name__ == "__main__":
    p = os.path.join("artifacts", "tech-ai", "public", "TECH_AI_Smart_Way_Presentation.pptx")
    os.makedirs(os.path.dirname(p), exist_ok=True)
    make_pptx(p)
