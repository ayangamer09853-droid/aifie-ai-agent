/**
 * AIFIE Revenue Agent - 53 Practical Revenue Offerings Matrix
 * Structured across 9 High-Leverage Verticals
 * Zero external dependencies. Pure Node.js ESM.
 */

export const REVENUE_VERTICALS = {
  SERVICES: "Service-Based",
  LEAD_GEN: "Lead Generation",
  DIGITAL_PRODUCTS: "Digital Products",
  SUBSCRIPTIONS: "Subscription Revenue",
  AGRITECH: "Agriculture-Focused",
  SAAS: "Software / SaaS",
  CONTENT_MEDIA: "Content & Media",
  FREELANCE: "Marketplace & Freelance",
  HIGH_LEVERAGE_ASSETS: "High-Leverage Asset Building"
};

export const CATALOG_MATRIX_53 = [
  // -------------------------------------------------------------
  // VERTICAL 1: SERVICE-BASED (1-10)
  // -------------------------------------------------------------
  {
    id: 1,
    key: "AI_WEBSITE_BUILDER",
    name: "AI Website Builder for Small Businesses",
    vertical: REVENUE_VERTICALS.SERVICES,
    priceInr: 15000,
    priceUsd: 189,
    marginPercent: 92,
    turnaroundDays: 3,
    deliverables: ["Modern mobile-first landing page", "Speed optimized (<1s load)", "Contact lead form to email/WhatsApp", "Basic local SEO setup"]
  },
  {
    id: 2,
    key: "AI_SOCIAL_MEDIA_AGENCY",
    name: "AI Social Media Content Agency",
    vertical: REVENUE_VERTICALS.SERVICES,
    priceInr: 20000,
    priceUsd: 249,
    marginPercent: 94,
    turnaroundDays: 30,
    deliverables: ["30 branded social graphics & carousels", "High-engagement hooks and captions", "Peak time auto-scheduling", "Monthly performance report"]
  },
  {
    id: 3,
    key: "AI_SUPPORT_CHATBOT_SETUP",
    name: "AI Customer Support Chatbot Setup",
    vertical: REVENUE_VERTICALS.SERVICES,
    priceInr: 25000,
    priceUsd: 319,
    marginPercent: 96,
    turnaroundDays: 4,
    deliverables: ["Custom trained on client FAQ/docs", "Embeddable web chat widget", "WhatsApp/Telegram escalation routing", "30 days prompt tuning"]
  },
  {
    id: 4,
    key: "AI_RESUME_LINKEDIN_OPTIMIZER",
    name: "AI-Powered Resume & LinkedIn Optimization",
    vertical: REVENUE_VERTICALS.SERVICES,
    priceInr: 4500,
    priceUsd: 59,
    marginPercent: 98,
    turnaroundDays: 2,
    deliverables: ["ATS-optimized executive resume", "LinkedIn headline & About revamp", "Targeted cover letter template", "Keywords alignment matrix"]
  },
  {
    id: 5,
    key: "AI_VIDEO_EDITING_SERVICE",
    name: "AI Video Editing Service",
    vertical: REVENUE_VERTICALS.SERVICES,
    priceInr: 12000,
    priceUsd: 149,
    marginPercent: 90,
    turnaroundDays: 3,
    deliverables: ["5 vertical short-form reels/shorts", "Dynamic animated subtitles", "Sound design & B-roll cutaways", "Color grading & audio clean"]
  },
  {
    id: 6,
    key: "AI_RESEARCH_ASSISTANT",
    name: "AI Research Assistant for Students & Businesses",
    vertical: REVENUE_VERTICALS.SERVICES,
    priceInr: 6000,
    priceUsd: 79,
    marginPercent: 97,
    turnaroundDays: 2,
    deliverables: ["10-page synthesized research brief", "Verified academic/industry citations", "Data charts & executive summary", "Plagiarism-free audit"]
  },
  {
    id: 7,
    key: "AI_DATA_ENTRY_DOC_PROCESSING",
    name: "AI Data Entry & Document Processing",
    vertical: REVENUE_VERTICALS.SERVICES,
    priceInr: 8000,
    priceUsd: 99,
    marginPercent: 95,
    turnaroundDays: 2,
    deliverables: ["OCR digitization of PDF/invoices into Excel", "Data deduplication & anomaly cleansing", "Validated clean spreadsheet delivery"]
  },
  {
    id: 8,
    key: "AI_TRANSLATION_LOCALIZATION",
    name: "AI Translation & Localization Service",
    vertical: REVENUE_VERTICALS.SERVICES,
    priceInr: 7500,
    priceUsd: 95,
    marginPercent: 96,
    turnaroundDays: 3,
    deliverables: ["Multi-lingual document/website translation", "Culturally nuanced phrasing & idiom checks", "Dual-language formatted documents"]
  },
  {
    id: 9,
    key: "AI_EMAIL_MARKETING_MANAGEMENT",
    name: "AI Email Marketing Management",
    vertical: REVENUE_VERTICALS.SERVICES,
    priceInr: 18000,
    priceUsd: 229,
    marginPercent: 95,
    turnaroundDays: 14,
    deliverables: ["4 weekly broadcast newsletters", "Automated welcome sequence (5 emails)", "Spam test & deliverability audit", "Open/click tracking analytics"]
  },
  {
    id: 10,
    key: "AI_BUSINESS_AUTOMATION_CONSULTING",
    name: "AI Business Automation Consulting",
    vertical: REVENUE_VERTICALS.SERVICES,
    priceInr: 30000,
    priceUsd: 389,
    marginPercent: 96,
    turnaroundDays: 7,
    deliverables: ["End-to-end workflow bottleneck audit", "Automated multi-app webhook setup", "Custom dashboard monitoring pipeline", "Standard Operating Procedure (SOP) doc"]
  },

  // -------------------------------------------------------------
  // VERTICAL 2: LEAD GENERATION (11-15)
  // -------------------------------------------------------------
  {
    id: 11,
    key: "LOCAL_BUSINESS_LEADS",
    name: "Qualified Leads for Local Businesses",
    vertical: REVENUE_VERTICALS.LEAD_GEN,
    priceInr: 10000,
    priceUsd: 129,
    marginPercent: 94,
    turnaroundDays: 3,
    deliverables: ["150 local business decision-maker leads", "Verified phone, address, and email", "High-intent scoring matrix"]
  },
  {
    id: 12,
    key: "APPOINTMENT_SETTING_SERVICE",
    name: "Appointment-Setting Service",
    vertical: REVENUE_VERTICALS.LEAD_GEN,
    priceInr: 25000,
    priceUsd: 329,
    marginPercent: 92,
    turnaroundDays: 14,
    deliverables: ["Personalized outreach sequence", "Direct calendar booking for qualified prospects", "Guaranteed 10 qualified sales calls scheduled"]
  },
  {
    id: 13,
    key: "REAL_ESTATE_LEAD_GEN",
    name: "Real Estate Lead Generation",
    vertical: REVENUE_VERTICALS.LEAD_GEN,
    priceInr: 22000,
    priceUsd: 289,
    marginPercent: 93,
    turnaroundDays: 10,
    deliverables: ["Targeted property buyer/seller leads in designated pin codes", "Budget and timeline pre-qualification", "Instant WhatsApp lead handoff"]
  },
  {
    id: 14,
    key: "B2B_PROSPECTING_OUTREACH",
    name: "B2B Prospecting & Outreach",
    vertical: REVENUE_VERTICALS.LEAD_GEN,
    priceInr: 28000,
    priceUsd: 369,
    marginPercent: 95,
    turnaroundDays: 12,
    deliverables: ["500 verified C-suite & VP contacts", "3-step value-first email sequence", "Inbox warmup & bounce-rate protection"]
  },
  {
    id: 15,
    key: "RECRUITMENT_CANDIDATE_SOURCING",
    name: "Recruitment Candidate Sourcing",
    vertical: REVENUE_VERTICALS.LEAD_GEN,
    priceInr: 15000,
    priceUsd: 199,
    marginPercent: 96,
    turnaroundDays: 5,
    deliverables: ["50 vetted candidate profiles matching job description", "Salary expectation & notice period verified", "Direct LinkedIn profile & email dossier"]
  },

  // -------------------------------------------------------------
  // VERTICAL 3: DIGITAL PRODUCTS (16-22)
  // -------------------------------------------------------------
  {
    id: 16,
    key: "SELL_PROMPT_PACKS",
    name: "AI Prompt Packs (System-Engineered)",
    vertical: REVENUE_VERTICALS.DIGITAL_PRODUCTS,
    priceInr: 1999,
    priceUsd: 29,
    marginPercent: 99,
    turnaroundDays: 1,
    deliverables: ["500+ battle-tested prompts for ChatGPT, Claude, Midjourney", "Categorized for marketing, coding, finance, SEO", "Lifetime Notion updates"]
  },
  {
    id: 17,
    key: "NICHE_EBOOKS",
    name: "Niche Practical E-Books",
    vertical: REVENUE_VERTICALS.DIGITAL_PRODUCTS,
    priceInr: 2499,
    priceUsd: 35,
    marginPercent: 99,
    turnaroundDays: 1,
    deliverables: ["Comprehensive 40-page blueprint PDF & EPUB", "Case studies, actionable checklists, diagrams", "Instant digital download license"]
  },
  {
    id: 18,
    key: "WEBSITE_TEMPLATES",
    name: "Pre-Built Website Templates",
    vertical: REVENUE_VERTICALS.DIGITAL_PRODUCTS,
    priceInr: 3999,
    priceUsd: 49,
    marginPercent: 99,
    turnaroundDays: 1,
    deliverables: ["Production-ready HTML/CSS responsive templates", "Figma design files included", "Commercial license for client projects"]
  },
  {
    id: 19,
    key: "BUSINESS_DASHBOARDS",
    name: "Executive Business Dashboards",
    vertical: REVENUE_VERTICALS.DIGITAL_PRODUCTS,
    priceInr: 4999,
    priceUsd: 65,
    marginPercent: 99,
    turnaroundDays: 1,
    deliverables: ["Turnkey Google Sheets / Looker Studio dashboard", "Automated revenue, CAC, LTV, and runway models", "Video setup walkthrough"]
  },
  {
    id: 20,
    key: "AI_AGENT_TEMPLATES",
    name: "Plug-and-Play AI Agent Templates",
    vertical: REVENUE_VERTICALS.DIGITAL_PRODUCTS,
    priceInr: 7999,
    priceUsd: 99,
    marginPercent: 99,
    turnaroundDays: 1,
    deliverables: ["Clean standalone Node.js / Python agent codebases", "Memory, tool-use, and webhook integrations", "Docker container and deployment README"]
  },
  {
    id: 21,
    key: "ONLINE_COURSES",
    name: "Actionable Online Video / Text Courses",
    vertical: REVENUE_VERTICALS.DIGITAL_PRODUCTS,
    priceInr: 5999,
    priceUsd: 79,
    marginPercent: 98,
    turnaroundDays: 1,
    deliverables: ["10 structured modules on AI automation & monetization", "Downloadable worksheets & quizzes", "Student community access link"]
  },
  {
    id: 22,
    key: "INDUSTRY_REPORTS",
    name: "Specialized Industry Intelligence Reports",
    vertical: REVENUE_VERTICALS.DIGITAL_PRODUCTS,
    priceInr: 9999,
    priceUsd: 129,
    marginPercent: 99,
    turnaroundDays: 1,
    deliverables: ["50-page deep-dive market sizing & trends report", "Primary survey data and 5-year projections", "Decision-maker executive slide deck"]
  },

  // -------------------------------------------------------------
  // VERTICAL 4: SUBSCRIPTION REVENUE (23-27)
  // -------------------------------------------------------------
  {
    id: 23,
    key: "INDUSTRY_AI_ASSISTANT",
    name: "Industry-Specific AI Assistant Retainer",
    vertical: REVENUE_VERTICALS.SUBSCRIPTIONS,
    priceInr: 12000,
    priceUsd: 149,
    marginPercent: 96,
    turnaroundDays: 30,
    deliverables: ["24/7 dedicated domain AI query assistant", "Weekly updated knowledge base", "Private encrypted database"]
  },
  {
    id: 24,
    key: "AGRI_ADVISORY_SUBSCRIPTION",
    name: "Agricultural Advisory Subscription",
    vertical: REVENUE_VERTICALS.SUBSCRIPTIONS,
    priceInr: 2999,
    priceUsd: 39,
    marginPercent: 95,
    turnaroundDays: 30,
    deliverables: ["Bi-weekly micro-climate crop advisory", "Pest & disease early warning alerts via SMS", "Market mandi price trends"]
  },
  {
    id: 25,
    key: "MARKET_INTELLIGENCE_NEWSLETTER",
    name: "Market Intelligence Premium Newsletter",
    vertical: REVENUE_VERTICALS.SUBSCRIPTIONS,
    priceInr: 1999,
    priceUsd: 25,
    marginPercent: 98,
    turnaroundDays: 30,
    deliverables: ["Weekly institutional macro briefing", "Undervalued trade setups & crypto flows", "Subscribers-only Discord / Telegram channel"]
  },
  {
    id: 26,
    key: "COMPETITOR_MONITORING_SERVICE",
    name: "Autonomous Competitor Monitoring Service",
    vertical: REVENUE_VERTICALS.SUBSCRIPTIONS,
    priceInr: 15000,
    priceUsd: 189,
    marginPercent: 97,
    turnaroundDays: 30,
    deliverables: ["Real-time alerts when competitor changes pricing/features", "Ad campaign tracking & hiring signals report", "Monthly executive competitive teardown"]
  },
  {
    id: 27,
    key: "SOCIAL_MEDIA_TREND_REPORTS",
    name: "Viral Social Media Trend Reports",
    vertical: REVENUE_VERTICALS.SUBSCRIPTIONS,
    priceInr: 3499,
    priceUsd: 45,
    marginPercent: 97,
    turnaroundDays: 30,
    deliverables: ["Weekly trending audio, hooks, and formats for Reels/TikTok", "Algorithm update breakdown", "Content calendars for 5 niches"]
  },

  // -------------------------------------------------------------
  // VERTICAL 5: AGRICULTURE-FOCUSED (28-33)
  // -------------------------------------------------------------
  {
    id: 28,
    key: "IRRIGATION_RECOMMENDATION_SERVICE",
    name: "Smart Irrigation Recommendation Service",
    vertical: REVENUE_VERTICALS.AGRITECH,
    priceInr: 8500,
    priceUsd: 110,
    marginPercent: 94,
    turnaroundDays: 5,
    deliverables: ["Soil moisture deficit & evapotranspiration calculation", "Water schedule optimizing electricity tariffs", "Expected water savings: 30%+"]
  },
  {
    id: 29,
    key: "CROP_DISEASE_DETECTION",
    name: "AI Crop Disease Detection Assistant",
    vertical: REVENUE_VERTICALS.AGRITECH,
    priceInr: 10000,
    priceUsd: 129,
    marginPercent: 95,
    turnaroundDays: 4,
    deliverables: ["Visual leaf disease diagnosis model", "Organic & chemical remediation guidelines", "Farmer friendly mobile photo upload flow"]
  },
  {
    id: 30,
    key: "WEATHER_ALERT_SUBSCRIPTION",
    name: "Hyperlocal Agricultural Weather Alerts",
    vertical: REVENUE_VERTICALS.AGRITECH,
    priceInr: 1500,
    priceUsd: 19,
    marginPercent: 97,
    turnaroundDays: 30,
    deliverables: ["Daily frost, unseasonal rain, and heatwave warnings", "Field-specific 7-day meteorological forecasts", "Automated SMS/WhatsApp alerts in regional languages"]
  },
  {
    id: 31,
    key: "FARM_EQUIPMENT_DASHBOARD",
    name: "Farm Equipment Telemetry Dashboard",
    vertical: REVENUE_VERTICALS.AGRITECH,
    priceInr: 18000,
    priceUsd: 229,
    marginPercent: 92,
    turnaroundDays: 7,
    deliverables: ["Tractor & solar pump runtime tracker", "Maintenance schedule & diesel efficiency logs", "Real-time alerts for equipment anomalies"]
  },
  {
    id: 32,
    key: "FERTILIZER_PLANNING_ASSISTANT",
    name: "Nutrient & Fertilizer Planning Assistant",
    vertical: REVENUE_VERTICALS.AGRITECH,
    priceInr: 7500,
    priceUsd: 95,
    marginPercent: 96,
    turnaroundDays: 3,
    deliverables: ["NPK ratio optimization based on soil test card", "Custom fertilizer blend recommendation", "Prevents over-fertilization & cuts input costs by 20%"]
  },
  {
    id: 33,
    key: "YIELD_PREDICTION_REPORTS",
    name: "Harvest Yield Prediction Reports",
    vertical: REVENUE_VERTICALS.AGRITECH,
    priceInr: 12500,
    priceUsd: 159,
    marginPercent: 93,
    turnaroundDays: 6,
    deliverables: ["Satellite NDVI vegetative index & historical yield model", "Expected harvest tonnage and revenue forecast", "Optimal mandi selling window advisory"]
  },

  // -------------------------------------------------------------
  // VERTICAL 6: SOFTWARE / SAAS (34-39)
  // -------------------------------------------------------------
  {
    id: 34,
    key: "SAAS_INVOICE_GENERATION",
    name: "Invoice Generation Micro-Platform",
    vertical: REVENUE_VERTICALS.SAAS,
    priceInr: 999,
    priceUsd: 12,
    marginPercent: 98,
    turnaroundDays: 30,
    deliverables: ["Automated GST/VAT compliant PDF invoicing", "Client payment reminder sequences", "UPI & Stripe checkout integration"]
  },
  {
    id: 35,
    key: "SAAS_CRM_AUTOMATION",
    name: "Lightweight CRM Automation Tool",
    vertical: REVENUE_VERTICALS.SAAS,
    priceInr: 1999,
    priceUsd: 25,
    marginPercent: 97,
    turnaroundDays: 30,
    deliverables: ["Lead capture from website & Google Sheets", "Automated email sequences & task reminders", "Pipeline deal stage visual board"]
  },
  {
    id: 36,
    key: "SAAS_WHATSAPP_AUTOMATION",
    name: "WhatsApp Business Automation Engine",
    vertical: REVENUE_VERTICALS.SAAS,
    priceInr: 3499,
    priceUsd: 45,
    marginPercent: 95,
    turnaroundDays: 30,
    deliverables: ["Official WhatsApp Cloud API connectivity", "Automated catalog messaging & order updates", "Quick reply interactive buttons"]
  },
  {
    id: 37,
    key: "SAAS_AI_SCHEDULING",
    name: "AI Calendar & Meeting Scheduling Assistant",
    vertical: REVENUE_VERTICALS.SAAS,
    priceInr: 1499,
    priceUsd: 19,
    marginPercent: 98,
    turnaroundDays: 30,
    deliverables: ["Smart booking link with timezone auto-detection", "Google/Outlook calendar two-way synchronization", "Automated SMS/Email meeting reminders"]
  },
  {
    id: 38,
    key: "SAAS_DOC_SUMMARIZATION",
    name: "Document & Contract Summarization Platform",
    vertical: REVENUE_VERTICALS.SAAS,
    priceInr: 2499,
    priceUsd: 29,
    marginPercent: 98,
    turnaroundDays: 30,
    deliverables: ["Instant 1-page summary of lengthy legal/business PDFs", "Red flag clause detector & risk highlighting", "Downloadable structured markdown summary"]
  },
  {
    id: 39,
    key: "SAAS_MEETING_TRANSCRIPTION",
    name: "Meeting Audio Transcription & Action Items",
    vertical: REVENUE_VERTICALS.SAAS,
    priceInr: 2999,
    priceUsd: 39,
    marginPercent: 97,
    turnaroundDays: 30,
    deliverables: ["High-accuracy speech-to-text with speaker diarization", "Automated executive summary & action item checklist", "Shareable team summary link"]
  },

  // -------------------------------------------------------------
  // VERTICAL 7: CONTENT & MEDIA (40-44)
  // -------------------------------------------------------------
  {
    id: 40,
    key: "YOUTUBE_SCRIPT_GENERATION",
    name: "Viral YouTube Script Production",
    vertical: REVENUE_VERTICALS.CONTENT_MEDIA,
    priceInr: 7000,
    priceUsd: 89,
    marginPercent: 96,
    turnaroundDays: 3,
    deliverables: ["4 retention-optimized scripts with visual cues", "Curated high-CTR title & thumbnail concepts", "Pattern interrupt pacing hooks"]
  },
  {
    id: 41,
    key: "BLOG_CONTENT_PRODUCTION",
    name: "High-Authority SEO Blog Production",
    vertical: REVENUE_VERTICALS.CONTENT_MEDIA,
    priceInr: 10000,
    priceUsd: 129,
    marginPercent: 95,
    turnaroundDays: 4,
    deliverables: ["4 x 1,500-word comprehensive articles", "Keyword optimization & meta tags", "Custom featured header graphics"]
  },
  {
    id: 42,
    key: "SHORT_FORM_VIDEO_CREATION",
    name: "Short-Form Video Production (Reels / TikTok)",
    vertical: REVENUE_VERTICALS.CONTENT_MEDIA,
    priceInr: 14000,
    priceUsd: 179,
    marginPercent: 91,
    turnaroundDays: 4,
    deliverables: ["8 fully edited viral vertical video assets", "Voiceover narration & licensed sound design", "Hook variations for A/B testing"]
  },
  {
    id: 43,
    key: "PODCAST_EDITING_SUMMARIES",
    name: "Podcast Audio Mastering & Shownotes",
    vertical: REVENUE_VERTICALS.CONTENT_MEDIA,
    priceInr: 12000,
    priceUsd: 149,
    marginPercent: 93,
    turnaroundDays: 5,
    deliverables: ["Audio noise reduction, leveling, and intro/outro mixing", "Detailed timestamps & shownotes with links", "3 pull-quote social cards"]
  },
  {
    id: 44,
    key: "NEWSLETTER_CREATION_SERVICE",
    name: "Curated Industry Newsletter Creation",
    vertical: REVENUE_VERTICALS.CONTENT_MEDIA,
    priceInr: 9000,
    priceUsd: 119,
    marginPercent: 96,
    turnaroundDays: 4,
    deliverables: ["4 weekly curated industry newsletters", "Engaging personal voice & executive commentary", "Substack / Beehiiv / Mailchimp template formatting"]
  },

  // -------------------------------------------------------------
  // VERTICAL 8: MARKETPLACE & FREELANCE (45-48)
  // -------------------------------------------------------------
  {
    id: 45,
    key: "FREELANCE_JOB_BIDDING",
    name: "Autonomous Freelance Job Bidding System",
    vertical: REVENUE_VERTICALS.FREELANCE,
    priceInr: 15000,
    priceUsd: 189,
    marginPercent: 97,
    turnaroundDays: 7,
    deliverables: ["Monitors Upwork/Freelancer API for matching high-budget briefs", "Drafts tailored technical proposals with portfolio proofs", "Human-in-the-loop approval gate before submission"]
  },
  {
    id: 46,
    key: "CLIENT_PROJECT_MANAGEMENT",
    name: "Autonomous Client Project Manager",
    vertical: REVENUE_VERTICALS.FREELANCE,
    priceInr: 18000,
    priceUsd: 229,
    marginPercent: 95,
    turnaroundDays: 14,
    deliverables: ["Milestone tracking & automatic client status reports", "Scope creep detection & revision tracking", "Client satisfaction check-ins"]
  },
  {
    id: 47,
    key: "CUSTOM_AI_AGENTS_BUILDING",
    name: "Bespoke Custom AI Agents for Enterprises",
    vertical: REVENUE_VERTICALS.FREELANCE,
    priceInr: 65000,
    priceUsd: 849,
    marginPercent: 96,
    turnaroundDays: 14,
    deliverables: ["Domain-specific autonomous agent with tool execution", "Private database retrieval (RAG) & API calling", "Production container & 60 days warranty"]
  },
  {
    id: 48,
    key: "WHITE_LABEL_AGENCY_AI",
    name: "White-Label AI Solutions for Marketing Agencies",
    vertical: REVENUE_VERTICALS.FREELANCE,
    priceInr: 45000,
    priceUsd: 589,
    marginPercent: 94,
    turnaroundDays: 10,
    deliverables: ["Agency re-brandable AI dashboard & tools", "Deliverables labeled with agency logo & domain", "Agency keeps 100% of client markups"]
  },

  // -------------------------------------------------------------
  // VERTICAL 9: HIGH-LEVERAGE ASSET BUILDING (49-53)
  // -------------------------------------------------------------
  {
    id: 49,
    key: "NICHE_WEBSITE_MONETIZATION",
    name: "Niche Content Website & Ad Network Engine",
    vertical: REVENUE_VERTICALS.HIGH_LEVERAGE_ASSETS,
    priceInr: 35000,
    priceUsd: 449,
    marginPercent: 93,
    turnaroundDays: 15,
    deliverables: ["Turnkey 50-article programmatic SEO website in profitable niche", "Google AdSense & affiliate monetization hooks", "Domain, hosting, and automated content refresh pipeline"]
  },
  {
    id: 50,
    key: "SOFTWARE_TOOL_SUBSCRIPTION",
    name: "Productized Micro-SaaS Software Asset",
    vertical: REVENUE_VERTICALS.HIGH_LEVERAGE_ASSETS,
    priceInr: 50000,
    priceUsd: 649,
    marginPercent: 95,
    turnaroundDays: 20,
    deliverables: ["Self-contained web application solving single high-value problem", "Stripe subscription billing & user authentication", "Deployment scripts & documentation"]
  },
  {
    id: 51,
    key: "COMMUNITY_MEMBERSHIP_ENGINE",
    name: "Paid Community Membership Platform",
    vertical: REVENUE_VERTICALS.HIGH_LEVERAGE_ASSETS,
    priceInr: 25000,
    priceUsd: 329,
    marginPercent: 96,
    turnaroundDays: 7,
    deliverables: ["Gated Discord / Telegram / Skool community architecture", "Automated recurring member subscription billing", "Exclusive resource vault & member onboarding bot"]
  },
  {
    id: 52,
    key: "SPECIALIZED_PROFESSIONAL_COPILOT",
    name: "Specialized Professional AI Copilot (Legal / Medical / CA)",
    vertical: REVENUE_VERTICALS.HIGH_LEVERAGE_ASSETS,
    priceInr: 75000,
    priceUsd: 989,
    marginPercent: 96,
    turnaroundDays: 21,
    deliverables: ["Trained on regional statutes, tax laws, or medical protocols", "Contract audit or diagnostic assistance interface", "Strict privacy & zero data leakage guarantees"]
  },
  {
    id: 53,
    key: "USAGE_BASED_API_MONETIZATION",
    name: "Public AI API with Usage-Based Billing",
    vertical: REVENUE_VERTICALS.HIGH_LEVERAGE_ASSETS,
    priceInr: 40000,
    priceUsd: 529,
    marginPercent: 97,
    turnaroundDays: 10,
    deliverables: ["Fast REST API gateway with API key metering", "Stripe usage-based metered billing integration", "Developer portal with Swagger/OpenAPI docs"]
  }
];

export function getOfferingsByVertical(verticalName) {
  return CATALOG_MATRIX_53.filter(o => o.vertical === verticalName);
}

export function getOfferingByKey(key) {
  return CATALOG_MATRIX_53.find(o => o.key === key) || null;
}

export function getOfferingById(id) {
  return CATALOG_MATRIX_53.find(o => o.id === Number(id)) || null;
}
