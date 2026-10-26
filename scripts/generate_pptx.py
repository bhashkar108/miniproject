import os
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN
from pptx.enum.shapes import MSO_SHAPE

def create_deck(output_path):
    prs = Presentation()
    # 16:9 Widescreen dimensions
    prs.slide_width = Inches(13.333)
    prs.slide_height = Inches(7.5)
    blank_layout = prs.slide_layouts[6]

    # Theme Palette
    BG_COLOR = RGBColor(9, 13, 22)        # #090D16 Deep Dark
    CARD_BG = RGBColor(18, 25, 41)        # #121929 Glass Card
    PRIMARY_SKY = RGBColor(56, 189, 248)  # #38BDF8 Sky Blue
    CYAN = RGBColor(34, 211, 238)         # #22D3EE Cyan
    MINT = RGBColor(52, 211, 153)         # #34D399 Mint
    AMBER = RGBColor(251, 191, 36)        # #FBBF24 Amber
    VIOLET = RGBColor(167, 139, 250)      # #A78BFA Violet
    TEXT_LIGHT = RGBColor(241, 245, 249)  # White-ish
    TEXT_MUTED = RGBColor(148, 163, 184)  # Slate
    CARD_BORDER = RGBColor(30, 41, 59)    # Slate border

    def set_slide_bg(slide):
        bg = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, prs.slide_width, prs.slide_height)
        bg.fill.solid()
        bg.fill.fore_color.rgb = BG_COLOR
        bg.line.fill.background()
        return bg

    def add_header(slide, badge_text, slide_no, title_text, subtitle_text=""):
        # Badge
        badge = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.8), Inches(0.5), Inches(2.8), Inches(0.4))
        badge.fill.solid()
        badge.fill.fore_color.rgb = RGBColor(15, 23, 42)
        badge.line.color.rgb = PRIMARY_SKY
        badge.line.width = Pt(1)
        tf = badge.text_frame
        tf.word_wrap = True
        p = tf.paragraphs[0]
        p.text = badge_text.upper()
        p.font.size = Pt(10.5)
        p.font.bold = True
        p.font.color.rgb = PRIMARY_SKY
        p.font.name = "Arial"
        p.alignment = PP_ALIGN.CENTER

        # Slide Number
        num_box = slide.shapes.add_textbox(Inches(11.0), Inches(0.5), Inches(1.5), Inches(0.4))
        p = num_box.text_frame.paragraphs[0]
        p.text = slide_no
        p.font.size = Pt(12)
        p.font.bold = True
        p.font.color.rgb = TEXT_MUTED
        p.font.name = "Arial"
        p.alignment = PP_ALIGN.RIGHT

        # Title
        t_box = slide.shapes.add_textbox(Inches(0.8), Inches(0.95), Inches(11.7), Inches(0.7))
        p = t_box.text_frame.paragraphs[0]
        p.text = title_text
        p.font.size = Pt(26)
        p.font.bold = True
        p.font.color.rgb = TEXT_LIGHT
        p.font.name = "Arial"

        # Subtitle
        if subtitle_text:
            s_box = slide.shapes.add_textbox(Inches(0.8), Inches(1.55), Inches(11.7), Inches(0.45))
            p = s_box.text_frame.paragraphs[0]
            p.text = subtitle_text
            p.font.size = Pt(13)
            p.font.color.rgb = TEXT_MUTED
            p.font.name = "Arial"

    def add_card(slide, left, top, width, height, title, items=[], accent_color=PRIMARY_SKY, icon=""):
        card = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, left, top, width, height)
        card.fill.solid()
        card.fill.fore_color.rgb = CARD_BG
        card.line.color.rgb = CARD_BORDER
        card.line.width = Pt(1)

        # Content Box inside card
        tb = slide.shapes.add_textbox(left + Inches(0.2), top + Inches(0.2), width - Inches(0.4), height - Inches(0.4))
        tf = tb.text_frame
        tf.word_wrap = True

        p0 = tf.paragraphs[0]
        full_title = f"{icon}  {title}" if icon else title
        p0.text = full_title
        p0.font.size = Pt(16)
        p0.font.bold = True
        p0.font.color.rgb = accent_color
        p0.font.name = "Arial"

        for item in items:
            p = tf.add_paragraph()
            p.text = f"• {item}"
            p.font.size = Pt(12)
            p.font.color.rgb = TEXT_LIGHT
            p.font.name = "Arial"
            p.space_before = Pt(6)

        return card

    # ==========================================
    # SLIDE 1: WELCOME & HERO SLIDE
    # ==========================================
    s1 = prs.slides.add_slide(blank_layout)
    set_slide_bg(s1)

    # Decorative Orb Circle
    orb = s1.shapes.add_shape(MSO_SHAPE.OVAL, Inches(5.9), Inches(1.0), Inches(1.5), Inches(1.5))
    orb.fill.solid()
    orb.fill.fore_color.rgb = PRIMARY_SKY
    orb.line.color.rgb = CYAN
    orb.line.width = Pt(3)

    # Title Box
    t1 = s1.shapes.add_textbox(Inches(1.0), Inches(2.7), Inches(11.333), Inches(1.2))
    p = t1.text_frame.paragraphs[0]
    p.text = "TECH AI | SMART WAY"
    p.font.size = Pt(44)
    p.font.bold = True
    p.font.color.rgb = TEXT_LIGHT
    p.font.name = "Arial"
    p.alignment = PP_ALIGN.CENTER

    sub1 = s1.shapes.add_textbox(Inches(1.5), Inches(3.9), Inches(10.333), Inches(0.8))
    p = sub1.text_frame.paragraphs[0]
    p.text = "Next-Generation AI Voice English Practice & Smart Student Workspace Ecosystem"
    p.font.size = Pt(18)
    p.font.color.rgb = PRIMARY_SKY
    p.font.name = "Arial"
    p.alignment = PP_ALIGN.CENTER

    # 4 Feature Pills
    features = [
        "🎙️ AI Voice Practice Studio",
        "💡 Real-Time Grammar & Hindi Help",
        "📄 Smart Doc & Equation Grapher",
        "🎯 Auto Quiz & Private Analytics"
    ]
    pill_w = Inches(2.7)
    gap = Inches(0.2)
    start_x = Inches(1.0)
    for i, feat in enumerate(features):
        x = start_x + i * (pill_w + gap)
        pill = s1.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, x, Inches(4.9), pill_w, Inches(0.7))
        pill.fill.solid()
        pill.fill.fore_color.rgb = CARD_BG
        pill.line.color.rgb = PRIMARY_SKY
        pill.line.width = Pt(1)
        p = pill.text_frame.paragraphs[0]
        p.text = feat
        p.font.size = Pt(11.5)
        p.font.bold = True
        p.font.color.rgb = TEXT_LIGHT
        p.alignment = PP_ALIGN.CENTER

    foot1 = s1.shapes.add_textbox(Inches(1.0), Inches(6.3), Inches(11.333), Inches(0.5))
    p = foot1.text_frame.paragraphs[0]
    p.text = "A Purpose-Built Academic Solution • Clean Architecture • Privacy-First Design"
    p.font.size = Pt(12)
    p.font.color.rgb = TEXT_MUTED
    p.alignment = PP_ALIGN.CENTER

    # ==========================================
    # SLIDE 2: PROBLEM STATEMENT
    # ==========================================
    s2 = prs.slides.add_slide(blank_layout)
    set_slide_bg(s2)
    add_header(s2, "Problem Statement", "02 / 10", "The Real Challenges Faced by Students Today",
               "Students in tier-2/3 institutions face high anxiety in spoken English and scattered, unsafe academic study tools.")
    
    col_w = Inches(3.7)
    add_card(s2, Inches(0.8), Inches(2.2), col_w, Inches(4.5),
             "English Speaking Hesitation",
             [
                 "Fear of peer judgment and making mistakes publicly",
                 "Lack of 1-on-1 speaking partners for regular practice",
                 "Hesitation during college vivas and placement interviews",
                 "Grammar errors go uncorrected or create demoralization",
                 "Expensive spoken English coaching institutes out of reach"
             ],
             PRIMARY_SKY, "🗣️")

    add_card(s2, Inches(4.8), Inches(2.2), col_w, Inches(4.5),
             "Fragmented Study Workflows",
             [
                 "Students juggle multiple isolated sites for notes and tests",
                 "Generic chatbots hallucinate and give off-syllabus answers",
                 "Static quiz PDFs without immediate automated scoring",
                 "Manual equation plotting and visual analysis are slow",
                 "No unified desk that ties speaking and subject learning"
             ],
             AMBER, "📚")

    add_card(s2, Inches(8.8), Inches(2.2), col_w, Inches(4.5),
             "Privacy & Accessibility Gaps",
             [
                 "Sensitive documents uploaded to shady third-party sites",
                 "Document compression portals risk data leakage",
                 "Zero native Hindi/Hinglish explanations for tricky phrases",
                 "Rigid tools forcing users into prefilled template formats",
                 "Heavyweight desktop apps that lag on budget laptops"
             ],
             VIOLET, "🔒")

    # ==========================================
    # SLIDE 3: PROPOSED SOLUTION
    # ==========================================
    s3 = prs.slides.add_slide(blank_layout)
    set_slide_bg(s3)
    add_header(s3, "Proposed Solution", "03 / 10", "TECH AI | Smart Way — The Unified Ecosystem",
               "A privacy-centric, all-in-one AI platform empowering students to speak fluently and master academic tasks.")

    half_w = Inches(5.7)
    add_card(s3, Inches(0.8), Inches(2.2), half_w, Inches(4.5),
             "Interactive AI Voice Practice Studio",
             [
                 "Dual-Column Architecture: Animated AI Voice Orb on the LEFT, Conversation Studio on the RIGHT",
                 "Real-Time Speech Recognition & Expressive Text-to-Speech synthesis",
                 "3 Selectable Levels: Beginner, Intermediate, and Advanced difficulty",
                 "Polite Grammar Feedback: Explains errors kindly with better phrases",
                 "Bilingual Hindi Tooltips: Instant Hindi explanations on demand",
                 "8 Engaging Topics: College life, job interviews, travel, tech, hobbies",
                 "Responsive Layout: Naturally stacks vertically on mobile devices"
             ],
             PRIMARY_SKY, "🎙️")

    add_card(s3, Inches(6.8), Inches(2.2), half_w, Inches(4.5),
             "Complete In-Browser Academic Toolkit",
             [
                 "AI Teacher: Grounded lessons generated exclusively from your uploaded notes (PDF/DOCX/Images)",
                 "Hands-free Voice Doubts: Speak questions aloud with custom pacing",
                 "Smart Doc Studio: 100% in-browser camera scan, 90° rotation, crop, and exact KB file compressor",
                 "Equation Grapher: 2D curve plotting, intercept finding, and image OCR",
                 "Auto Quiz Engine: Past paper to interactive MCQ conversion & auto-solve",
                 "Streamlined Student Profile: Only 8 essential fields, zero clutter"
             ],
             MINT, "⚡")

    # ==========================================
    # SLIDE 4: FEATURE 1 - AI VOICE PRACTICE STUDIO
    # ==========================================
    s4 = prs.slides.add_slide(blank_layout)
    set_slide_bg(s4)
    add_header(s4, "Core Flagship Feature", "04 / 10", "AI Voice Practice & English Studio",
               "Engineered with strict layout symmetry: Visualizer on the LEFT, Conversation Studio on the RIGHT.")

    add_card(s4, Inches(0.8), Inches(2.2), Inches(4.8), Inches(4.5),
             "Animated AI Voice Visualizer (LEFT)",
             [
                 "Sky-Blue & Cyan Voice Orb pulsing dynamically during speech",
                 "24-band live audio frequency visualizer animation",
                 "6 Clear States: Speaking, Listening, Thinking, Paused, Stopped, Idle",
                 "Complete Speech Controls: Start, Stop, Pause, Resume, Repeat",
                 "Pacing Slider: 0.7x to 1.4x speaking speed adjustment",
                 "Voice selection dropdown matching available browser voices",
                 "Independent scrolling & balanced desktop column width"
             ],
             CYAN, "🔮")

    add_card(s4, Inches(5.9), Inches(2.2), Inches(6.6), Inches(4.5),
             "Conversation Studio Panel (RIGHT)",
             [
                 "Interactive Chat Bubbles with auto-scroll to the newest message",
                 "Beginner Level: Short sentences, simple vocabulary, extra guidance",
                 "Intermediate Level: Natural conversational flow & idioms",
                 "Advanced Level: Complex structure, professional interview vocabulary",
                 "Polite Grammar Correction: Highlights mistakes with improved sentence versions",
                 "Hindi Explanations: Explains complex words in accessible Hindi/Hinglish",
                 "Favorites Vault: 1-click save for golden sentences and interview answers",
                 "Zero Fluff: Clean dark UI with high-contrast readable text bubbles"
             ],
             PRIMARY_SKY, "💬")

    # ==========================================
    # SLIDE 5: FEATURE 2 - AI TEACHER
    # ==========================================
    s5 = prs.slides.add_slide(blank_layout)
    set_slide_bg(s5)
    add_header(s5, "Study Companion", "05 / 10", "AI Teacher: Grounded Learning From Your Notes",
               "Upload lecture notes, textbooks, or syllabus sheets. Learn without AI hallucination or generic internet noise.")

    add_card(s5, Inches(0.8), Inches(2.2), col_w, Inches(4.5),
             "Bring Your Own Material",
             [
                 "Accepts PDF, DOCX, TXT, Markdown, and scanned notes images",
                 "Extracts text cleanly for student inspection and direct editing",
                 "Zero prefilled dummy data — strictly grounded in your syllabus",
                 "One-click ingestion of processed Smart Doc copies",
                 "Protects study context from irrelevant web hallucinations"
             ],
             MINT, "📖")

    add_card(s5, Inches(4.8), Inches(2.2), col_w, Inches(4.5),
             "Hands-Free Voice Inquiries",
             [
                 "Speak your doubts via browser speech recognition",
                 "AI automatically processes question once speech finishes",
                 "Synthesizes spoken lessons with custom pacing (0.5x–1.5x)",
                 "Key point breakdowns: 'Keep these in mind' summary cards",
                 "Dynamic follow-up suggestion prompts for deeper mastery"
             ],
             PRIMARY_SKY, "🎙️")

    add_card(s5, Inches(8.8), Inches(2.2), col_w, Inches(4.5),
             "Multi-Lingual Explanations",
             [
                 "Understand complex concepts in your native mother tongue",
                 "Supports English, Hindi, Hinglish, Bengali, Tamil, Telugu, etc.",
                 "High-contrast dark mode language dropdown with crisp text",
                 "Instant concept clarity without language barriers",
                 "Private session: notes remain strictly inside your workspace"
             ],
             VIOLET, "🌐")

    # ==========================================
    # SLIDE 6: FEATURE 3 - SMART DOC & EQUATION
    # ==========================================
    s6 = prs.slides.add_slide(blank_layout)
    set_slide_bg(s6)
    add_header(s6, "Document & Math Tools", "06 / 10", "Smart Doc Studio & Equation Grapher",
               "100% in-browser document manipulation and interactive 2D mathematical curve plotting.")

    add_card(s6, Inches(0.8), Inches(2.2), half_w, Inches(4.5),
             "Smart Doc: In-Browser File Optimizer",
             [
                 "Direct Camera Scanning: Live viewfinder with capture flash",
                 "Multi-Format Conversion: Export to PDF, PNG, or JPEG",
                 "Persistent Transformations: 90° step rotation & 4-sided edge crop",
                 "Precise Target File Size: Dial in exact KB limits for college portals",
                 "Side-by-Side Comparison: View Original vs. Processed copy live",
                 "Full-Screen Inspector: Modal review with zoom controls",
                 "100% Client-Side Privacy: Confidential docs never touch external servers"
             ],
             CYAN, "📄")

    add_card(s6, Inches(6.8), Inches(2.2), half_w, Inches(4.5),
             "Equation Graph Visualizer",
             [
                 "2D Interactive SVG Graph: Plots linear, polynomial, trig & exponential curves",
                 "Dual Curve Comparison: Graph two functions simultaneously (e.g., sin(x) & cos(x))",
                 "Auto Intercepts & Crossings: Computes root points and intersections instantly",
                 "Image OCR Parser: Snap photo of written equations to populate graphs",
                 "Dynamic Domain Range: Adjust horizontal range from -12 to +12 seamlessly",
                 "Zero External Math Libraries: Uses safe AST parsing locally in browser"
             ],
             VIOLET, "📈")

    # ==========================================
    # SLIDE 7: FEATURE 4 - AUTO QUIZ & ANALYTICS
    # ==========================================
    s7 = prs.slides.add_slide(blank_layout)
    set_slide_bg(s7)
    add_header(s7, "Assessment & Analytics", "07 / 10", "Auto Quiz Engine & Student Momentum Tracking",
               "Turn question papers into interactive practice tests with target-score solvers and private analytics.")

    add_card(s7, Inches(0.8), Inches(2.2), col_w, Inches(4.5),
             "Worksheet Ingestion",
             [
                 "Upload past exam papers (PDF, DOCX, Images, TXT)",
                 "Import public online quiz links via URL parser",
                 "Automatically detects question text, options, and answer keys",
                 "Displays embedded preview of source paper side-by-side",
                 "Eliminates manual retyping of questions"
             ],
             AMBER, "🎯")

    add_card(s7, Inches(4.8), Inches(2.2), col_w, Inches(4.5),
             "Practice & Auto-Solve",
             [
                 "Manual Practice Mode: Timed test with instant correctness feedback",
                 "Auto-Solve All Mode: AI solves to an exact target correct score",
                 "Detailed Explanation Drawer: Breaks down why an option is right",
                 "In-Quiz AI Tutor: Ask follow-up doubts about any question",
                 "Scorecard Summary: Time spent, correct/incorrect review list"
             ],
             MINT, "🤖")

    add_card(s7, Inches(8.8), Inches(2.2), col_w, Inches(4.5),
             "Private Momentum Tracker",
             [
                 "Workspace Activity Log: Tracks study sessions, quizzes, graphs",
                 "Aggregated Stats: Total study minutes, quizzes, average score",
                 "Guest Mode Persistence: Saved in localStorage without mandatory login",
                 "Optional Cloud Sync: Connect account for cross-device access",
                 "Streamlined Profile: 8 core student fields, zero intrusive forms"
             ],
             PRIMARY_SKY, "📊")

    # ==========================================
    # SLIDE 8: TECH STACK & ARCHITECTURE
    # ==========================================
    s8 = prs.slides.add_slide(blank_layout)
    set_slide_bg(s8)
    add_header(s8, "System Architecture", "08 / 10", "Modern Technology Stack & Design System",
               "Built with modern web standards, client-side speed, and robust TypeScript engineering.")

    quarter_w = Inches(2.75)
    q_gap = Inches(0.25)
    add_card(s8, Inches(0.8) + 0*(quarter_w+q_gap), Inches(2.2), quarter_w, Inches(4.5),
             "Frontend Core",
             [
                 "React 19 & TypeScript",
                 "Vite Fast Bundler",
                 "TailwindCSS 4 Engine",
                 "Lucide Modern Icons",
                 "Wouter Routing",
                 "TanStack Query Cache"
             ],
             PRIMARY_SKY, "⚡")

    add_card(s8, Inches(0.8) + 1*(quarter_w+q_gap), Inches(2.2), quarter_w, Inches(4.5),
             "Speech & Audio",
             [
                 "Web Speech API (STT)",
                 "SpeechSynthesis (TTS)",
                 "Web Audio API Visualizer",
                 "HTML5 24-Band Equalizer",
                 "Dynamic Voice Pitch/Rate",
                 "Standalone Vanilla JS"
             ],
             CYAN, "🎙️")

    add_card(s8, Inches(0.8) + 2*(quarter_w+q_gap), Inches(2.2), quarter_w, Inches(4.5),
             "Local File Engines",
             [
                 "PDF-Lib (Client PDF)",
                 "PDF.js Web Worker",
                 "HTML5 Canvas 2D API",
                 "Mathjs Safe AST Parser",
                 "Client Photo Compression",
                 "Zero-Leakage Local Processing"
             ],
             MINT, "📄")

    add_card(s8, Inches(0.8) + 3*(quarter_w+q_gap), Inches(2.2), quarter_w, Inches(4.5),
             "Backend & Security",
             [
                 "Node.js Express Server",
                 "Argon2 Password Hashing",
                 "SQLite Session Store",
                 "Strict URL Validation",
                 "Guest Device Storage",
                 "Docker / Vercel Deploy Ready"
             ],
             AMBER, "🛡️")

    # ==========================================
    # SLIDE 9: IMPACT & ROADMAP
    # ==========================================
    s9 = prs.slides.add_slide(blank_layout)
    set_slide_bg(s9)
    add_header(s9, "Future Scope", "09 / 10", "Real-World Impact & Project Roadmap",
               "Democratizing quality English speaking mentorship and smart academic tools for every student.")

    add_card(s9, Inches(0.8), Inches(2.2), half_w, Inches(4.5),
             "Student Impact & Achievements",
             [
                 "Overcomes English Speaking Hesitation: Safe, non-judgmental practice zone",
                 "Interview Readiness: Tailored practice for campus placements and technical vivas",
                 "Zero Financial Burden: High-quality English speaking mentor without costly coaching fees",
                 "High Academic Efficiency: Replaces 5 disconnected tools with 1 unified workspace",
                 "Inclusivity: Native Hindi explanations ensure students never feel left behind",
                 "Privacy Assured: Critical personal documents stay safe on the student's device"
             ],
             MINT, "🌟")

    add_card(s9, Inches(6.8), Inches(2.2), half_w, Inches(4.5),
             "Future Development Roadmap",
             [
                 "Phase 1: Phoneme-Level Pronunciation Scoring using real-time audio spectrograms",
                 "Phase 2: Peer-to-Peer Study Rooms for live speaking battles and collaborative quizzes",
                 "Phase 3: WebAssembly (WASM) Local AI models for 100% offline speech recognition",
                 "Phase 4: Cross-Platform Mobile Apps (Android & iOS) via Progressive Web App (PWA)",
                 "Phase 5: Automated Mock Placement Interview scoring with resume-aligned questions"
             ],
             PRIMARY_SKY, "🚀")

    # ==========================================
    # SLIDE 10: THANK YOU & 5 TEAM MEMBERS
    # ==========================================
    s10 = prs.slides.add_slide(blank_layout)
    set_slide_bg(s10)

    # Big Thank you Header
    t10 = s10.shapes.add_textbox(Inches(0.8), Inches(0.4), Inches(11.7), Inches(0.7))
    p = t10.text_frame.paragraphs[0]
    p.text = "Thank You for Your Time & Attention!"
    p.font.size = Pt(28)
    p.font.bold = True
    p.font.color.rgb = TEXT_LIGHT
    p.alignment = PP_ALIGN.CENTER

    sub10 = s10.shapes.add_textbox(Inches(0.8), Inches(1.1), Inches(11.7), Inches(0.4))
    p = sub10.text_frame.paragraphs[0]
    p.text = "TECH AI | SMART WAY • Questions & Discussion Warmly Welcomed"
    p.font.size = Pt(14)
    p.font.color.rgb = PRIMARY_SKY
    p.alignment = PP_ALIGN.CENTER

    # 5 Team Member Profile Cards
    team_members = [
        {"name": "Bhashkar Sharma", "role": "Team Lead & Full-Stack", "tag": "System Architecture & AI"},
        {"name": "Team Member 2", "role": "AI & Speech Engineer", "tag": "Web Speech API & NLP"},
        {"name": "Team Member 3", "role": "UI/UX & Frontend Lead", "tag": "React 19 & Animations"},
        {"name": "Team Member 4", "role": "Backend & Security Lead", "tag": "Node.js, Express & Auth"},
        {"name": "Team Member 5", "role": "QA & Documentation", "tag": "Testing & Project Reports"},
    ]

    card_w5 = Inches(2.2)
    gap5 = Inches(0.18)
    start_x5 = Inches(0.8)

    for i, mem in enumerate(team_members):
        x = start_x5 + i * (card_w5 + gap5)
        top_y = Inches(1.8)

        # Card container
        tcard = s10.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, x, top_y, card_w5, Inches(4.5))
        tcard.fill.solid()
        tcard.fill.fore_color.rgb = CARD_BG
        tcard.line.color.rgb = PRIMARY_SKY
        tcard.line.width = Pt(1.5)

        # Circular Photo Placeholder
        circle_d = Inches(1.2)
        circle_x = x + (card_w5 - circle_d) / 2
        circle_y = top_y + Inches(0.35)
        photo_circle = s10.shapes.add_shape(MSO_SHAPE.OVAL, circle_x, circle_y, circle_d, circle_d)
        photo_circle.fill.solid()
        photo_circle.fill.fore_color.rgb = RGBColor(30, 41, 59)
        photo_circle.line.color.rgb = CYAN
        photo_circle.line.width = Pt(2)

        # Initial / Icon inside photo circle
        p_tf = photo_circle.text_frame
        p = p_tf.paragraphs[0]
        p.text = "👤"
        p.font.size = Pt(26)
        p.alignment = PP_ALIGN.CENTER

        # Member Info Box
        info_box = s10.shapes.add_textbox(x + Inches(0.1), top_y + Inches(1.75), card_w5 - Inches(0.2), Inches(2.5))
        itf = info_box.text_frame
        itf.word_wrap = True

        p1 = itf.paragraphs[0]
        p1.text = mem["name"]
        p1.font.size = Pt(14)
        p1.font.bold = True
        p1.font.color.rgb = TEXT_LIGHT
        p1.alignment = PP_ALIGN.CENTER

        p2 = itf.add_paragraph()
        p2.text = mem["role"]
        p2.font.size = Pt(11)
        p2.font.color.rgb = PRIMARY_SKY
        p2.alignment = PP_ALIGN.CENTER
        p2.space_before = Pt(4)

        p3 = itf.add_paragraph()
        p3.text = f"[{mem['tag']}]"
        p3.font.size = Pt(9.5)
        p3.font.color.rgb = TEXT_MUTED
        p3.alignment = PP_ALIGN.CENTER
        p3.space_before = Pt(8)

        p4 = itf.add_paragraph()
        p4.text = "Insert Photo Here"
        p4.font.size = Pt(8.5)
        p4.font.color.rgb = RGBColor(100, 116, 139)
        p4.alignment = PP_ALIGN.CENTER
        p4.space_before = Pt(6)

    # Footer note
    foot10 = s10.shapes.add_textbox(Inches(0.8), Inches(6.6), Inches(11.7), Inches(0.4))
    p = foot10.text_frame.paragraphs[0]
    p.text = "Repository: github.com/bhashkar108/miniproject  •  Built with React 19 & Python Engine  •  TECH AI 2026"
    p.font.size = Pt(11)
    p.font.color.rgb = TEXT_MUTED
    p.alignment = PP_ALIGN.CENTER

    prs.save(output_path)
    print(f"Presentation saved successfully to: {output_path}")

if __name__ == "__main__":
    out_dir = "artifacts/tech-ai/public"
    os.makedirs(out_dir, exist_ok=True)
    deck_path = os.path.join(out_dir, "TECH_AI_Smart_Way_Presentation.pptx")
    create_deck(deck_path)
