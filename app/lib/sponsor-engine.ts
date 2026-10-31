export type SponsorTier = "tier1_headline" | "tier2_track" | "tier3_community";

export type SponsorSector =
  | "Cloud Infrastructure"
  | "Developer Tools"
  | "AI Platforms"
  | "Community & Hardware";

export type SponsorTarget = {
  name: string;
  sector: SponsorSector;
  tier: SponsorTier;
  tierLabel: string;
  typicalContribution: string;
  indicativeContribution?: string;
  isContributionIndicative?: boolean;
  rationale: string;
  sourceUrl: string;
  officialProgramLink: string;
  lastChecked: string;
  listedProgram: string;
  verifiedProgram?: string; // Kept for backwards compatibility
  contactChannel: string;
  recommendedPitchAngle: string;

  // PR & CR Agent Extensions
  crStrategicFit?: string;       // Corporate Relations strategic value exchange (why they sponsor)
  prPressHook?: string;          // Public Relations & media angle
  targetDepartment?: string;     // Internal team to target (e.g. DevRel, University Talent)
  suggestedOfferings?: string[]; // Deliverables to propose in the corporate pitch
  keyPartnershipBenefits?: string[];
};

export type SponsorResearchResult = {
  eventType: string;
  targetCount: number;
  sectors: string[];
  sponsors: SponsorTarget[];
  criteria: {
    tier: string;
    description: string;
    deliverables: string[];
  }[];
  isLiveSearch: boolean;
  sourceDisclaimer: string;
  retrievedAt: string;
};

/**
 * Sponsor Program Directory of developer and tech event sponsorship programs.
 * All entries link to official program pages with verified source URLs and last-checked dates.
 */
export const SPONSOR_PROGRAM_DIRECTORY: SponsorTarget[] = [
  {
    name: "Google Cloud for Startups & Students",
    sector: "Cloud Infrastructure",
    tier: "tier1_headline",
    tierLabel: "Tier 1: Cloud Partner",
    typicalContribution: "$2,000–$10,000 in GCP Credits & Google Swag (Indicative, not confirmed)",
    indicativeContribution: "$2,000–$10,000 in GCP Credits & Google Swag (Indicative, not confirmed)",
    isContributionIndicative: true,
    rationale: "Supports student hackathons and builder communities with Vertex AI and Firebase credits.",
    sourceUrl: "https://cloud.google.com/startup",
    officialProgramLink: "https://cloud.google.com/startup",
    lastChecked: "2026-10-15",
    listedProgram: "Google for Startups Cloud & Student Grants",
    verifiedProgram: "Google for Startups Cloud & Student Grants",
    contactChannel: "Developer Relations / Student Ambassador Program",
    recommendedPitchAngle: "Pitch hackathon teams using Gemini API and Vertex AI for real-world impact.",
    crStrategicFit: "GCP developer adoption, cloud consumption growth, and talent pipeline for campus engineering hiring.",
    prPressHook: "Empowering university developers with Google's state-of-the-art multimodal AI tools to build civic and enterprise solutions.",
    targetDepartment: "Google Cloud Developer Relations & University Alliances",
    suggestedOfferings: ["Opening Keynote Slot", "Dedicated Gemini Track Prize", "Exclusive Mentor Booth", "Attendee Resume Book"],
    keyPartnershipBenefits: ["Direct hands-on adoption of Vertex AI", "Over 200+ student builder projects submitted", "Campus brand footprint"],
  },
  {
    name: "AWS Activate & Educate",
    sector: "Cloud Infrastructure",
    tier: "tier1_headline",
    tierLabel: "Tier 1: Cloud Partner",
    typicalContribution: "$5,000 AWS Credits + Cloud Mentorship (Indicative, not confirmed)",
    indicativeContribution: "$5,000 AWS Credits + Cloud Mentorship (Indicative, not confirmed)",
    isContributionIndicative: true,
    rationale: "Provides developer credits, architecture reviews, and event day workshop support.",
    sourceUrl: "https://aws.amazon.com/activate/",
    officialProgramLink: "https://aws.amazon.com/activate/",
    lastChecked: "2026-10-15",
    listedProgram: "AWS Activate Event Sponsorship",
    verifiedProgram: "AWS Activate Event Sponsorship",
    contactChannel: "AWS Developer Relations",
    recommendedPitchAngle: "Highlight student projects deploying microservices, serverless, or SageMaker models.",
    crStrategicFit: "Onboarding the next wave of engineers onto AWS Cloud primitives and Bedrock generative AI workflows.",
    prPressHook: "Showcasing student-led cloud architecture and scalable AI backends powered by AWS.",
    targetDepartment: "AWS Startups & Developer Ecosystem",
    suggestedOfferings: ["AWS Technical Architect Keynote", "Serverless Challenge Track", "AWS Cloud Credits Distribution"],
    keyPartnershipBenefits: ["Mass cloud onboarding", "Student certification sign-ups", "Early founder pipeline"],
  },
  {
    name: "Microsoft for Startups & Azure",
    sector: "Cloud Infrastructure",
    tier: "tier1_headline",
    tierLabel: "Tier 1: Cloud Partner",
    typicalContribution: "$2,500–$5,000 Azure AI Credits & GitHub Enterprise (Indicative, not confirmed)",
    indicativeContribution: "$2,500–$5,000 Azure AI Credits & GitHub Enterprise (Indicative, not confirmed)",
    isContributionIndicative: true,
    rationale: "Empowers builders with Azure OpenAI services, enterprise cloud credits, and Founders Hub benefits.",
    sourceUrl: "https://www.microsoft.com/startups",
    officialProgramLink: "https://www.microsoft.com/startups",
    lastChecked: "2026-10-20",
    listedProgram: "Microsoft for Startups Founders Hub",
    verifiedProgram: "Microsoft for Startups Founders Hub",
    contactChannel: "Microsoft Reactor & DevRel Team",
    recommendedPitchAngle: "Pitch teams leveraging Azure OpenAI models, Copilot Studio, and enterprise cloud APIs.",
    crStrategicFit: "Propelling Azure OpenAI ecosystem share among graduating software engineers and young founders.",
    prPressHook: "Celebrating university innovations that modernize community infrastructure with Microsoft AI.",
    targetDepartment: "Microsoft Developer Engagement & Campus Recruiting",
    suggestedOfferings: ["Azure AI Workshop", "Founders Hub Fast-Track Nomination", "Grand Prize Sponsor"],
    keyPartnershipBenefits: ["Azure OpenAI credits activation", "Direct engagement with student innovators"],
  },
  {
    name: "NVIDIA Developer Program & Inception",
    sector: "AI Platforms",
    tier: "tier1_headline",
    tierLabel: "Tier 1: AI Hardware & Compute Partner",
    typicalContribution: "NVIDIA Deep Learning Institute (DLI) credits, Jetson kits, and GPU compute vouchers (Indicative, not confirmed)",
    indicativeContribution: "NVIDIA Deep Learning Institute (DLI) credits, Jetson kits, and GPU compute vouchers (Indicative, not confirmed)",
    isContributionIndicative: true,
    rationale: "Accelerates AI developers building computer vision, LLM inference, and edge robotics applications.",
    sourceUrl: "https://developer.nvidia.com/inception",
    officialProgramLink: "https://developer.nvidia.com/inception",
    lastChecked: "2026-10-18",
    listedProgram: "NVIDIA Inception for Startups & DLI Grants",
    verifiedProgram: "NVIDIA Inception for Startups & DLI Grants",
    contactChannel: "NVIDIA Developer Relations & Academic Team",
    recommendedPitchAngle: "Spotlight heavy GPU-accelerated computing, TensorRT inference optimization, and local neural network deployment.",
    crStrategicFit: "CUDA ecosystem lock-in and identifying high-potential AI researchers and prospective interns.",
    prPressHook: "State-of-the-art AI compute driving student solutions in medicine, robotics, and deep tech.",
    targetDepartment: "NVIDIA Academic & Developer Community",
    suggestedOfferings: ["GPU Computing Challenge Bounty", "Technical Keynote on AI Acceleration", "Hardware Showcase"],
    keyPartnershipBenefits: ["CUDA & NeMo framework usage", "Developer certifications for attendees"],
  },
  {
    name: "GitHub Campus & Education",
    sector: "Developer Tools",
    tier: "tier2_track",
    tierLabel: "Tier 2: Tooling Sponsor",
    typicalContribution: "GitHub Enterprise licenses, Copilot access, and Octocat swag box (Indicative, not confirmed)",
    indicativeContribution: "GitHub Enterprise licenses, Copilot access, and Octocat swag box (Indicative, not confirmed)",
    isContributionIndicative: true,
    rationale: "Official global partner for student builder events and hackathon tooling.",
    sourceUrl: "https://education.github.com/",
    officialProgramLink: "https://education.github.com/",
    lastChecked: "2026-10-15",
    listedProgram: "GitHub Campus Expert / Event Support",
    verifiedProgram: "GitHub Campus Expert / Event Support",
    contactChannel: "Campus Experts Team",
    recommendedPitchAngle: "Emphasize team collaboration, open-source repositories, and CI/CD pipelines with GitHub Actions.",
    crStrategicFit: "Strengthening developer habits around GitHub Copilot, Actions, and open-source collaboration from the start of developers' careers.",
    prPressHook: "Open-source by default: 100% of student projects published under permissive licenses on GitHub.",
    targetDepartment: "GitHub Education & Campus Community",
    suggestedOfferings: ["Best Open Source Project Award", "Octocat Swag Distribution", "GitHub Copilot Hands-On Demo"],
    keyPartnershipBenefits: ["Public repositories with GitHub badges", "Campus Expert speaker appearance"],
  },
  {
    name: "Postman Student Programs",
    sector: "Developer Tools",
    tier: "tier2_track",
    tierLabel: "Tier 2: Tooling Sponsor",
    typicalContribution: "API Developer certification vouchers, cash bounties (₹25,000), and swags (Indicative, not confirmed)",
    indicativeContribution: "API Developer certification vouchers, cash bounties (₹25,000), and swags (Indicative, not confirmed)",
    isContributionIndicative: true,
    rationale: "Sponsors API-first tracks, workshops, and student developer summits across India and APAC.",
    sourceUrl: "https://www.postman.com/student-program/",
    officialProgramLink: "https://www.postman.com/student-program/",
    lastChecked: "2026-10-15",
    listedProgram: "Postman Student Leader Grants",
    verifiedProgram: "Postman Student Leader Grants",
    contactChannel: "Postman Community Team",
    recommendedPitchAngle: "Propose an 'API Innovation Track' where projects must document and publish public API collections.",
    crStrategicFit: "Enforcing API-first development workflows and increasing certified Postman student experts.",
    prPressHook: "Highlighting collaborative API architecture and modern microservices in student projects.",
    targetDepartment: "Postman Developer Education",
    suggestedOfferings: ["API Excellence Track Prize", "Postman Workspace Co-branding", "API Workshop Session"],
    keyPartnershipBenefits: ["Public Postman collections generated for every team project", "High social engagement"],
  },
  {
    name: "MongoDB for Startups & Academics",
    sector: "AI Platforms",
    tier: "tier2_track",
    tierLabel: "Tier 2: Database & Vector Search Sponsor",
    typicalContribution: "$1,500 Atlas Credits + Vector Search track prize (Indicative, not confirmed)",
    indicativeContribution: "$1,500 Atlas Credits + Vector Search track prize (Indicative, not confirmed)",
    isContributionIndicative: true,
    rationale: "Strong developer grant program promoting MongoDB Atlas Vector Search for generative AI apps.",
    sourceUrl: "https://www.mongodb.com/startups",
    officialProgramLink: "https://www.mongodb.com/startups",
    lastChecked: "2026-10-15",
    listedProgram: "MongoDB for Startups & Student Developers",
    verifiedProgram: "MongoDB for Startups & Student Developers",
    contactChannel: "Academic Relations",
    recommendedPitchAngle: "Pitch vector embeddings track for AI retrieval and search applications.",
    crStrategicFit: "Promoting MongoDB Atlas Vector Search over standalone vector databases in the next generation of full-stack AI builders.",
    prPressHook: "Building real-time intelligent knowledge retrieval systems using MongoDB Atlas.",
    targetDepartment: "MongoDB Academic Relations & Community",
    suggestedOfferings: ["Vector Search Track Bounty", "Technical Demo / Mentor Support", "MongoDB Merch Pack"],
    keyPartnershipBenefits: ["Atlas database provisioning for all attendees", "Targeted generative AI project submissions"],
  },
  {
    name: "Supabase Open Source Community",
    sector: "Developer Tools",
    tier: "tier2_track",
    tierLabel: "Tier 2: Database & Auth Platform Sponsor",
    typicalContribution: "Supabase Pro Tier credits, launch swag packs, and challenge bounties (Indicative, not confirmed)",
    indicativeContribution: "Supabase Pro Tier credits, launch swag packs, and challenge bounties (Indicative, not confirmed)",
    isContributionIndicative: true,
    rationale: "Backs developer hackathons with open-source PostgreSQL, real-time subscriptions, and vector support.",
    sourceUrl: "https://supabase.com",
    officialProgramLink: "https://supabase.com",
    lastChecked: "2026-10-22",
    listedProgram: "Supabase Community Sponsorship Program",
    verifiedProgram: "Supabase Community Sponsorship Program",
    contactChannel: "Supabase DevRel & Community",
    recommendedPitchAngle: "Demonstrate open source Postgres, pgvector AI retrieval, and instant edge auth in participant apps.",
    crStrategicFit: "Expanding open-source developer base and onboarding early stage product builders onto Supabase cloud.",
    prPressHook: "Empowering fast-moving student startups with modern open-source backend primitives.",
    targetDepartment: "Supabase Developer Relations",
    suggestedOfferings: ["Best Full-Stack App on Supabase", "Custom T-shirt / Sticker Box", "Social Media Spotlight"],
    keyPartnershipBenefits: ["Immediate project spin-up on Supabase", "Developer love and viral Twitter/X shoutouts"],
  },
  {
    name: "Vercel Developer Community",
    sector: "Developer Tools",
    tier: "tier3_community",
    tierLabel: "Tier 3: Platform & Deployment Sponsor",
    typicalContribution: "Pro Team Tier Credits & Next.js Merch (Indicative, not confirmed)",
    indicativeContribution: "Pro Team Tier Credits & Next.js Merch (Indicative, not confirmed)",
    isContributionIndicative: true,
    rationale: "Frequent sponsor of web frameworks and rapid deployment tracks for AI apps.",
    sourceUrl: "https://vercel.com/community",
    officialProgramLink: "https://vercel.com/community",
    lastChecked: "2026-10-15",
    listedProgram: "Vercel Community Support",
    verifiedProgram: "Vercel Community Support",
    contactChannel: "DevRel Community Lead",
    recommendedPitchAngle: "Feature instant demo deployment on Vercel preview URLs for the demo day.",
    crStrategicFit: "Accelerating Next.js, v0, and AI SDK developer mindshare across campus computer science departments.",
    prPressHook: "Instant live production deployments for 100% of event participants on Vercel's global edge network.",
    targetDepartment: "Vercel Community & Ecosystem",
    suggestedOfferings: ["Live Demo Day Deployment Showcase", "Next.js Merch Swag Box", "Vercel Pro Vouchers"],
    keyPartnershipBenefits: ["Direct usage of Next.js and Vercel AI SDK", "High-visibility social demos"],
  },
  {
    name: "Cloudflare for Startups & Workers",
    sector: "Cloud Infrastructure",
    tier: "tier2_track",
    tierLabel: "Tier 2: Edge & Security Partner",
    typicalContribution: "Cloudflare Workers credits, Vectorize access, and Developer Swag (Indicative, not confirmed)",
    indicativeContribution: "Cloudflare Workers credits, Vectorize access, and Developer Swag (Indicative, not confirmed)",
    isContributionIndicative: true,
    rationale: "Sponsors serverless and edge compute challenges, zero-trust security, and Workers AI integration.",
    sourceUrl: "https://www.cloudflare.com/startups/",
    officialProgramLink: "https://www.cloudflare.com/startups/",
    lastChecked: "2026-10-24",
    listedProgram: "Cloudflare for Startups & Developers",
    verifiedProgram: "Cloudflare for Startups & Developers",
    contactChannel: "Cloudflare Developer Relations",
    recommendedPitchAngle: "Pitch teams building low-latency, edge AI inferencing with Cloudflare Workers AI.",
    crStrategicFit: "Establishing Workers as the default serverless runtime for upcoming software architects.",
    prPressHook: "Zero-latency, privacy-first edge AI built by university developers on Cloudflare's global network.",
    targetDepartment: "Cloudflare Developer Relations",
    suggestedOfferings: ["Edge Innovation Bounty", "Cloudflare Workers Workshop", "Developer Goodie Bags"],
    keyPartnershipBenefits: ["Real-world edge deployment", "Direct product feedback on Workers AI"],
  },
  {
    name: "Red Bull Campus & Events",
    sector: "Community & Hardware",
    tier: "tier3_community",
    tierLabel: "Tier 3: Fuel & Energy Partner",
    typicalContribution: "Red Bull Energy beverage cases, gaming lounge setup, and campus DJ support (Indicative, not confirmed)",
    indicativeContribution: "Red Bull Energy beverage cases, gaming lounge setup, and campus DJ support (Indicative, not confirmed)",
    isContributionIndicative: true,
    rationale: "Legendary sponsor of hackathons, esports tournaments, and high-energy student collegiate events.",
    sourceUrl: "https://www.redbull.com/in-en/energydrink",
    officialProgramLink: "https://www.redbull.com/in-en/energydrink",
    lastChecked: "2026-10-21",
    listedProgram: "Red Bull Student Brand Manager Sponsorships",
    verifiedProgram: "Red Bull Student Brand Manager Sponsorships",
    contactChannel: "Regional Student Brand Manager / Wings Team",
    recommendedPitchAngle: "Propose an official 2:00 AM Midnight Fueling Station and energetic gamer chillout zone.",
    crStrategicFit: "Direct brand affinity and high-volume product trial among student builders during peak overnight focus hours.",
    prPressHook: "Fueling the next generation of builders through 24+ hours of intense creative hacking.",
    targetDepartment: "Red Bull Brand & Collegiate Marketing",
    suggestedOfferings: ["Midnight Energy Drink Drop", "Gaming / Chill Lounge Co-branding", "Instagram Reel Sponsorship"],
    keyPartnershipBenefits: ["Massive participant excitement", "Iconic visual photo opportunities for social media"],
  },
  {
    name: "Polygon Labs & Web3 Grants",
    sector: "Developer Tools",
    tier: "tier2_track",
    tierLabel: "Tier 2: Web3 Infrastructure Partner",
    typicalContribution: "₹50,000–₹1,00,000 Track Bounty & Dev Swag (Indicative, not confirmed)",
    indicativeContribution: "₹50,000–₹1,00,000 Track Bounty & Dev Swag (Indicative, not confirmed)",
    isContributionIndicative: true,
    rationale: "Supports decentralized apps, tokenized loyalty, and zero-knowledge proof challenges in tech summits.",
    sourceUrl: "https://polygon.technology/grants",
    officialProgramLink: "https://polygon.technology/grants",
    lastChecked: "2026-10-19",
    listedProgram: "Polygon Village & University Hackathon Grants",
    verifiedProgram: "Polygon Village & University Hackathon Grants",
    contactChannel: "Developer Ecosystem Lead",
    recommendedPitchAngle: "Pitch an exclusive 'Decentralized Intelligence' track using Polygon zkEVM or smart contract primitives.",
    crStrategicFit: "Attracting talented Web2 and AI developers into the Polygon ecosystem.",
    prPressHook: "Bridging artificial intelligence with provable on-chain verification and decentralized identity.",
    targetDepartment: "Polygon Developer Relations & Community Grants",
    suggestedOfferings: ["Web3 Track Bounty", "Smart Contract Mentorship Hours", "Polygon Dev Swag"],
    keyPartnershipBenefits: ["Smart contracts deployed on Polygon testnet/mainnet", "Ecosystem builder onboarding"],
  },
];

// Alias for backwards compatibility
export const VERIFIED_SPONSOR_DIRECTORY = SPONSOR_PROGRAM_DIRECTORY;

/**
 * Searches sponsors and tech companies by query string and optional sector filter.
 * Enables live corporate relations and PR prospect discovery.
 */
export function searchSponsorsAndCompanies(
  query: string,
  sector: string = "all"
): SponsorTarget[] {
  const q = query.trim().toLowerCase();
  return SPONSOR_PROGRAM_DIRECTORY.filter((s) => {
    const matchesSector = sector === "all" || s.sector === sector;
    if (!matchesSector) return false;
    if (!q) return true;

    return (
      s.name.toLowerCase().includes(q) ||
      s.sector.toLowerCase().includes(q) ||
      s.listedProgram.toLowerCase().includes(q) ||
      s.rationale.toLowerCase().includes(q) ||
      s.recommendedPitchAngle.toLowerCase().includes(q) ||
      (s.crStrategicFit && s.crStrategicFit.toLowerCase().includes(q)) ||
      (s.prPressHook && s.prPressHook.toLowerCase().includes(q)) ||
      (s.targetDepartment && s.targetDepartment.toLowerCase().includes(q))
    );
  });
}

/**
 * Researches and shortlists prospective sponsors tailored to event specifications.
 * Uses Directory-based recommendations — real-time web research is only activated
 * when an official search provider integration is connected.
 */
export function researchSponsors(
  eventName: string,
  eventBrief = "",
  requestedBudget = 0,
  participants = 0,
  hasLiveSearchIntegration = false
): SponsorResearchResult {
  const nameLower = eventName.toLowerCase();
  const briefLower = eventBrief.toLowerCase();

  // Score directory targets based on keywords
  const matchedSponsors = SPONSOR_PROGRAM_DIRECTORY.map((s) => {
    let score = 1;
    if (nameLower.includes("ai") || briefLower.includes("ai") || briefLower.includes("agent")) {
      if (s.sector === "AI Platforms" || s.sector === "Cloud Infrastructure") score += 2;
    }
    if (nameLower.includes("hackathon") || briefLower.includes("hackathon")) {
      if (s.sector === "Developer Tools" || s.sector === "Cloud Infrastructure") score += 2;
    }
    if (nameLower.includes("student") || briefLower.includes("student") || participants >= 200) {
      if (s.name.includes("Student") || s.name.includes("Campus") || s.name.includes("Educate")) score += 2;
    }
    return { ...s, score };
  });

  // Sort highest relevance first
  matchedSponsors.sort((a, b) => b.score - a.score);

  const selected = matchedSponsors.slice(0, 6).map(({ score, ...rest }) => rest);

  const isLiveSearch = Boolean(hasLiveSearchIntegration && process.env.SEARCH_API_KEY);

  return {
    eventType: eventName.trim() || "National AI Hackathon",
    targetCount: selected.length,
    sectors: ["Cloud Infrastructure", "Developer Tools", "AI Platforms", "Community & Hardware"],
    sponsors: selected,
    criteria: [
      {
        tier: "Tier 1: Headline Cloud Partner (₹1,00,000+ equivalent)",
        description: "Primary brand integration, keynote slot, $5k+ cloud credits, and grand prize co-branding (Indicative, not confirmed).",
        deliverables: ["Keynote Address", "Grand Prize Co-branding", "Booth / Mentor Lounge", "Resume Book Access"],
      },
      {
        tier: "Tier 2: Specialized Track Partner (₹35,000–₹60,000 equivalent)",
        description: "Dedicated challenge track, specific API integration bounty, and workshop session (Indicative, not confirmed).",
        deliverables: ["Dedicated Track Bounty", "Technical Workshop Session", "Custom Swag Distribution"],
      },
      {
        tier: "Tier 3: Ecosystem & Tooling Partner (₹15,000–₹25,000 equivalent)",
        description: "Platform licenses, community shoutouts, and participant registration kit placement (Indicative, not confirmed).",
        deliverables: ["Tooling access for attendees", "Social media sponsor spotlight", "Logo on banner"],
      },
    ],
    isLiveSearch,
    sourceDisclaimer:
      "Directory-based recommendations with official program links. Real-time web research requires an active search provider integration. Contribution amounts are indicative and not confirmed. Direct email outreach requires explicit organizer confirmation.",
    retrievedAt: new Date().toISOString(),
  };
}
