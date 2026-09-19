/**
 * AIFIE Revenue Agent - Service Catalog (16 High-Value Digital Service Offerings)
 * Zero external dependencies. Pure Node.js ESM.
 */

export const SERVICE_CATEGORIES = {
  AI_CHATBOT: {
    id: "AI_CHATBOT",
    name: "AI Chatbot Development",
    description: "Custom intelligent conversational agents for customer support, lead capture, and appointment scheduling.",
    marginPercent: 95,
    pricingTiers: {
      starter: {
        name: "Starter FAQ Bot",
        inr: 15000,
        usd: 199,
        turnaroundDays: 3,
        deliverables: [
          "Trained on up to 50 company knowledge documents",
          "Website widget integration script",
          "Human escalation routing via email/webhook",
          "30 days warranty & maintenance"
        ]
      },
      pro: {
        name: "Omnichannel Smart Agent",
        inr: 45000,
        usd: 599,
        turnaroundDays: 7,
        deliverables: [
          "WhatsApp, Telegram, and Web Chat synchronization",
          "CRM integration (HubSpot, Zoho, or Custom Webhook)",
          "Intent classification & conversation memory",
          "Lead qualification flow & calendar booking",
          "60 days support & prompt optimization"
        ]
      },
      enterprise: {
        name: "Enterprise RAG Autonomous Support System",
        inr: 120000,
        usd: 1599,
        turnaroundDays: 14,
        deliverables: [
          "Private RAG knowledge graph across unlimited docs",
          "ERP/Database live querying (orders, stock, accounts)",
          "Role-based access control and strict data privacy",
          "Custom UI skin and multi-lingual voice/text support",
          "6 months dedicated SLA & quarterly model tuning"
        ]
      }
    }
  },

  WEBSITE_DEV: {
    id: "WEBSITE_DEV",
    name: "Website Design & Development",
    description: "High-performance, modern, mobile-responsive websites engineered for lead generation and brand presence.",
    marginPercent: 90,
    pricingTiers: {
      starter: {
        name: "High-Converting Landing Page",
        inr: 12000,
        usd: 149,
        turnaroundDays: 3,
        deliverables: [
          "Single-page responsive design with hero, social proof, and CTA",
          "Blazing fast static loading (< 1s load time)",
          "Lead capture form connected to email/CRM",
          "Basic on-page SEO & OpenGraph social tags"
        ]
      },
      pro: {
        name: "Business Showcase Website (5 Pages)",
        inr: 35000,
        usd: 449,
        turnaroundDays: 7,
        deliverables: [
          "5 bespoke pages (Home, About, Services, Case Studies, Contact)",
          "Interactive UI with modern typography & sleek micro-animations",
          "Full mobile & tablet optimization",
          "Google Analytics 4 & Meta Pixel setup",
          "SSL certification, speed optimization, and CDN routing"
        ]
      },
      enterprise: {
        name: "Custom Web Application & CMS",
        inr: 95000,
        usd: 1299,
        turnaroundDays: 15,
        deliverables: [
          "Full-stack custom web app or headless CMS",
          "User authentication & client portal dashboard",
          "Payment gateway integration (Stripe / Razorpay / UPI)",
          "Automated cloud backup & DDoS shielding",
          "3 months complimentary server maintenance"
        ]
      }
    }
  },

  SOCIAL_MEDIA: {
    id: "SOCIAL_MEDIA",
    name: "Social Media Management",
    description: "End-to-end organic social content creation, scheduling, community engagement, and brand growth.",
    marginPercent: 92,
    pricingTiers: {
      starter: {
        name: "Starter Presence (12 Posts/Month)",
        inr: 10000,
        usd: 129,
        turnaroundDays: 30,
        deliverables: [
          "12 branded graphics & carousel posts (LinkedIn & Instagram)",
          "Curated copy with targeted hashtags",
          "Scheduled publishing at peak engagement hours",
          "Monthly analytics & performance report"
        ]
      },
      pro: {
        name: "Growth Accelerator (24 Posts + 8 Reels/Month)",
        inr: 25000,
        usd: 329,
        turnaroundDays: 30,
        deliverables: [
          "24 multi-platform posts across LinkedIn, Twitter/X, Instagram",
          "8 short-form video reels/shorts with dynamic captions",
          "Active community engagement (responding to comments/DMs)",
          "Competitor audience analysis and monthly growth roadmap"
        ]
      },
      enterprise: {
        name: "Full Brand Dominance Retainer",
        inr: 60000,
        usd: 799,
        turnaroundDays: 30,
        deliverables: [
          "Daily high-conviction posts across 4 platforms",
          "15 viral short-form videos & executive ghostwriting",
          "Influencer outreach and strategic partner cross-promotions",
          "Weekly strategy calls and real-time crisis management"
        ]
      }
    }
  },

  CONTENT_WRITING: {
    id: "CONTENT_WRITING",
    name: "Content Writing",
    description: "Deep, informative, human-edited articles, thought-leadership whitepapers, and technical blogs.",
    marginPercent: 94,
    pricingTiers: {
      starter: {
        name: "Blog Pack (4 Articles)",
        inr: 8000,
        usd: 99,
        turnaroundDays: 5,
        deliverables: [
          "4 x 1,000-word SEO-optimized informative blog posts",
          "In-depth research, royalty-free header images, meta descriptions",
          "0% plagiarism guarantee with AI-humanized polish"
        ]
      },
      pro: {
        name: "Thought Leadership Pack (8 Articles + Ebook)",
        inr: 22000,
        usd: 289,
        turnaroundDays: 10,
        deliverables: [
          "8 x 1,500-word authoritative industry guides",
          "1 x 15-page downloadable lead magnet Ebook with cover design",
          "Key takeaway callouts, diagrams, and internal link structure",
          "Content distribution snippets for social repurposing"
        ]
      },
      enterprise: {
        name: "Comprehensive Content Hub & Editorial Strategy",
        inr: 55000,
        usd: 699,
        turnaroundDays: 20,
        deliverables: [
          "16 x 2,000-word pillar & cluster topic authority articles",
          "Executive whitepaper with primary source industry research",
          "Complete quarterly editorial calendar with keyword mapping",
          "Unlimited revisions until 100% editorial satisfaction"
        ]
      }
    }
  },

  COPYWRITING: {
    id: "COPYWRITING",
    name: "Copywriting",
    description: "Psychologically compelling sales pages, email sequences, and high-conversion ad scripts.",
    marginPercent: 96,
    pricingTiers: {
      starter: {
        name: "Sales Page Copy Refresh",
        inr: 9000,
        usd: 119,
        turnaroundDays: 3,
        deliverables: [
          "Headline, subhead, hook, and primary benefit matrix",
          "Objection handling FAQ section and compelling call-to-action",
          "Competitor messaging teardown"
        ]
      },
      pro: {
        name: "Full Conversion Funnel Copy",
        inr: 28000,
        usd: 369,
        turnaroundDays: 7,
        deliverables: [
          "Long-form direct-response sales letter (up to 3,000 words)",
          "5-part email welcome & indoctrination sequence",
          "3 Facebook/Instagram ad variations with headline hooks",
          "A/B test recommendations for conversion rate lift"
        ]
      },
      enterprise: {
        name: "Enterprise Multi-Product Campaign Copy",
        inr: 75000,
        usd: 989,
        turnaroundDays: 14,
        deliverables: [
          "Complete omnichannel launch copy suite (Landing page, VSL script, 12 emails, ad suite)",
          "Customer avatar psychological deep-dive & empathy map",
          "High-ticket sales presentation deck & script",
          "Post-launch conversion audit & live copy optimization"
        ]
      }
    }
  },

  SEO_OPTIMIZATION: {
    id: "SEO_OPTIMIZATION",
    name: "SEO Optimization",
    description: "Organic search ranking dominance through technical audit, on-page tuning, and keyword clustering.",
    marginPercent: 93,
    pricingTiers: {
      starter: {
        name: "Technical SEO Audit & Fix Roadmap",
        inr: 10000,
        usd: 139,
        turnaroundDays: 4,
        deliverables: [
          "Comprehensive 50-point technical crawl & site health score",
          "Fix guidelines for Core Web Vitals, indexation, broken links",
          "Schema markup recommendations and sitemap / robots.txt review"
        ]
      },
      pro: {
        name: "Growth SEO Retainer (Audit + 15 Pages Optimization)",
        inr: 30000,
        usd: 399,
        turnaroundDays: 20,
        deliverables: [
          "Full on-page optimization of top 15 revenue pages",
          "Keyword opportunity gap analysis against 3 direct rivals",
          "Search intent clustering & internal linking overhaul",
          "Monthly ranking progress tracking & search console reports"
        ]
      },
      enterprise: {
        name: "Full-Funnel Organic Dominance Retainer",
        inr: 70000,
        usd: 899,
        turnaroundDays: 30,
        deliverables: [
          "Entire domain technical, on-page, and architectural overhaul",
          "Digital PR & ethical high-authority brand mention blueprint",
          "Programmatic SEO template engineering for long-tail scale",
          "Dedicated SEO strategist and weekly rank tracking"
        ]
      }
    }
  },

  DATA_ANALYSIS: {
    id: "DATA_ANALYSIS",
    name: "Data Analysis",
    description: "Transform raw business spreadsheets and databases into visual dashboards and actionable profit insights.",
    marginPercent: 92,
    pricingTiers: {
      starter: {
        name: "Spreadsheet Intelligence & Cleanup",
        inr: 11000,
        usd: 149,
        turnaroundDays: 3,
        deliverables: [
          "Data cleaning, deduplication, and anomaly identification",
          "Interactive summary pivot tables and KPI charts",
          "Executive 3-page findings memo with actionable insights"
        ]
      },
      pro: {
        name: "Executive BI Dashboard",
        inr: 32000,
        usd: 429,
        turnaroundDays: 7,
        deliverables: [
          "Interactive PowerBI / Looker Studio dashboard connected to live sheets",
          "Customer churn, cohort analysis, and product profitability matrix",
          "Automated daily refresh and PDF email delivery to executives"
        ]
      },
      enterprise: {
        name: "Predictive Analytics & Revenue Attribution Engine",
        inr: 85000,
        usd: 1149,
        turnaroundDays: 14,
        deliverables: [
          "Multi-touch marketing revenue attribution modeling",
          "Predictive customer lifetime value (LTV) and inventory demand forecasting",
          "Direct database ETL pipeline (PostgreSQL / MySQL / BigQuery)",
          "Full documentation, training video walkthrough, and source files"
        ]
      }
    }
  },

  RESEARCH_SERVICES: {
    id: "RESEARCH_SERVICES",
    name: "Research Services",
    description: "Rigorous academic, industry, competitive, and scientific research syntheses.",
    marginPercent: 95,
    pricingTiers: {
      starter: {
        name: "Quick Horizon Research Brief",
        inr: 8000,
        usd: 99,
        turnaroundDays: 3,
        deliverables: [
          "10-page synthesized dossier on specific market topic or technology",
          "Verified source citations, charts, and key player breakdown",
          "Executive 1-page summary for decision makers"
        ]
      },
      pro: {
        name: "Deep Competitive Intelligence Dossier",
        inr: 25000,
        usd: 329,
        turnaroundDays: 7,
        deliverables: [
          "Deep-dive analysis of top 5 competitors (pricing, tech stack, hiring, strategy)",
          "Customer review sentiment extraction & unmet market gaps",
          "SWOT matrix and tactical positioning recommendations"
        ]
      },
      enterprise: {
        name: "Comprehensive Industry Whitepaper & Patent Scan",
        inr: 65000,
        usd: 859,
        turnaroundDays: 15,
        deliverables: [
          "30+ page publication-grade industry analysis document",
          "Patent, regulatory, and cross-border trade framework inspection",
          "Expert commentary synthesis and 5-year trend projections"
        ]
      }
    }
  },

  GRAPHIC_DESIGN: {
    id: "GRAPHIC_DESIGN",
    name: "Graphic Design",
    description: "Premium visual branding, pitch decks, infographics, and marketing collaterals.",
    marginPercent: 91,
    pricingTiers: {
      starter: {
        name: "Brand Essentials Kit",
        inr: 9000,
        usd: 119,
        turnaroundDays: 3,
        deliverables: [
          "Modern vector logo with dark/light variants",
          "Brand typography, color palette, and usage guidelines sheet",
          "Social media profile banner & avatar pack"
        ]
      },
      pro: {
        name: "Investor Pitch Deck & Collateral Suite",
        inr: 26000,
        usd: 349,
        turnaroundDays: 6,
        deliverables: [
          "15-slide high-impact investor pitch deck in Figma / PowerPoint",
          "Custom visual diagrams, product mockups, and financial charts",
          "Print-ready marketing flyer and digital PDF brochures"
        ]
      },
      enterprise: {
        name: "Full Corporate Identity System",
        inr: 70000,
        usd: 929,
        turnaroundDays: 14,
        deliverables: [
          "Complete corporate design guidelines (100-page manual)",
          "Merchandise, packaging, and office stationery assets",
          "Comprehensive Figma component library & icon system",
          "All vector source files with full commercial copyright transfer"
        ]
      }
    }
  },

  VIDEO_EDITING: {
    id: "VIDEO_EDITING",
    name: "Video Editing",
    description: "Attention-grabbing short-form reels, product explainer videos, and YouTube podcasts.",
    marginPercent: 88,
    pricingTiers: {
      starter: {
        name: "Viral Short-Form Pack (5 Reels/Shorts)",
        inr: 10000,
        usd: 129,
        turnaroundDays: 4,
        deliverables: [
          "5 x 60s vertical videos edited with dynamic kinetic captions",
          "Sound design, sound effects (SFX), and color grade",
          "B-roll cutaways and retention-maximizing pacing"
        ]
      },
      pro: {
        name: "Monthly YouTube / Video Retainer (4 Long Videos + 10 Shorts)",
        inr: 32000,
        usd: 429,
        turnaroundDays: 20,
        deliverables: [
          "4 x 10-15 minute long-form videos with custom thumbnails",
          "10 repurposed viral short clips with motion graphics",
          "Audio de-noising, voice enhancement, and copyright-free soundtracks",
          "Fast 48-hour turnarounds per batch"
        ]
      },
      enterprise: {
        name: "Commercial Brand Video & 3D Motion Graphics",
        inr: 80000,
        usd: 1049,
        turnaroundDays: 15,
        deliverables: [
          "90-second high-end 3D product showcase / commercial video",
          "Professional voiceover recording & custom musical score",
          "Cinema-grade 4K render and multi-aspect ratio delivery (16:9, 9:16, 1:1)",
          "Unlimited storyboard iterations prior to final render"
        ]
      }
    }
  },

  BUSINESS_AUTOMATION: {
    id: "BUSINESS_AUTOMATION",
    name: "Business Automation",
    description: "Eliminate repetitive tasks by interconnecting software via APIs, webhooks, and AI workflows.",
    marginPercent: 96,
    pricingTiers: {
      starter: {
        name: "Single Workflow Automation",
        inr: 12000,
        usd: 159,
        turnaroundDays: 3,
        deliverables: [
          "Connect 3 apps (e.g., Lead Form -> CRM -> Slack Notification -> Email)",
          "Error-handling logic and failure alert channel",
          "30 days monitoring and support"
        ]
      },
      pro: {
        name: "Full Department Automation Suite",
        inr: 38000,
        usd: 499,
        turnaroundDays: 8,
        deliverables: [
          "Automate sales pipeline, invoicing, client onboarding, and reminders",
          "AI auto-responder and document summarization hooks",
          "Custom dashboard monitoring task execution runs and error rates",
          "Video walkthrough and operations SOP guide"
        ]
      },
      enterprise: {
        name: "Custom Enterprise Autonomous Integration",
        inr: 110000,
        usd: 1450,
        turnaroundDays: 18,
        deliverables: [
          "Custom self-hosted Node.js / Docker microservice replacing costly Zapier/Make accounts",
          "Direct enterprise ERP / CRM / Payment gateway bi-directional sync",
          "Zero-data-loss guaranteed queue architecture with replay log",
          "Dedicated 6-month uptime SLA"
        ]
      }
    }
  },

  AGRITECH_CONSULTING: {
    id: "AGRITECH_CONSULTING",
    name: "Agricultural Technology Consulting",
    description: "Modern farming yield optimization, precision sensor automation, and supply-chain market advisory.",
    marginPercent: 91,
    pricingTiers: {
      starter: {
        name: "Farm Technology Readiness Assessment",
        inr: 15000,
        usd: 199,
        turnaroundDays: 5,
        deliverables: [
          "Soil, irrigation, and crop cycle tech assessment report",
          "Cost-benefit analysis of precision sensors vs. traditional methods",
          "Curated list of low-cost IoT hardware and government subsidy programs"
        ]
      },
      pro: {
        name: "Precision Irrigation & Climate Automation Plan",
        inr: 45000,
        usd: 599,
        turnaroundDays: 10,
        deliverables: [
          "Complete IoT schematic for smart valve & soil moisture automation",
          "Weather-adaptive irrigation schedule and fertilizer dosage algorithms",
          "Remote monitoring mobile dashboard architecture blueprint"
        ]
      },
      enterprise: {
        name: "Commercial Agro-Enterprise Optimization Roadmap",
        inr: 125000,
        usd: 1650,
        turnaroundDays: 20,
        deliverables: [
          "Farm-to-fork supply chain traceability & cold-storage telemetry design",
          "Drone survey data processing & disease prediction model guidelines",
          "Energy efficiency blueprint incorporating solar pumping and storage",
          "On-site / remote engineer training workshop"
        ]
      }
    }
  },

  AI_AGENT_DEV: {
    id: "AI_AGENT_DEV",
    name: "AI Agent Development",
    description: "Autonomous reasoning agents with tool usage, memory, multi-step planning, and web execution.",
    marginPercent: 97,
    pricingTiers: {
      starter: {
        name: "Task-Specific Single Agent",
        inr: 20000,
        usd: 259,
        turnaroundDays: 4,
        deliverables: [
          "Autonomous agent executing specific task (e.g. web research, lead scraping, document filing)",
          "Clean Node.js / Python standalone codebase with zero external SaaS fees",
          "CLI interface and scheduled cron execution"
        ]
      },
      pro: {
        name: "Multi-Agent Specialist Swarm",
        inr: 60000,
        usd: 789,
        turnaroundDays: 10,
        deliverables: [
          "Collaborative 3-agent swarm (Researcher, Synthesizer, Quality Auditor)",
          "Shared memory graph and reflection/self-correction loops",
          "REST API and Webhook endpoints for external triggering",
          "Comprehensive unit tests and docker container"
        ]
      },
      enterprise: {
        name: "Autonomous Business Operations Agent OS",
        inr: 150000,
        usd: 1950,
        turnaroundDays: 20,
        deliverables: [
          "Hierarchical agent organization with Meta-Governor oversight",
          "Tool integration across browser automation, database, email, and shell",
          "Adversarial falsification gates preventing hallucination in high-stakes decisions",
          "Full source code ownership, private deployment, and lifetime architecture documentation"
        ]
      }
    }
  },

  CUSTOMER_SUPPORT: {
    id: "CUSTOMER_SUPPORT",
    name: "Customer Support Services",
    description: "Hybrid AI + human-in-the-loop 24/7 ticket resolution, live chat, and help center management.",
    marginPercent: 89,
    pricingTiers: {
      starter: {
        name: "Help Center & Knowledge Base Overhaul",
        inr: 12000,
        usd: 159,
        turnaroundDays: 5,
        deliverables: [
          "20 comprehensive FAQ and trouble-shooting guides with screenshots",
          "Categorized help desk taxonomy (Zendesk / Freshdesk / Intercom)",
          "5 automated canned responses for common edge cases"
        ]
      },
      pro: {
        name: "24/7 AI-First Hybrid Support Setup",
        inr: 35000,
        usd: 459,
        turnaroundDays: 10,
        deliverables: [
          "Instant automated deflection of 70%+ routine tickets via AI agent",
          "Seamless handoff to human agents with summarized context",
          "Customer satisfaction (CSAT) survey integration",
          "Weekly ticket sentiment and issue-root-cause report"
        ]
      },
      enterprise: {
        name: "Dedicated Tier-1 & Tier-2 Support SLA Retainer",
        inr: 80000,
        usd: 1049,
        turnaroundDays: 30,
        deliverables: [
          "Round-the-clock 15-minute response time SLA",
          "Multi-channel coverage (Email, Live Chat, WhatsApp)",
          "Bi-weekly bug filing with client engineering team",
          "Monthly customer retention & NPS score review"
        ]
      }
    }
  },

  LEAD_GENERATION: {
    id: "LEAD_GENERATION",
    name: "Lead Generation",
    description: "Targeted B2B prospect list curation, verified email enrichment, and multichannel outreach workflows.",
    marginPercent: 93,
    pricingTiers: {
      starter: {
        name: "Targeted 250 B2B Prospect List",
        inr: 9000,
        usd: 119,
        turnaroundDays: 3,
        deliverables: [
          "250 verified high-level decision makers in target niche",
          "Enriched with name, job title, company size, verified email, LinkedIn URL",
          "Zero-bounce rate guarantee with SMTP verification"
        ]
      },
      pro: {
        name: "Cold Outreach Pipeline (1,000 Leads + Sequence)",
        inr: 28000,
        usd: 369,
        turnaroundDays: 8,
        deliverables: [
          "1,000 highly targeted verified B2B leads across specified geography",
          "3-step personalized cold email sequence customized by industry pain points",
          "Spam-filter audit, inbox warmup guide, and follow-up cadence"
        ]
      },
      enterprise: {
        name: "Done-For-You Outbound Sales Machine",
        inr: 75000,
        usd: 989,
        turnaroundDays: 20,
        deliverables: [
          "3,000 verified decision makers with advanced buying intent signals",
          "Multichannel campaign execution (Email + LinkedIn soft touches)",
          "CRM integration and direct calendar booking for qualified prospects",
          "Guaranteed minimum qualified meeting opportunities"
        ]
      }
    }
  },

  MARKET_RESEARCH: {
    id: "MARKET_RESEARCH",
    name: "Market Research",
    description: "Total addressable market (TAM), pricing elasticity, demographic analysis, and regulatory feasibility studies.",
    marginPercent: 94,
    pricingTiers: {
      starter: {
        name: "TAM & Target Audience Snapshot",
        inr: 10000,
        usd: 129,
        turnaroundDays: 4,
        deliverables: [
          "Quantified Total Addressable Market (TAM), SAM, and SOM calculation",
          "3 detailed ideal customer profiles (ICPs) with pain point maps",
          "Executive 10-slide summary presentation"
        ]
      },
      pro: {
        name: "Comprehensive Market Feasibility Study",
        inr: 32000,
        usd: 429,
        turnaroundDays: 9,
        deliverables: [
          "Detailed pricing sensitivity study and product packaging benchmarks",
          "Regulatory, tax, and compliance overview for target jurisdictions",
          "Supply chain risk and customer willingness-to-pay surveys"
        ]
      },
      enterprise: {
        name: "Full Commercial Go-To-Market Master Blueprint",
        inr: 85000,
        usd: 1149,
        turnaroundDays: 18,
        deliverables: [
          "50-page authoritative market opportunity dossier with statistical models",
          "Direct distributor/channel partner contact pipeline",
          "Financial projections (3-year revenue, gross margin, payback period)",
          "Executive strategy consultation call and investor-ready presentation"
        ]
      }
    }
  }
};

/**
 * Helper to fetch all services
 */
export function getAllServices() {
  return Object.values(SERVICE_CATEGORIES);
}

/**
 * Helper to get a specific service by ID
 */
export function getServiceById(serviceId) {
  return SERVICE_CATEGORIES[serviceId] || null;
}
