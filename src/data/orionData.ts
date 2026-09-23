import type { 
  ProblemStatement, 
  FAQItem, 
  PatronProfile, 
  OfficeBearer, 
  TimelinePhase, 
  RegisteredTeam, 
  StarNodeData,
  MicrosoftTech,
  JudgingCriterion
} from '../types/orion';

export const EVENT_METRICS = {
  prizePool: "₹1,00,000",
  round1Fee: "₹100",
  round1FeeLabel: "Flat per team",
  finalistFee: "₹250",
  finalistFeeLabel: "Per head (Top 70 finalists)",
  teamSize: "2–6",
  teamSizeLabel: "Members per team",
  finalistCount: "TOP 70",
  finalistCountLabel: "Teams to Offline Finale",
  datesTBA: "Announcing Soon",
  /** Round 1 / registration deadline — confirmed. */
  round1DatesAnnounced: true,
  deadlineDate: "September 30, 2026",
  deadlineIso: "2026-09-30T23:59:59+05:30",
  onlineDeadlineDate: "September 30, 2026",
  onlineDeadlineIso: "2026-09-30T23:59:59+05:30",
  /** Grand Finale date — flip to true and update the values below once confirmed. */
  finaleDateAnnounced: true,
  /** Finale date is a tentative hold, not yet locked — keep true until organisers confirm. */
  finaleDateTentative: true,
  offlineFinaleDate: "October 9–10, 2026 (Tentative)",
  offlineFinaleIso: "2026-10-09T09:00:00+05:30",
  duration: "24-Hour Offline Sprint",
  venue: "Sathyabama Institute of Science and Technology, Chennai",
  organizer: "Microsoft Club SIST",
  participation: "Students & Working Professionals",
  googleMapsUrl: "https://maps.google.com/?q=Sathyabama+Institute+of+Science+and+Technology+Chennai",
  registrationFormUrl: "https://forms.gle/txiRwn9EELUgZvrJ6"
};

/** Short uppercase IST date (e.g. "SEP 11, 2026") derived from an ISO string. */
export const formatShortDate = (iso: string): string =>
  new Date(iso)
    .toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric', timeZone: 'Asia/Kolkata' })
    .toUpperCase();

export const GOOGLE_FORM_REGISTRATION_URL = "https://forms.gle/txiRwn9EELUgZvrJ6";

/** Registration-related UI configuration. */

export const PRIZE_TIERS = [
  {
    rank: "1st Place",
    label: "CHAMPION / MISSION ALPHA",
    amount: "₹25,000",
    badge: "GRAND WINNER",
    accent: "from-cyan-400 via-teal-300 to-blue-500",
    border: "border-cyan-400/50",
    glow: "glow-cyan",
    perks: [
      "₹25,000 Cash Grant",
      "Direct Microsoft Mentor Network Access",
      "Grand Champion Aerospace Trophy",
      "Physical Certificate of Excellence",
      "Featured Club Showcase"
    ]
  },
  {
    rank: "1st Runner-Up",
    label: "MISSION BETA",
    amount: "₹15,000",
    badge: "1ST RUNNER-UP",
    accent: "from-purple-400 via-indigo-300 to-violet-500",
    border: "border-purple-400/50",
    glow: "glow-violet",
    perks: [
      "₹15,000 Cash Grant",
      "Ecosystem Cloud Credits & Perks",
      "Runner-Up Aerospace Trophy",
      "Physical Certificate of Merit",
      "Incubation Guidance"
    ]
  },
  {
    rank: "2nd Runner-Up",
    label: "MISSION GAMMA",
    amount: "₹10,000",
    badge: "2ND RUNNER-UP",
    accent: "from-amber-400 via-yellow-300 to-orange-500",
    border: "border-amber-400/50",
    glow: "glow-amber",
    perks: [
      "₹10,000 Cash Grant",
      "Ecosystem Swag & Mentorship",
      "Aerospace Trophy",
      "Physical Certificate of Merit"
    ]
  }
];

export const SPECIAL_TRACK_BOUNTIES = [
  {
    title: "Best AI Innovation",
    icon: "Cpu",
    description: "Breakthrough multi-modal, agentic or generative AI pipeline with high technical complexity.",
    reward: "Track Bounty + Recognition"
  },
  {
    title: "Best UI/UX Experience",
    icon: "Layout",
    description: "Exceptional cybernetic design, spatial clarity, accessibility and seamless user experience.",
    reward: "Track Bounty + Recognition"
  },
  {
    title: "Best Hardware Prototype",
    icon: "HardDrive",
    description: "Innovative IoT / embedded systems / robotics integration solving real-world physical challenges.",
    reward: "Track Bounty + Recognition"
  },
  {
    title: "Best Pitch & Architecture",
    icon: "Presentation",
    description: "Crisp technical defense, bulletproof system architecture, and clear commercial feasibility.",
    reward: "Track Bounty + Recognition"
  }
];

export const PROBLEM_STATEMENTS: ProblemStatement[] = [
  {
    id: "floatchat",
    code: "ORION-PS-01",
    title: "FLOATCHAT",
    tagline: "Multi-Modal Semantic Query Engine & 4D Visualization for ARGO Oceanographic Data",
    domain: "Ocean Informatics • Geospatial AI • 4D Visualization",
    accentColor: "cyan",
    visualTheme: "Deep Ocean Trench • Hydrothermal Holographics • ARGO Float Telemetry",
    overview: "Global ocean climate monitoring relies on thousands of autonomous robotic ARGO profiling floats drifting through ocean depths, sampling salinity, temperature, and geochemical variables from surface to 2,000m depth. FloatChat challenges builders to design an intelligent natural-language query interface and spat-temporal 4D WebGL visualization pipeline that allows marine scientists, oceanographers, and policy analysts to query, cross-correlate, and forecast marine anomalies using multi-modal LLMs.",
    keyFeatures: [
      "Natural Language to Geospatial/Temporal NetCDF Queries",
      "Interactive 4D Spatio-Temporal WebGL Trajectory Renderer",
      "Thermocline & Salinity Gradient Depth-Profile Cross-Sections",
      "Automated Marine Heatwave & Ocean Anomaly Detection"
    ],
    techStack: ["Next.js / React Three Fiber", "Python / FastFloat Engine", "ARGO NetCDF API", "Vector RAG (Chroma/Weaviate)", "Shader Material Trajectories"],
    deliverables: [
      "Interactive WebGL 4D marine data exploration portal",
      "Natural-language query engine with NetCDF multi-variable parsing",
      "Architecture diagram demonstrating low-latency spatio-temporal retrieval",
      "Demonstration of real ARGO profiling float telemetry ingestion"
    ],
    datasetSources: ["Global ARGO Data Repository (GDAC)", "Copernicus Marine Environment Service", "NOAA Ocean Climate Telemetry"],
    evaluationFocus: ["Query accuracy & RAG grounding", "Rendering performance of 100k+ coordinate points", "Scientific utility & intuitive UX", "Latency under multi-parameter filtering"],
    classificationLevel: "CLASSIFIED MISSION — OPEN TO ROUND 1"
  },
  {
    id: "lexvault",
    code: "ORION-PS-02",
    title: "LEXVAULT",
    tagline: "Zero-Knowledge, Blockchain-Powered eVault for Legal & Evidentiary Chains of Custody",
    domain: "Applied Cryptography • Zero-Knowledge Proofs • LegalTech",
    accentColor: "violet",
    visualTheme: "Cryptographic Vault • Immutable Blocks • ZK-SNARK Verification Mesh",
    overview: "Legal and digital forensic evidence must endure strict cryptographic scrutiny without leaking confidential client data or violating data privacy mandates during discovery. LexVault challenges engineers to architect a decentralized, tamper-evident digital evidence depository that uses Zero-Knowledge Proofs (ZK-SNARKs/STARKs) and verifiable ledger anchoring to prove forensic provenance, hash integrity, and chain of custody timelines without disclosing underlying evidentiary content.",
    keyFeatures: [
      "Zero-Knowledge Proof Generation for Document Authenticity",
      "Immutable Cryptographic Chain of Custody Audit Ledger",
      "Multi-Signature Role-Based Discovery Access Controls",
      "Tamper-Evident SHA-256 / Merkle Tree Forensic Verification"
    ],
    techStack: ["Circom / SnarkJS / Noir", "Solidity / Polygon / Arbitrum", "IPFS / Arweave Decentralized Storage", "TypeScript / Web Cryptography API", "Audit HUD"],
    deliverables: [
      "Zero-Knowledge proof generation and verification circuit demo",
      "Decentralized evidence vault interface with timestamped provenance",
      "Verifiable forensic custody logs with cryptographic signatures",
      "Technical architecture documentation with threat model analysis"
    ],
    datasetSources: ["Synthetic Legal Discovery Mock Corpus", "Forensic Disk Image EnCase Hashes", "NIST Computer Forensics Tool Testing"],
    evaluationFocus: ["Cryptographic soundness & zero-leakage guarantee", "Gas/Compute efficiency of proof verification", "Audit trail immutability", "Enterprise-grade legal usability"],
    classificationLevel: "CLASSIFIED MISSION — OPEN TO ROUND 1"
  },
  {
    id: "sylvasense",
    code: "ORION-PS-03",
    title: "SYLVASENSE",
    tagline: "Automated Tree Enumeration & Aboveground Biomass Estimation from Multi-Spectral & SAR Satellite Imagery",
    domain: "Earth Observation • Computer Vision • Climate Tech",
    accentColor: "emerald",
    visualTheme: "Canopy LiDAR Radar • Multi-Spectral SAR • High-Resolution Bio-Telemetry",
    overview: "Verifiable carbon offset verification and biodiversity preservation require high-resolution, scalable canopy density auditing. SylvaSense tasks builders with constructing an end-to-end computer vision and remote-sensing pipeline that merges optical Sentinel-2 / Landsat imagery with Synthetic Aperture Radar (SAR) Sentinel-1 and LiDAR datasets to accurately enumerate individual tree canopies, classify forest biomes, and estimate Aboveground Biomass (AGB) and carbon sequestration metrics.",
    keyFeatures: [
      "Multi-Spectral Optical + Synthetic Aperture Radar (SAR) Data Fusion",
      "High-Resolution Canopy Instance Segmentation & Counting",
      "Aboveground Biomass (AGB) Regression & Carbon Metric Forecasting",
      "Deforestation Alerting & Temporal Canopy Degradation Heatmaps"
    ],
    techStack: ["PyTorch / YOLOv8-OBB / Mask2Former", "Google Earth Engine API / Sentinel Hub", "GeoTIFF Rasterio / GDAL", "Mapbox GL JS / Deck.gl", "FastAPI Inference Backend"],
    deliverables: [
      "Canopy segmentation model pipeline with GeoJSON boundary export",
      "Interactive map dashboard with multi-layer spectral band toggles",
      "Biomass estimation mathematical formulation & validation report",
      "Live raster inference demo on target forest polygon coordinates"
    ],
    datasetSources: ["ESA Sentinel-1/Sentinel-2 Open Access Hub", "NASA GEDI Spaceborne LiDAR Canopy Height Data", "Neon Forest Structural Survey Open Datasets"],
    evaluationFocus: ["Canopy instance segmentation precision (mAP/IoU)", "Biomass estimation mathematical validity", "Data fusion robustness across cloudy terrain", "Scale & inferencing throughput"],
    classificationLevel: "CLASSIFIED MISSION — OPEN TO ROUND 1"
  },
  {
    id: "open-innovation",
    code: "ORION-PS-04",
    title: "Open Innovation & Student Innovation Projects",
    tagline: "Autonomous AI Systems, Web3 Protocols, Cybersecurity & Next-Gen Hardware — Round 1 Only",
    domain: "AI / Web3 / Systems / Robotics",
    accentColor: "violet",
    visualTheme: "Cybernetic Mesh • Quantum Systems • Multi-Domain Architecture",
    overview: "Have a novel breakthrough outside the 3 flagship challenges? The Open Innovation & Student Innovation Projects track empowers engineering squads and student researchers to architect, prototype, and defend disruptive solutions across emerging fields including Generative & Agentic AI, Zero-Knowledge Web3 systems, post-quantum cybersecurity, IoT robotics, healthcare diagnostics, and space exploration. This track is welcome only for Round 1 — the Grand Finale carries no Open Innovation option, and every finalist team builds on an on-the-spot assigned problem statement instead.",
    keyFeatures: [
      "Autonomous Multi-Agent AI & Edge Inference Systems",
      "Zero-Knowledge Proofs & Verifiable Computation Protocols",
      "Post-Quantum Cryptography & Embedded Hardware Security",
      "IoT Rovers, Autonomous Drones & Space Telemetry"
    ],
    techStack: ["React / Next.js / TypeScript", "Python / FastAPI / PyTorch", "Solidity / Web Cryptography", "ROS / Embedded C++", "Azure AI & Cloud Services"],
    deliverables: [
      "Working prototype demo repository and live inference link",
      "System architecture diagram and technical specifications",
      "Standardized 8-slide blueprint defense",
      "Quantifiable impact and deployment viability analysis"
    ],
    datasetSources: ["Open Source Public Datasets", "Synthetic Test Benches", "Domain-Specific Telemetry APIs"],
    evaluationFocus: ["Novelty & distinct value proposition", "System architecture & engineering depth", "Feasibility & commercial deployment potential", "Live technical jury defense"],
    classificationLevel: "OPEN TRACK — ROUND 1 ONLY — ELIGIBLE FOR ₹1,00,000 PRIZE POOL"
  }
];

export const OFFICIAL_PPT_TEMPLATE_URL = '/ORION_1.0_Template.pptx';

export const SUBMISSION_DRIVE_URL =
  'https://drive.google.com/drive/folders/1OtzOvFmcQnygkD8q7Y0UTZm8XA2HUUp0?usp=sharing';

export const PPT_TEMPLATE_RULES = [
  {
    rule: "No slides may be added",
    description: "The template slide count is fixed. Adding additional slides results in disqualification.",
    icon: "FileMinus"
  },
  {
    rule: "No slides may be removed",
    description: "Every section from problem analysis to tech architecture must be addressed.",
    icon: "FileX"
  },
  {
    rule: "No slides may be reordered",
    description: "Maintain the standardized evaluation sequence for jury screening consistency.",
    icon: "ArrowUpDown"
  },
  {
    rule: "Template must be used exactly",
    description: "Only official placeholders, text frames, and diagrams may be modified.",
    icon: "CheckSquare"
  },
  {
    rule: "Preserve branding & headers",
    description: "Do not alter ORION 1.0 official header/footer metadata or sponsor lockups.",
    icon: "ShieldAlert"
  },
  {
    rule: "Strict File Naming Protocol",
    description: "Submissions must be strictly formatted as: TeamName_ORION1.0 (PPTX or PDF).",
    icon: "FileCode"
  }
];

export const IMPORTANT_RULES_NOTICE = {
  title: "ORION 1.0 – IMPORTANT RULES",
  greeting: "Dear Participants,",
  intro: "Please carefully read and follow the rules below. These apply to every registered team.",
  warning: "Failure to follow these rules may result in the rejection of the submission or disqualification of the team.",
  signOff: "ORION 1.0 Organizing Team",
  signOffOrg: "Microsoft Club SIST"
};

export const IMPORTANT_RULES = [
  {
    number: "01",
    title: "One PPT per Team",
    summary: "Each team is allowed to submit only one final PPT.",
    detail: "Multiple submissions from the same team will not be accepted. Finalise your deck internally before uploading it through the official Google Drive submission link.",
    allowed: "One final PPT per team",
    notAllowed: "Multiple or duplicate submissions",
    icon: "FileCheck2",
    appliesTo: "Round 1 Submission"
  },
  {
    number: "02",
    title: "Leave the Team ID Blank",
    summary: "The Team ID field in the PPT will be filled in by the ORION 1.0 organizing team.",
    detail: "Participants must leave this field blank. Do not invent, guess, or copy a Team ID into the template.",
    allowed: "Empty Team ID field",
    notAllowed: "Filling in your own Team ID",
    icon: "Hash",
    appliesTo: "PPT Template"
  },
  {
    number: "03",
    title: "No Open Innovation in the Finale",
    summary: "Open Innovation and Student Innovation Projects will not be available during the final round.",
    detail: "Open Innovation and Student Innovation Projects are welcome only for Round 1. Every finalist team works on an assigned problem statement in the Grand Finale.",
    allowed: "Open Innovation & Student Innovation Projects in Round 1",
    notAllowed: "Open Innovation or Student Innovation Projects in the Grand Finale",
    icon: "Ban",
    appliesTo: "Grand Finale"
  },
  {
    number: "04",
    title: "On-the-Spot Problem Statements",
    summary: "All shortlisted teams receive their problem statements on the spot on 9 October 2026 (tentative).",
    detail: "Teams must develop their solutions based on the problem statement assigned during the event.",
    allowed: "Building on the assigned statement",
    notAllowed: "Bringing a pre-decided finale problem",
    icon: "CalendarClock",
    appliesTo: "9 October 2026 (Tentative)"
  },
  {
    number: "05",
    title: "Maximum 10% AI Usage in PPTs",
    summary: "Strict policy: Only a maximum of 10% AI assistance is permitted in your presentation deck.",
    detail: "At least 90% of your presentation deck — including solution architecture, system design, technical diagrams, workflows, and problem analysis — must be original human work developed by your team members. Generative AI tools (ChatGPT, Claude, Gemini, etc.) may only be used minimally for light grammar touch-ups or proofreading. Automated screening and jury evaluations will scrutinize all submissions for synthetic AI content. Presentations violating this limit will face heavy score penalties or direct disqualification.",
    allowed: "Up to 10% AI assistance for light grammar correction and proofreading only",
    notAllowed: "AI-generated problem statements, system architectures, workflows, or slide content exceeding 10%",
    icon: "Bot",
    appliesTo: "Round 1 PPT & Proposal"
  },
  {
    number: "06",
    title: "Schedule & Date Changes",
    summary: "All event dates, deadlines, schedules, and timings are subject to change based on organizational requirements or unforeseen circumstances.",
    detail: "Any revisions will be officially communicated through the designated ORION 1.0 communication channels. Participants are expected to regularly check for updates and comply with the revised schedule.",
    allowed: "Regularly checking official updates and following the revised schedule",
    notAllowed: "Ignoring officially communicated schedule revisions",
    icon: "CalendarClock",
    appliesTo: "All Participants"
  }
];

export const HOSPITALITY_SYSTEMS = [
  {
    icon: "Coffee",
    title: "2 BREAKFASTS",
    subtitle: "Both hack days covered",
    detail: "Nutritious morning spreads to power intense ideation sprints."
  },
  {
    icon: "Utensils",
    title: "2 LUNCHES & DINNER",
    subtitle: "Both hack days covered",
    detail: "Full multi-cuisine lunches and dinner provided inside the air-conditioned campus arena."
  },
  {
    icon: "Shirt",
    title: "OFFICIAL SWAG KIT",
    subtitle: "Tees, stickers & badges",
    detail: "Custom ORION 1.0 commemorative tees, mission badges, stickers and lanyard."
  },
  {
    icon: "Zap",
    title: "24/7 POWER & HIGH-SPEED WIFI",
    subtitle: "Dedicated hacking arena",
    detail: "Uninterrupted power back-up, dedicated LAN/Wi-Fi mesh, and dual monitor stations."
  },
  {
    icon: "Home",
    title: "FREE ACCOMMODATION",
    subtitle: "For out-of-Chennai finalist teams",
    detail: "Clean on-campus hostel lodging for confirmed finalists traveling to Chennai."
  },
  {
    icon: "Flame",
    title: "LIVE PROBLEM STATEMENTS",
    subtitle: "Revealed on-spot at Finale",
    detail: "Exclusive 24-hour sprint challenges and mentor masterclasses during the Grand Finale."
  }
];

export const TIMELINE_PHASES: TimelinePhase[] = [
  {
    number: "01",
    title: "MISSION REGISTRATIONS & ONLINE SUBMISSION",
    subtitle: "Round 1 Online Qualifier",
    date: "Closed — Submissions Finalized",
    status: "completed",
    highlights: [
      "Flat ₹100 registration fee per team (2–6 members)",
      "Choose from 3 Flagship Problem Statements OR Open Innovation & Student Innovation Projects (AI, Web3, Systems, Cloud, Healthcare, Hardware) — welcome only for Round 1",
      "Prepare and upload mandatory standardized PPT / PDF blueprint before September 21, 2026"
    ]
  },
  {
    number: "02",
    title: "ONLINE SCREENING & JURY EVALUATION",
    subtitle: "Rigorous Technical Filter",
    date: "Active Now — In Progress",
    status: "active",
    highlights: [
      "Jury review across Innovation, Feasibility, Technical Depth & Impact",
      "Plagiarism, template compliance, and architectural soundness validation",
      "Shortlisting matrix computed for pan-India participants"
    ]
  },
  {
    number: "03",
    title: "THE CUT — TOP 70 FINALISTS ANNOUNCED",
    subtitle: "Elite Shortlist Notification",
    date: "September 30, 2026",
    status: "upcoming",
    highlights: [
      "Official publication of Top 70 Finalist Teams",
      "Direct Discord / Email dispatch with invitation credentials",
      "Issuance of Digital Finalist Credential Badges"
    ]
  },
  {
    number: "04",
    title: "PHASE 2 CONFIRMATION & LOGISTICS LOCK",
    subtitle: "Finalist Slot Confirmation",
    date: "Announcing Soon",
    status: "upcoming",
    highlights: [
      "₹250 per head finalist confirmation fee",
      "Locks in 2 Breakfasts, 2 Lunches, Dinner, Swag Kits & Arena access",
      "Free campus hostel accommodation booking for outstation teams"
    ]
  },
  {
    number: "05",
    title: "24H OFFLINE GRAND FINALE",
    subtitle: "The Final Frontier at SIST Chennai",
    date: "Announcing Soon",
    status: "upcoming",
    highlights: [
      "24-hour continuous coding sprint in dedicated mission arena",
      "Live on-the-spot problem twists and mentor checkpoints",
      "Grand jury defense on stage & ₹1,00,000 prize distribution"
    ]
  }
];

export const MICROSOFT_ECOSYSTEM_TECHNOLOGIES: MicrosoftTech[] = [
  {
    id: "azure-ai",
    name: "Azure OpenAI & AI Foundry",
    category: "Intelligent Systems",
    description: "Enterprise-grade multimodal LLMs, GPT-4o vision, custom embeddings, and Agentic AI orchestrations with built-in safety guardrails.",
    capabilities: [
      "Multimodal GPT-4o & Phi-3 SLMs",
      "Azure AI Search & Vector RAG Pipeline",
      "Cognitive Services & Computer Vision APIs"
    ],
    icon: "Cpu",
    badge: "MICROSOFT AI",
    accent: "#0078D4"
  },
  {
    id: "github-copilot",
    name: "GitHub & GitHub Copilot",
    category: "Developer Acceleration",
    description: "The world's standard for collaborative version control, automated CI/CD GitHub Actions, and AI-pair programming across all code stacks.",
    capabilities: [
      "AI Code Synthesizer & Autonomous Agent PRs",
      "GitHub Codespaces Cloud Development Environments",
      "Automated Security & Secret Scanning"
    ],
    icon: "Code2",
    badge: "GITHUB ECOSYSTEM",
    accent: "#00BCF2"
  },
  {
    id: "azure-cloud",
    name: "Azure Cloud & Serverless",
    category: "Scalable Infrastructure",
    description: "High-throughput cloud primitives, event-driven Azure Functions, Cosmos DB distributed state, and scalable Kubernetes clusters.",
    capabilities: [
      "Global Low-Latency Edge Deployment",
      "Azure Cosmos DB Multi-Model Database",
      "Container Apps & AKS Microservices"
    ],
    icon: "Cloud",
    badge: "AZURE CLOUD",
    accent: "#22D3EE"
  },
  {
    id: "vscode-tools",
    name: "Visual Studio Code & Dev Tools",
    category: "Developer Core",
    description: "Extensible polyglot IDE ecosystem empowering seamless debugging, Dev Containers, WSL2 Linux bridging, and cloud telemetry.",
    capabilities: [
      "Integrated Live Share Collaboration",
      "Docker & Remote Container Workflows",
      "Cross-Platform Extension Marketplace"
    ],
    icon: "Terminal",
    badge: "MICROSOFT TOOLS",
    accent: "#0078D4"
  },
  {
    id: "dotnet-stack",
    name: ".NET 9 & Open Source Stack",
    category: "High-Performance Runtimes",
    description: "Blazing fast, cross-platform enterprise backend frameworks, C# 13, ASP.NET Core web APIs, and native cloud microservices.",
    capabilities: [
      "Sub-Millisecond HTTP Request Throughput",
      "Native AOT Compilation & Minimal Memory Footprint",
      "Modern WebAssembly Blazor Frontends"
    ],
    icon: "Layers",
    badge: ".NET PLATFORM",
    accent: "#8B5CF6"
  },
  {
    id: "power-telemetry",
    name: "Power Platform & Cloud Telemetry",
    category: "Data & Workflow Automation",
    description: "Enterprise workflow automation, Azure Monitor diagnostics, and real-time mission telemetry pipelines for mission-critical deployments.",
    capabilities: [
      "Power Automate Integration Webhooks",
      "Application Insights Real-Time Diagnostics",
      "Enterprise Identity via Microsoft Entra ID"
    ],
    icon: "Activity",
    badge: "ENTERPRISE MESH",
    accent: "#00BCF2"
  }
];

export const JUDGING_CRITERIA: JudgingCriterion[] = [
  {
    number: "01",
    name: "Technical Innovation & Novelty",
    weight: 30,
    weightLabel: "30%",
    description: "Uniqueness of the technical solution, novelty of the algorithmic or architectural approach, and creative problem deconstruction.",
    keyFactors: [
      "Originality of concept vs existing solutions",
      "Creative utilization of modern tech stacks & APIs",
      "Distinctive value proposition and ingenuity"
    ],
    color: "#00BCF2"
  },
  {
    number: "02",
    name: "System Architecture & Engineering Depth",
    weight: 30,
    weightLabel: "30%",
    description: "Robustness of system design, code quality, modularity, data pipelines, scalability, latency benchmarks, and threat resistance.",
    keyFactors: [
      "End-to-end architecture & block diagram clarity",
      "Effective data flow, state management & security",
      "Technical complexity handled with elegance"
    ],
    color: "#0078D4"
  },
  {
    number: "03",
    name: "Feasibility & Real-World Impact",
    weight: 20,
    weightLabel: "20%",
    description: "Practical utility in production, user adoption feasibility, deployment viability, and quantifiable societal or enterprise impact.",
    keyFactors: [
      "Clear commercial or environmental impact",
      "Practical deployment & operational cost model",
      "Realistic mitigation of potential edge-case failures"
    ],
    color: "#22D3EE"
  },
  {
    number: "04",
    name: "Presentation, Pitch & Live Defense",
    weight: 20,
    weightLabel: "20%",
    description: "Adherence to the mandatory standardized 8-slide template, clarity of technical explanation, demo effectiveness, and live jury defense.",
    keyFactors: [
      "Strict adherence to official 8-slide structure",
      "Crisp articulation of architecture & sprint roadmap",
      "Convincing responses during technical Q&A"
    ],
    color: "#8B5CF6"
  }
];

export const FAQ_DATA: FAQItem[] = [
  // 0. About ORION 1.0 — the questions people type into search engines first.
  {
    category: "About ORION 1.0",
    question: "What is ORION 1.0?",
    answer: "ORION 1.0 is a national level 24-hour hackathon organized by Microsoft Club SIST at Sathyabama Institute of Science and Technology (SIST), Chennai. It runs in two rounds: an online Round 1 where teams pitch their idea using the official PPT template, and a 24-hour offline Grand Finale at SIST Chennai for the Top 70 teams. The total prize pool is ₹1,00,000."
  },
  {
    category: "About ORION 1.0",
    question: "When and where is ORION 1.0 happening?",
    answer: "• Round 1 (online): submit your PPT on or before 21 September 2026 — you can take part from anywhere in India.\n• Grand Finale (offline, Top 70 teams): 9–10 October 2026 (tentative) at Sathyabama Institute of Science and Technology, Jeppiaar Nagar, Rajiv Gandhi Salai (OMR), Chennai - 600119."
  },
  {
    category: "About ORION 1.0",
    question: "How do I register my team for ORION 1.0?",
    answer: "Click \"Register Your Team — ₹100\" on this website to open the official registration form. Fill in your team details, pay the flat ₹100 Round 1 fee for the whole team, and submit your PPT made with the official ORION 1.0 template before 21 September 2026."
  },
  {
    category: "About ORION 1.0",
    question: "What are the problem statements and tracks in ORION 1.0?",
    answer: "Round 1 has four tracks:\n• FloatChat (ORION-PS-01) — AI-powered natural-language query engine and 4D visualization for ARGO ocean data.\n• LexVault (ORION-PS-02) — zero-knowledge, blockchain-powered evidence vault for legal chains of custody.\n• SylvaSense (ORION-PS-03) — tree enumeration and biomass estimation from multi-spectral and SAR satellite imagery.\n• Open Innovation & Student Innovation Projects — your own idea in AI, Web3, cybersecurity or hardware (Round 1 only).\nOpen the Challenge Arena on this page for the full brief of each track."
  },
  {
    category: "About ORION 1.0",
    question: "Who organizes ORION 1.0?",
    answer: "ORION 1.0 is organized by Microsoft Club SIST, the student technology community of Sathyabama Institute of Science and Technology, Chennai, under the patronage of the university's leadership and the School of Computing. Organizer contacts are listed in the Patrons & Organizers section of this page."
  },
  {
    category: "About ORION 1.0",
    question: "Can first-year students or non-CSE students take part?",
    answer: "Yes. ORION 1.0 is open to all college students — undergraduate, postgraduate and PhD, from any year and any department — as well as early-career working professionals. Mixed teams across colleges, departments and years are welcome."
  },
  {
    category: "About ORION 1.0",
    question: "How are Round 1 submissions judged?",
    answer: "Submissions are scored by the jury on four criteria:\n• Technical Innovation & Novelty — 30%\n• System Architecture & Engineering Depth — 30%\n• Feasibility & Real-World Impact — 20%\n• Presentation, Pitch & Live Defense — 20%\nFollowing the official PPT template exactly is mandatory; the Top 70 teams move on to the Grand Finale."
  },
  {
    category: "About ORION 1.0",
    question: "Do participants get certificates?",
    answer: "Yes. Every participating team member receives an individual certificate of participation. Winners also receive Certificates of Merit and trophies at the Valedictory Ceremony at the end of the 24-hour Grand Finale."
  },
  {
    category: "About ORION 1.0",
    question: "Where can I download the official ORION 1.0 PPT template?",
    answer: "The official template is available as a free download in the Guidelines section of this website (ORION_1.0_Template.pptx). Only this template is accepted — do not add, remove or reorder slides, and name your file TeamName_ORION1.0."
  },
  {
    category: "About ORION 1.0",
    question: "How do I get updates or contact the ORION 1.0 team?",
    answer: "Join the official WhatsApp announcement group shared after registration and follow @orion1.0_ on Instagram for shortlist and schedule updates. For anything else, email msclubsist@gmail.com or ask ORION AI, the assistant on this website."
  },

  // 1. Eligibility & Squads
  {
    category: "Eligibility & Squads",
    question: "Who is eligible to participate in ORION 1.0?",
    answer: "ORION 1.0 is open to all college students (undergraduate, postgraduate, PhD) and early-career working professionals across India. Cross-institutional, cross-department, and multidisciplinary teams are enthusiastically welcome!"
  },
  {
    category: "Eligibility & Squads",
    question: "What is the team size and composition?",
    answer: "Each team must have a minimum of 2 and a maximum of 6 members (1 Team Leader + 1 to 5 Team Members). Individual solo participation is strictly not permitted. Cross-college, cross-department, and cross-year teams are fully allowed."
  },
  {
    category: "Eligibility & Squads",
    question: "Can team members be from different colleges or departments?",
    answer: "Yes! Cross-college, cross-department, and cross-year teams are completely permitted. All participating team members will receive individual certificates of participation."
  },

  // 2. Round 1 & PPT Submissions
  {
    category: "Round 1 & PPT Submissions",
    question: "What do we need to submit for Round 1?",
    answer: "Each team must submit an idea abstract and a pitch deck (PPT), prepared using the official ORION 1.0 template, through the official Google Drive submission link on or before 21 September 2026. Only the prescribed template will be accepted — using any other format leads to disqualification."
  },
  {
    category: "Round 1 & PPT Submissions",
    question: "Do we need to submit a prototype or a pitch video for Round 1?",
    answer: "No. Round 1 only requires the PPT submission. No prototype, code, or video is needed at this stage — you are simply pitching your idea on slides. Demo videos are optionally accepted; if you wish to include one, upload it via the dedicated demo video Drive link shared in the official announcement group."
  },
  {
    category: "Round 1 & PPT Submissions",
    question: "Are demo videos accepted from participants for Round 1?",
    answer: "Yes, demo videos are accepted. You can upload your demo video using the dedicated demo video Drive link provided in the official announcement group. The PPT is the mandatory submission — the demo video is optional."
  },
  {
    category: "Round 1 & PPT Submissions",
    question: "How exactly do we submit the PPT and demo video for Round 1?",
    answer: "They are submitted separately using two different links shared in the official announcement group:\n• PPT → upload via the dedicated PPT Drive link\n• Demo video → upload via the dedicated demo video Drive link\n\nPlease do not combine them into a single folder — use the respective link for each file."
  },
  {
    category: "Round 1 & PPT Submissions",
    question: "I need to upload a folder consisting of my PPT and demo video, but it isn't uploading to Drive. Shall I upload separately?",
    answer: "Yes — upload them separately. There are two separate Drive links shared in the announcement group: one dedicated link for the PPT and a separate link for the demo video. Please do not combine them into a single folder — use the respective link for each file."
  },
  {
    category: "Round 1 & PPT Submissions",
    question: "I already submitted my PPT, but I want to upload a newer/updated version. What should I do?",
    answer: "Google Form entries cannot be edited once submitted. In this case, simply upload the newer PPT to the shared Google Drive link provided by the organizers in the official announcement group. You do not need to fill the form again — the Drive upload alone is sufficient to update your submission."
  },
  {
    category: "Round 1 & PPT Submissions",
    question: "What if the PPT submission link isn't working properly?",
    answer: "If the originally shared submission link isn't working, a new/updated link has been posted in the official announcement group. Please check the announcement group and use that link to complete your submission."
  },
  {
    category: "Round 1 & PPT Submissions",
    question: "Can we use AI tools (like ChatGPT, Gemini, or Claude) to create our PPT?",
    answer: "Strict Rule: Only a maximum of 10% AI assistance is permitted in your PPT submission, strictly restricted to light grammar checks, spelling corrections, or proofreading. At least 90% of your deck — including your idea, problem formulation, solution architecture, technical diagrams, workflows, and implementation feasibility — must be 100% human-crafted and originally engineered by your squad. Automated screening tools and jury scrutiny will evaluate submissions for synthetic AI content. Decks detected with heavy AI generation will face severe point deductions or outright disqualification."
  },
  {
    category: "Round 1 & PPT Submissions",
    question: "Can we modify the slide count, format, or branding of the PPT template?",
    answer: "No. Strict rules: No slides may be added, removed, or reordered. Branding, headers, and footers must remain intact. Additionally, only up to 10% AI assistance is allowed (for grammar/formatting touch-ups only). The Team ID field on the PPT must be left blank (it will be filled in by the organizing team). Submissions must be named strictly as: TeamName_ORION1.0 (PPTX or PDF)."
  },
  {
    category: "Round 1 & PPT Submissions",
    question: "Is Open Innovation / Student Innovation Projects allowed?",
    answer: "Yes, but only for Round 1. Teams without a flagship track idea can propose their own Open Innovation or Student Innovation project. However, this option is not available in the Grand Finale — every finalist team will instead work on a problem statement assigned on the spot at the venue."
  },

  // 3. Finale, Selection & Fees
  {
    category: "Finale & Fees",
    question: "What is the registration fee?",
    answer: "Round 1 (online): ₹100, flat per team, regardless of team size. This covers the entire squad (2–6 members), not per member. Grand Finale (only for shortlisted teams): ₹250 per head — charged individually for each finalist team member, not per team."
  },
  {
    category: "Finale & Fees",
    question: "Is the registration fee refundable or transferable?",
    answer: "No. All fees are strictly non-refundable and non-transferable, regardless of the reason — including withdrawal, non-attendance, travel issues, academic commitments, or team disputes. Fees also cannot be adjusted or transferred to another team."
  },
  {
    category: "Finale & Fees",
    question: "How many teams qualify for the Grand Finale?",
    answer: "The Top 70 teams, selected through jury evaluation of Round 1 submissions (based on innovation, feasibility, technical depth, and template compliance), will advance to the 24-hour offline Grand Finale."
  },
  {
    category: "Finale & Fees",
    question: "How are the Grand Finale problem statements distributed?",
    answer: "All shortlisted teams receive their problem statements on the spot at the start of the 24-hour offline sprint at SIST Chennai (Grand Finale: 9–10 October 2026, tentative). Teams must build their solution on the problem statement assigned during the event. Open Innovation is not available in the final round."
  },
  {
    category: "Finale & Fees",
    question: "What are the important dates?",
    answer: "• Registration closes: 21 September 2026\n• Round 1 (online idea submission): on or before 21 September 2026\n• Top 70 Shortlist Announcement: Announcing Soon\n• Grand Finale (offline): 9–10 October 2026 (tentative), at Sathyabama Institute of Science and Technology, Chennai.\nPlease watch the official WhatsApp community and Instagram page for the Top 70 shortlist and the final confirmation of the Grand Finale dates."
  },
  {
    category: "Finale & Fees",
    question: "How are the prizes distributed?",
    answer: "The total prize pool of ₹1,00,000 (including ₹25k 1st Place Champion, ₹15k 1st Runner-Up, ₹10k 2nd Runner-Up, and Special Track Bounties) along with Certificates of Merit and trophies will be awarded physically during the Valedictory Ceremony immediately concluding the 24-hour sprint."
  },

  // 4. Hospitality & Venue
  {
    category: "Hospitality & Venue",
    question: "Is accommodation and food provided at the Grand Finale?",
    answer: "Yes. Free on-campus hostel accommodation is provided for outstation finalist teams. Meals include 2 breakfasts, 2 lunches, dinner, and midnight snacks. High-speed Wi-Fi, power backup, and air-conditioned workspaces are also provided throughout the 24-hour event."
  },
  {
    category: "Hospitality & Venue",
    question: "Where is the offline Grand Finale venue and how do we reach it?",
    answer: "The 24-hour offline sprint takes place at the School of Computing Complex, Sathyabama Institute of Science and Technology, Jeppiaar Nagar, Rajiv Gandhi Salai (OMR), Chennai - 600119. The campus is ~22 km from Chennai International Airport (MAA) and ~25 km from Chennai Central (MAS) / Tambaram Railway Station with direct bus and cab connectivity."
  },
  {
    category: "Hospitality & Venue",
    question: "What hardware and connectivity amenities are available at the arena?",
    answer: "Participants have access to 24/7 uninterrupted power backup, dedicated power sockets at every team station, high-speed dual-band Wi-Fi and LAN mesh networks, mentor breakout zones, and round-the-clock medical and technical support."
  },
  {
    category: "Hospitality & Venue",
    question: "What documents do participants need to carry for campus entry?",
    answer: "Every participant must carry their official College/University ID card (or valid government photo ID) along with their digital ORION 1.0 Finalist Invitation Dossier for security check-in at the main campus gate."
  },

  // 5. Special Mentions
  {
    category: "Special Mentions",
    question: "Can participants leave the campus during the event?",
    answer: "No. Once participants enter the campus, they must remain inside until the event concludes and the organizers permit departure. Leaving during the event is not allowed."
  },
  {
    category: "Special Mentions",
    question: "Are outside food deliveries allowed?",
    answer: "No. Food and snack deliveries through services such as Blinkit, Swiggy, and Instamart, or any other external delivery service, are not permitted inside the university campus."
  },
  {
    category: "Special Mentions",
    question: "Can participants bring their own food or snacks?",
    answer: "Yes. Participants may bring packed food and snacks. These must be consumed outside the event venue, within the campus, only during designated breaks or at times permitted by the organizers."
  },
  {
    category: "Special Mentions",
    question: "Is eating allowed inside the event venue?",
    answer: "No. Eating food or snacks inside the event venue is strictly prohibited."
  },
  {
    category: "Special Mentions",
    question: "Can we change or replace team members on the day of the finals?",
    answer: "No. Changes, substitutions, or swapping of team members on the event day are not permitted. Participants must attend with their registered team."
  },
  {
    category: "Special Mentions",
    question: "Can registration fees be refunded?",
    answer: "No. All payments are strictly non-refundable."
  },
  {
    category: "Special Mentions",
    question: "Can fees be transferred or exchanged between teams?",
    answer: "No. Fees cannot be transferred, adjusted, or exchanged between teams."
  },
  {
    category: "Special Mentions",
    question: "Will the Round 1 fee be refunded if our team does not qualify?",
    answer: "No. The Round 1 registration fee will not be refunded if a team does not qualify for the finals."
  }
];

export const CHIEF_PATRONS: PatronProfile[] = [
  {
    name: "Dr. Mariazeena Johnson",
    title: "Chancellor",
    organization: "Sathyabama Institute of Science and Technology",
    roleType: "Chief Patron",
    initials: "MJ",
    avatarColor: "from-cyan-500 to-blue-700"
  },
  {
    name: "Dr. Marie Johnson",
    title: "President",
    organization: "Sathyabama Institute of Science and Technology",
    roleType: "Chief Patron",
    initials: "MJ",
    avatarColor: "from-purple-500 to-indigo-800"
  },
  {
    name: "Ms. Maria Bernadette Tamilarasi",
    title: "Vice President",
    organization: "Sathyabama Institute of Science and Technology",
    roleType: "Chief Patron",
    initials: "MB",
    avatarColor: "from-teal-500 to-emerald-700"
  },
  {
    name: "Mr. J. Arul Selvan",
    title: "Vice President",
    organization: "Sathyabama Institute of Science and Technology",
    roleType: "Chief Patron",
    initials: "AS",
    avatarColor: "from-amber-500 to-orange-700"
  },
  {
    name: "Ms. Maria Catherine Johnson",
    title: "Vice President",
    organization: "Sathyabama Institute of Science and Technology",
    roleType: "Chief Patron",
    initials: "MC",
    avatarColor: "from-rose-500 to-pink-700"
  }
];

export const ACADEMIC_PATRONS: PatronProfile[] = [
  {
    name: "Dr. L. Lakshmanan",
    title: "Dean",
    organization: "School of Computing, SIST",
    roleType: "Academic Patron",
    initials: "LL",
    avatarColor: "from-blue-600 to-cyan-800",
    bio: "Visionary academic leader driving cutting-edge computing initiatives and student research excellence."
  },
  {
    name: "Dr. P. Ajitha",
    title: "Head of Department",
    organization: "CSE - AI, BCT, CS, CSBS, IoT",
    roleType: "Academic Patron",
    initials: "PA",
    avatarColor: "from-indigo-600 to-purple-800",
    bio: "Pioneering curriculum innovation across emerging computing domains and hackathon ecosystems."
  },
  {
    name: "Dr. Senduru Srinivasulu",
    title: "Head of Department",
    organization: "CSE - AIML, DS, AIR",
    roleType: "Academic Patron",
    initials: "SS",
    avatarColor: "from-violet-600 to-blue-900",
    bio: "Leading advanced research in Artificial Intelligence, Machine Learning, Data Science, and Robotics."
  }
];

export const CONVENORS: PatronProfile[] = ACADEMIC_PATRONS;

export const CLUB_LEADERSHIP: PatronProfile[] = [
  {
    name: "Microsoft Club SIST",
    title: "Organizing Body & Mission Command",
    organization: "Sathyabama Institute of Science and Technology",
    roleType: "Club Lead",
    initials: "MS",
    avatarColor: "from-cyan-500 to-blue-600",
    bio: "A premier student technical community fostering developer excellence, cloud intelligence, and flagship nationwide hackathons."
  },
  {
    name: "Student Technical Directorate",
    title: "Mission Architects & WebGL Systems",
    organization: "Microsoft Club SIST",
    roleType: "Club Lead",
    initials: "TD",
    avatarColor: "from-purple-500 to-violet-700",
    bio: "Lead developers and spatial designers engineering the ORION 1.0 mission interface and hackathon infrastructure."
  },
  {
    name: "Operations & Event Command",
    title: "Logistics & Hospitality Core",
    organization: "Microsoft Club SIST",
    roleType: "Club Lead",
    initials: "OC",
    avatarColor: "from-emerald-500 to-teal-700",
    bio: "Dedicated crew coordinating 24-hour food, power, mentorship, accommodation, and participant welfare."
  }
];

export const EVENT_ORGANIZERS: OfficeBearer[] = [
  {
    name: "Nihitha Juliet A",
    title: "President",
    department: "IInd Yr BE CSBS",
    phone: "8870227906",
    initials: "NJ",
    organization: "Microsoft Club SIST"
  },
  {
    name: "Harshini M",
    title: "Vice - President",
    department: "IIIrd Yr BTech IT",
    phone: "7200524207",
    initials: "HM",
    organization: "Microsoft Club SIST"
  },
  {
    name: "Praveen Kumar S",
    title: "Cluster Co-ordinator",
    department: "IIIrd Yr BE CSE",
    phone: "9176594860",
    initials: "PK",
    organization: "Microsoft Club SIST"
  }
];

export const MICROSOFT_OFFICE_BEARERS: OfficeBearer[] = EVENT_ORGANIZERS;

export const INITIAL_REGISTERED_TEAMS: RegisteredTeam[] = [];

export const ORION_STARS: StarNodeData[] = [
  {
    name: "Betelgeuse",
    coords: [-2.2, 3.2, 0.4],
    role: "Alpha Orionis • Red Supergiant",
    designation: "α Ori / HD 39801",
    distance: "642.5 Light Years",
    apparentMagnitude: "0.50",
    size: 0.28,
    color: "#BAE6FD"
  },
  {
    name: "Rigel",
    coords: [2.5, -3.4, -0.3],
    role: "Beta Orionis • Blue-White Supergiant",
    designation: "β Ori / HD 34085",
    distance: "860 Light Years",
    apparentMagnitude: "0.13",
    size: 0.32,
    color: "#38BDF8"
  },
  {
    name: "Bellatrix",
    coords: [2.2, 3.0, 0.2],
    role: "Gamma Orionis • Amazon Star",
    designation: "γ Ori / HD 35468",
    distance: "250 Light Years",
    apparentMagnitude: "1.64",
    size: 0.22,
    color: "#FFFFFF"
  },
  {
    name: "Saiph",
    coords: [-2.1, -3.2, 0.1],
    role: "Kappa Orionis • Supergiant Star",
    designation: "κ Ori / HD 38771",
    distance: "650 Light Years",
    apparentMagnitude: "2.09",
    size: 0.2,
    color: "#38BDF8"
  },
  {
    name: "Alnitak",
    coords: [-0.9, 0.1, 0],
    role: "Zeta Orionis • Eastern Belt Star",
    designation: "ζ Ori / HD 37742",
    distance: "1,260 Light Years",
    apparentMagnitude: "1.77",
    size: 0.24,
    color: "#BAE6FD"
  },
  {
    name: "Alnilam",
    coords: [0, 0.0, 0],
    role: "Epsilon Orionis • Central Belt Star",
    designation: "ε Ori / HD 37128",
    distance: "2,000 Light Years",
    apparentMagnitude: "1.69",
    size: 0.26,
    color: "#FFFFFF"
  },
  {
    name: "Mintaka",
    coords: [0.9, -0.1, 0],
    role: "Delta Orionis • Western Belt Star",
    designation: "δ Ori / HD 36486",
    distance: "1,200 Light Years",
    apparentMagnitude: "2.23",
    size: 0.23,
    color: "#38BDF8"
  },
  {
    name: "Meissa",
    coords: [0.1, 4.4, 0.3],
    role: "Lambda Orionis • Head of Orion",
    designation: "λ Ori / HD 36861",
    distance: "1,100 Light Years",
    apparentMagnitude: "3.39",
    size: 0.18,
    color: "#7DD3FC"
  },
  {
    name: "Orion Nebula M42",
    coords: [0, -1.3, -0.2],
    role: "Diffuse Nebula • Stellar Nursery",
    designation: "NGC 1976 / Messier 42",
    distance: "1,344 Light Years",
    apparentMagnitude: "4.00",
    size: 0.3,
    color: "#60A5FA"
  }
];

export const CONSTELLATION_EDGES: [string, string][] = [
  ["Betelgeuse", "Bellatrix"],
  ["Betelgeuse", "Alnitak"],
  ["Bellatrix", "Mintaka"],
  ["Betelgeuse", "Meissa"],
  ["Bellatrix", "Meissa"],
  ["Alnitak", "Alnilam"],
  ["Alnilam", "Mintaka"],
  ["Alnitak", "Orion Nebula M42"],
  ["Orion Nebula M42", "Saiph"],
  ["Mintaka", "Rigel"],
  ["Saiph", "Rigel"]
];
