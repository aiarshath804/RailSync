export type Language = "EN" | "HI" | "TA";

export interface TranslationSchema {
  // Top Bar & Header
  govtTitle: string;
  govtSubtitle: string;
  istClock: string;
  searchPlaceholder: string;
  dispatchAdvisory: string;
  officialPortal: string;
  textSize: string;
  
  // Navigation Tabs
  navNetwork: string;
  navCorridors: string;
  navPrioritization: string;
  navSchedules: string;
  navAssets: string;
  navAnalytics: string;
  
  // Sidebar & Departments
  emergencyHalt: string;
  emergencySubtitle: string;
  smmsDept: string;
  tmsDept: string;
  tdmsDept: string;
  coaDept: string;
  foisDept: string;
  aiDept: string;
  maintBlocks: string;
  defectLogs: string;
  controllerProfile: string;
  systemGazette: string;

  // Corridors View
  corridorTitle: string;
  corridorSubtitle: string;
  telemetrySummary: string;
  officialRecord: string;
  latency: string;
  activePaths: string;
  blocks: string;
  savedHours: string;
  speed: string;
  today: string;
  filter: string;
  liveSignalInterlocking: string;
  trackCircuitTelemetry: string;
  speedLimitEnforced: string;

  // Schedules View
  schedulesTitle: string;
  schedulesSubtitle: string;
  rosterGazette: string;
  liveSynced: string;
  rosterTitle: string;
  gazetteRecord: string;
  trainCol: string;
  categoryCol: string;
  routeCol: string;
  timeCol: string;
  priorityCol: string;
  statusCol: string;
  actionsCol: string;
  holdBtn: string;
  speedBtn: string;
  clearBtn: string;
  dispatchSlotsSynced: string;
  allCategories: string;
  highSpeed: string;
  heavyFreight: string;
  advisoriesTitle: string;
  activeConflicts: string;

  // Network View
  networkTitle: string;
  networkSubtitle: string;
  activeTrainsGrid: string;
  telemetryLatency: string;
  trackHealthIndex: string;
  zoomIn: string;
  zoomOut: string;
  resetView: string;
  junctionStatus: string;

  // Assets View
  assetsTitle: string;
  assetsSubtitle: string;
  globalHealthIndex: string;
  criticalAnomalies: string;
  inspectionCycles: string;
  assetCol: string;
  deptCol: string;
  sectorCol: string;
  metricCol: string;
  healthCol: string;
  actionCol: string;
  dispatchOrder: string;
  viewCadMap: string;

  // Analytics View
  analyticsTitle: string;
  analyticsSubtitle: string;
  analyticsExecutiveSummary: string;
  blockHoursSaved: string;
  assetAvailability: string;
  bundledTasks: string;
  performanceComparison: string;
  conventionalMethod: string;
  railSyncAi: string;
  avgBlockDuration: string;
  weeklyConflicts: string;
  networkAvailability: string;
  resourceUtilization: string;
  allResources: string;
  machines: string;
  crews: string;
  delayImpactAnalysis: string;
  optimalZone: string;
  passengerDelayMins: string;
  blockDurationHours: string;

  // Footer
  footerGovt: string;
  footerPortal: string;
  securityLevel: string;
  consoleId: string;
  copyright: string;

  // Statuses & Priorities
  onTime: string;
  conflict: string;
  delayed: string;
  holding: string;
  speedRestricted: string;
  critical: string;
  elevated: string;
  standard: string;
  resolved: string;
}

export const translations: Record<Language, TranslationSchema> = {
  EN: {
    // Top Bar & Header
    govtTitle: "GOVERNMENT OF INDIA • MINISTRY OF RAILWAYS",
    govtSubtitle: "CENTRAL TRAFFIC CONTROL & ADVISORY SYSTEM",
    istClock: "IST 05:25 • CTC LIVE",
    searchPlaceholder: "Search train number, block, signal or asset ID...",
    dispatchAdvisory: "+ Dispatch Advisory",
    officialPortal: "OFFICIAL PORTAL",
    textSize: "Size:",
    
    // Navigation Tabs
    navNetwork: "National Network View",
    navCorridors: "Corridors Monitoring",
    navPrioritization: "AI Prioritization Engine",
    navSchedules: "Schedules & Advisories",
    navAssets: "Asset Registry",
    navAnalytics: "Operations Analytics",
    
    // Sidebar
    emergencyHalt: "EMERGENCY HALT",
    emergencySubtitle: "ALL SECTOR LOCKOUT",
    smmsDept: "Signal & Telecom (SMMS)",
    tmsDept: "Track Maintenance (TMS)",
    tdmsDept: "Traction Power (TDMS)",
    coaDept: "Control Operations (COA)",
    foisDept: "Freight Operations (FOIS)",
    aiDept: "AI Dispatch Audit",
    maintBlocks: "Maintenance Blocks",
    defectLogs: "Asset Defect Logs",
    controllerProfile: "Controller Profile",
    systemGazette: "OFFICIAL GAZETTE",

    // Corridors View
    corridorTitle: "Northeast Corridor (NEC) • Section 07 Traffic Console",
    corridorSubtitle: "Real-time train graph telemetry, signal interlocking control & AI-assisted maintenance block optimization.",
    telemetrySummary: "Northeast Trunk Telemetry Summary",
    officialRecord: "OFFICIAL SYSTEM RECORD",
    latency: "LATENCY",
    activePaths: "ACTIVE PATHS",
    blocks: "BLOCKS",
    savedHours: "SAVED HOURS",
    speed: "SPEED",
    today: "Today (Aug 31)",
    filter: "Filter",
    liveSignalInterlocking: "Live Signal Interlocking Console",
    trackCircuitTelemetry: "Track Circuit Optical Telemetry",
    speedLimitEnforced: "60km/h Restricted Speed Enforced",
    
    // Schedules View
    schedulesTitle: "Central Train Timetable & Active Dispatch Roster",
    schedulesSubtitle: "Official train path allocation, priority slot control & automated dispatch advisory management.",
    rosterGazette: "ROSTER GAZETTE",
    liveSynced: "LIVE SYNCHRONIZED",
    rosterTitle: "Active Corridor Schedules Roster (5 Allocated Trains)",
    gazetteRecord: "GAZETTE RECORD",
    trainCol: "Train Number & Name",
    categoryCol: "Category",
    routeCol: "Origin → Destination",
    timeCol: "Arrival / Departure",
    priorityCol: "Priority Slot",
    statusCol: "Live Status",
    actionsCol: "Action Directives",
    holdBtn: "Hold at Loop",
    speedBtn: "Enforce 60km/h",
    clearBtn: "Clear Path",
    dispatchSlotsSynced: "DISPATCH SLOTS SYNCHRONIZED ACROSS DIVISION 4",
    allCategories: "All Categories",
    highSpeed: "Rajdhani / High Speed",
    heavyFreight: "Heavy Goods Freight",
    advisoriesTitle: "Live Corridor Advisories & Active Conflicts",
    activeConflicts: "ACTIVE CONFLICTS",
    
    // Network View
    networkTitle: "National Network CTC Schematic Map & Signal Overview",
    networkSubtitle: "Live optical track circuit overview, interlocking status & section-wide train positioning telemetry.",
    activeTrainsGrid: "ACTIVE CONVEYANCE ON GRID",
    telemetryLatency: "TELEMETRY LATENCY",
    trackHealthIndex: "TRACK HEALTH INDEX",
    zoomIn: "Zoom In",
    zoomOut: "Zoom Out",
    resetView: "Reset View",
    junctionStatus: "Ghaziabad Junction Status",

    // Assets View
    assetsTitle: "National Rolling Stock & Telemetry Asset Registry",
    assetsSubtitle: "Centralized inventory database, physical sensing point diagnostics & work order dispatch ledger.",
    globalHealthIndex: "GLOBAL HEALTH INDEX",
    criticalAnomalies: "CRITICAL ANOMALIES",
    inspectionCycles: "INSPECTION CYCLES",
    assetCol: "Asset ID & Code",
    deptCol: "Department",
    sectorCol: "Physical Sector",
    metricCol: "Telemetry Metric",
    healthCol: "Asset Health",
    actionCol: "Operational Action",
    dispatchOrder: "Dispatch Work Order",
    viewCadMap: "View CAD Schematic Map",

    // Analytics View
    analyticsTitle: "Cross-Departmental Operational Analytics & Efficiency Audit",
    analyticsSubtitle: "Quantitative evaluation of AI-driven block bundling, track asset availability gains, and passenger delay mitigation.",
    analyticsExecutiveSummary: "EXECUTIVE AUDIT SUMMARY",
    blockHoursSaved: "Block Hours Saved",
    assetAvailability: "Asset Availability",
    bundledTasks: "Bundled Tasks",
    performanceComparison: "Performance Comparison",
    conventionalMethod: "Conventional Method",
    railSyncAi: "RailSync AI",
    avgBlockDuration: "Average Block Duration",
    weeklyConflicts: "Weekly Conflicts",
    networkAvailability: "Network Availability",
    resourceUtilization: "Resource Utilization",
    allResources: "All Resources",
    machines: "Machines",
    crews: "Crews",
    delayImpactAnalysis: "Delay Impact Analysis",
    optimalZone: "Optimal Operating Zone (<25m Delay)",
    passengerDelayMins: "Passenger Train Regulation / Delay Minutes",
    blockDurationHours: "Corridor Block Duration (Hours)",

    // Footer
    footerGovt: "GOVERNMENT OF INDIA • MINISTRY OF RAILWAYS",
    footerPortal: "National Corridor Control & Advisory Portal (RailSync-v4.2)",
    securityLevel: "Security Level",
    consoleId: "CTC Console ID",
    copyright: "© 2026 Indian Railways",

    // Statuses & Priorities
    onTime: "On Time",
    conflict: "Conflict",
    delayed: "Delayed +15m",
    holding: "Holding at Loop",
    speedRestricted: "60km/h Restricted",
    critical: "P1 - Critical",
    elevated: "P2 - Elevated",
    standard: "P3 - Standard",
    resolved: "Resolved"
  },
  HI: {
    // Top Bar & Header
    govtTitle: "भारत सरकार • रेल मंत्रालय",
    govtSubtitle: "केंद्रीय यातायात नियंत्रण एवं परामर्श प्रणाली",
    istClock: "आई.एस.टी 05:25 • सी.टी.सी लाइव",
    searchPlaceholder: "ट्रेन नंबर, ब्लॉक, सिग्नल या परिसंपत्ति आईडी खोजें...",
    dispatchAdvisory: "+ परामर्श जारी करें",
    officialPortal: "आधिकारिक पोर्टल",
    textSize: "आकार:",
    
    // Navigation Tabs
    navNetwork: "राष्ट्रीय नेटवर्क दृश्य",
    navCorridors: "कॉरिडोर निगरानी",
    navPrioritization: "एआई प्राथमिकता इंजन",
    navSchedules: "समय-सारणी व परामर्श",
    navAssets: "परिसंपत्ति रजिस्टर",
    
    // Sidebar
    emergencyHalt: "आपातकालीन रोक",
    emergencySubtitle: "सभी क्षेत्र बंद करें",
    smmsDept: "सिग्नल एवं दूरसंचार (SMMS)",
    tmsDept: "रेल पथ रखरखाव (TMS)",
    tdmsDept: "कर्षण विद्युत प्रणाली (TDMS)",
    coaDept: "नियंत्रण संचालन (COA)",
    foisDept: "मालगाड़ी संचालन (FOIS)",
    aiDept: "एआई प्रेषण लेखापरीक्षा",
    maintBlocks: "रखरखाव ब्लॉक",
    defectLogs: "परिसंपत्ति दोष लॉग",
    controllerProfile: "नियंत्रक प्रोफ़ाइल",
    systemGazette: "राजपत्र रिकॉर्ड",

    // Corridors View
    corridorTitle: "पूर्वोत्तर कॉरिडोर (एनईसी) • खंड 07 यातायात कंसोल",
    corridorSubtitle: "वास्तविक समय ट्रेन ग्राफ टेलीमेट्री, सिग्नल इंटरलॉकिंग नियंत्रण एवं रखरखाव ब्लॉक अनुकूलन।",
    telemetrySummary: "पूर्वोत्तर ट्रंक टेलीमेट्री सारांश",
    officialRecord: "आधिकारिक प्रणाली रिकॉर्ड",
    latency: "विलंबता",
    activePaths: "सक्रिय मार्ग",
    blocks: "रखरखाव ब्लॉक",
    savedHours: "सहेजे गए घंटे",
    speed: "गति",
    today: "आज (31 अग)",
    filter: "फ़िल्टर",
    liveSignalInterlocking: "लाइव सिग्नल इंटरलॉकिंग कंसोल",
    trackCircuitTelemetry: "ट्रैक सर्किट ऑप्टिकल टेलीमेट्री",
    speedLimitEnforced: "60 किमी/घंटा प्रतिबंधित गति लागू",
    
    // Schedules View
    schedulesTitle: "केंद्रीय ट्रेन समय-सारणी एवं सक्रिय प्रेषण रोस्टर",
    schedulesSubtitle: "आधिकारिक ट्रेन मार्ग आवंटन, प्राथमिकता स्लॉट नियंत्रण एवं स्वचालित प्रेषण परामर्श प्रबंधन।",
    rosterGazette: "रोस्टर राजपत्र",
    liveSynced: "लाइव सिंक्रनाइज़्ड",
    rosterTitle: "सक्रिय कॉरिडोर शेड्यूल रोस्टर (5 आवंटित ट्रेनें)",
    gazetteRecord: "राजपत्र रिकॉर्ड",
    trainCol: "ट्रेन नंबर व नाम",
    categoryCol: "श्रेणी",
    routeCol: "प्रारंभ → गंतव्य",
    timeCol: "आगमन / प्रस्थान",
    priorityCol: "प्राथमिकता स्लॉट",
    statusCol: "लाइव स्थिति",
    actionsCol: "कार्रवाई निर्देश",
    holdBtn: "लूप पर रोकें",
    speedBtn: "60 किमी/घंटा लागू करें",
    clearBtn: "मार्ग साफ़ करें",
    dispatchSlotsSynced: "प्रभाग 4 में सिंक्रनाइज़ किए गए प्रेषण स्लॉट",
    allCategories: "सभी श्रेणियां",
    highSpeed: "राजधानी / उच्च गति",
    heavyFreight: "भारी मालगाड़ी",
    advisoriesTitle: "लाइव कॉरिडोर परामर्श एवं सक्रिय संघर्ष",
    activeConflicts: "सक्रिय संघर्ष",
    
    // Network View
    networkTitle: "राष्ट्रीय नेटवर्क सी.टी.सी योजनाबद्ध मानचित्र एवं सिग्नल अवलोकन",
    networkSubtitle: "लाइव ऑप्टिकल ट्रैक सर्किट अवलोकन, इंटरलॉकिंग स्थिति एवं अनुभाग-व्यापी ट्रेन स्थिति टेलीमेट्री।",
    activeTrainsGrid: "ग्रिड पर सक्रिय ट्रेनें",
    telemetryLatency: "टेलीमेट्री विलंबता",
    trackHealthIndex: "ट्रैक स्वास्थ्य सूचकांक",
    zoomIn: "ज़ूम इन",
    zoomOut: "ज़ूम आउट",
    resetView: "पुनः सेट करें",
    junctionStatus: "गाज़ियाबाद जंक्शन स्थिति",

    // Assets View
    assetsTitle: "राष्ट्रीय रोलिंग स्टॉक एवं टेलीमेट्री परिसंपत्ति रजिस्टर",
    assetsSubtitle: "केन्द्रीकृत सूची डेटाबेस, भौतिक सेंसिंग बिंदु निदान एवं कार्य आदेश प्रेषण खाता।",
    globalHealthIndex: "वैश्विक स्वास्थ्य सूचकांक",
    criticalAnomalies: "गंभीर विसंगतियां",
    inspectionCycles: "निरीक्षण चक्र",
    assetCol: "परिसंपत्ति आईडी व कोड",
    deptCol: "विभाग",
    sectorCol: "भौतिक क्षेत्र",
    metricCol: "टेलीमेट्री मीट्रिक",
    healthCol: "परिसंपत्ति स्वास्थ्य",
    actionCol: "परिचालन कार्रवाई",
    dispatchOrder: "कार्य आदेश जारी करें",
    viewCadMap: "सीएडी मानचित्र देखें",

    // Analytics View
    navAnalytics: "एनालिटिक्स एवं प्रभाव",
    analyticsTitle: "अंतर-विभागीय परिचालन एनालिटिक्स एवं दक्षता लेखापरीक्षा",
    analyticsSubtitle: "एआई-संचालित ब्लॉक बंडलिंग, परिसंपत्ति उपलब्धता लाभ एवं ट्रेन विलंब न्यूनीकरण का मात्रात्मक मूल्यांकन।",
    analyticsExecutiveSummary: "कार्यकारी लेखापरीक्षा सारांश",
    blockHoursSaved: "सहेजे गए ब्लॉक घंटे",
    assetAvailability: "परिसंपत्ति उपलब्धता",
    bundledTasks: "बंडल किए गए कार्य",
    performanceComparison: "प्रदर्शन तुलना",
    conventionalMethod: "पारंपरिक विधि",
    railSyncAi: "RailSync AI",
    avgBlockDuration: "औसत ब्लॉक अवधि",
    weeklyConflicts: "साप्ताहिक संघर्ष",
    networkAvailability: "नेटवर्क उपलब्धता",
    resourceUtilization: "संसाधन उपयोग",
    allResources: "सभी संसाधन",
    machines: "मशीनें",
    crews: "दस्ता / टीमें",
    delayImpactAnalysis: "विलंब प्रभाव विश्लेषण",
    optimalZone: "इष्टतम परिचालन क्षेत्र (<25मि विलंब)",
    passengerDelayMins: "यात्री ट्रेन नियमन / विलंब मिनट",
    blockDurationHours: "कॉरिडोर ब्लॉक अवधि (घंटे)",

    // Footer
    footerGovt: "भारत सरकार • रेल मंत्रालय",
    footerPortal: "राष्ट्रीय कॉरिडोर नियंत्रण एवं परामर्श पोर्टल (RailSync-v4.2)",
    securityLevel: "सुरक्षा स्तर",
    consoleId: "सी.टी.सी कंसोल आईडी",
    copyright: "© 2026 भारतीय रेल",

    // Statuses & Priorities
    onTime: "समय पर",
    conflict: "संघर्ष",
    delayed: "विलंबित +15मि",
    holding: "लूप पर रुका हुआ",
    speedRestricted: "60 किमी/घंटा सीमित",
    critical: "P1 - गंभीर",
    elevated: "P2 - उच्च",
    standard: "P3 - सामान्य",
    resolved: "हल किया गया"
  },
  TA: {
    // Top Bar & Header
    govtTitle: "இந்திய அரசு • ரயில்வே அமைச்சகம்",
    govtSubtitle: "மத்திய போக்குவரத்து கட்டுப்பாடு மற்றும் ஆலோசனைக் கட்டமைப்பு",
    istClock: "இந்திய நேரம் 05:25 • நேரடி இயக்கம்",
    searchPlaceholder: "ரயில் எண், பிளாக், சிக்னல் அல்லது சொத்து ஐடியை தேடவும்...",
    dispatchAdvisory: "+ அவசர ஆலோசனை",
    officialPortal: "அதிகாரப்பூர்வ தளம்",
    textSize: "அளவு:",
    
    // Navigation Tabs
    navNetwork: "தேசிய நெட்வொர்க் பார்வை",
    navCorridors: "பாதை கண்காணிப்பு",
    navPrioritization: "ஏஐ முன்னுரிமை எஞ்சின்",
    navSchedules: "அட்டவணை மற்றும் ஆலோசனைகள்",
    navAssets: "சொத்து பதிவேடு",
    navAnalytics: "செயல்பாட்டு பகுப்பாய்வு",
    
    // Sidebar
    emergencyHalt: "அவசர நிறுத்தம்",
    emergencySubtitle: "அனைத்து மண்டல முடக்கம்",
    smmsDept: "சிக்னல் & தொலைத்தொடர்பு (SMMS)",
    tmsDept: "பாதை பராமரிப்பு (TMS)",
    tdmsDept: "மின்சார இழுவை (TDMS)",
    coaDept: "இயக்கக் கட்டுப்பாடு (COA)",
    foisDept: "சரக்கு போக்குவரத்து (FOIS)",
    aiDept: "ஏஐ இயக்க தணிக்கை",
    maintBlocks: "பராமரிப்பு தடுப்புகள்",
    defectLogs: "சொத்து கோளாறு பதிவுகள்",
    controllerProfile: "கட்டுப்பாட்டாளர் விவரம்",
    systemGazette: "அரசிதழ் பதிவு",

    // Corridors View
    corridorTitle: "வடகிழக்கு பாதை (NEC) • பிரிவு 07 போக்குவரத்து கன்சோல்",
    corridorSubtitle: "நேரடி ரயில் தகவல், சிக்னல் கட்டுப்பாடு மற்றும் பராமரிப்பு தடுப்பு உகப்பாக்கம்.",
    telemetrySummary: "வடகிழக்கு முதன்மைப் பாதை தொலைத் தகவல் சுருக்கம்",
    officialRecord: "அதிகாரப்பூர்வ கணினி பதிவு",
    latency: "கால தாமதம்",
    activePaths: "செயலில் உள்ள பாதைகள்",
    blocks: "பராமரிப்பு தடுப்புகள்",
    savedHours: "சேமிக்கப்பட்ட மணிநேரங்கள்",
    speed: "வேகம்",
    today: "இன்று (ஆக 31)",
    filter: "வடிகட்டி",
    liveSignalInterlocking: "நேரடி சிக்னல் இணைப்பு கன்சோல்",
    trackCircuitTelemetry: "பாதை சுற்று ஆப்டிகல் தொலைத் தகவல்",
    speedLimitEnforced: "60 கி.மீ வேகக் கட்டுப்பாடு அமலில் உள்ளது",
    
    // Schedules View
    schedulesTitle: "மத்திய ரயில் காலஅட்டவணை மற்றும் இயக்க விவரிப்பு",
    schedulesSubtitle: "அதிகாரப்பூர்வ ரயில் பாதை ஒதுக்கீடு, முன்னுரிமை கட்டுப்பாடு மற்றும் ஆலோசனை நிர்வாகம்.",
    rosterGazette: "அட்டவணை அரசிதழ்",
    liveSynced: "நேரடி இணைப்பு",
    rosterTitle: "செயலில் உள்ள ரயில் அட்டவணை (ஒதுக்கப்பட்ட 5 ரயில்கள்)",
    gazetteRecord: "அரசிதழ் பதிவு",
    trainCol: "ரயில் எண் மற்றும் பெயர்",
    categoryCol: "வகை",
    routeCol: "தொடக்க நிலை → இறுதி நிலை",
    timeCol: "வருகை / புறப்பாடு",
    priorityCol: "முன்னுரிமை நிலை",
    statusCol: "நேரடி நிலை",
    actionsCol: "செயல்பாட்டு வழிகாட்டல்கள்",
    holdBtn: "லூப்பில் நிறுத்து",
    speedBtn: "60 கி.மீ வேகம்",
    clearBtn: "பாதையை தெளிவுபடுத்து",
    dispatchSlotsSynced: "பிரிவு 4ல் அனைத்து ரயில் பாதைகளும் இணைக்கப்பட்டுள்ளன",
    allCategories: "அனைத்து பிரிவுகளும்",
    highSpeed: "ராஜ்தானி / அதிவேக ரயில்",
    heavyFreight: "கனரக சரக்கு ரயில்",
    advisoriesTitle: "நேரடி பாதை ஆலோசனைகள் & முரண்பாடுகள்",
    activeConflicts: "செயலில் உள்ள சிக்கல்கள்",
    
    // Network View
    networkTitle: "தேசிய ரயில்வே நெட்வொர்க் சிடிசி வரைபடம் மற்றும் சிக்னல் பார்வைகள்",
    networkSubtitle: "நேரடி ஆப்டிகல் ட்ராக் சர்க்யூட், சிக்னல் நிலை மற்றும் ரயில் நிலை தொலைத்தொடர்பு.",
    activeTrainsGrid: "செயலில் உள்ள ரயில்கள்",
    telemetryLatency: "தொலைத்தகவல் தாமதம்",
    trackHealthIndex: "பாதை ஆரோக்கிய குறியீடு",
    zoomIn: "பெரிதாக்கு",
    zoomOut: "சிறிதாக்கு",
    resetView: "மீட்டமை",
    junctionStatus: "காசியாபாத் சந்திப்பு நிலை",

    // Assets View
    assetsTitle: "தேசிய ரயில் உபகரணங்கள் மற்றும் சொத்து பதிவேடு",
    assetsSubtitle: "மையப்படுத்தப்பட்ட சொத்து தரவுத்தளம், சென்சார் சோதனை மற்றும் பணி ஆணைப் பதிவேடு.",
    globalHealthIndex: "உலகளாவிய ஆரோக்கிய குறியீடு",
    criticalAnomalies: "முக்கிய சிக்கல்கள்",
    inspectionCycles: "ஆய்வு சுழற்சிகள்",
    assetCol: "சொத்து ஐடி & குறிமுறை",
    deptCol: "துறை",
    sectorCol: "உண்மையான மண்டலம்",
    metricCol: "தொலைத்தொடர்பு அளவீடு",
    healthCol: "சொத்தின் ஆரோக்கியம்",
    actionCol: "செயல்பாட்டு நடவடிக்கை",
    dispatchOrder: "பணி ஆணை அனுப்புக",
    viewCadMap: "சிஏடி வரைபடம் காண்க",

    // Analytics View
    analyticsTitle: "துறைகளுக்கிடையேயான செயல்பாட்டு பகுப்பாய்வு & செயல்திறன் தணிக்கை",
    analyticsSubtitle: "ஏஐ-இயக்கப்பட்ட தடுப்பு இணைப்பு, சொத்து கிடைக்கும் தன்மை அதிகரிப்பு மற்றும் ரயில் தாமதத்தைக் குறைத்தல்.",
    analyticsExecutiveSummary: "நிர்வாக தணிக்கை சுருக்கம்",
    blockHoursSaved: "சேமிக்கப்பட்ட தடுப்பு மணிநேரங்கள்",
    assetAvailability: "சொத்து கிடைக்கும் தன்மை",
    bundledTasks: "இணைக்கப்பட்ட பணிகள்",
    performanceComparison: "செயல்திறன் ஒப்பீடு",
    conventionalMethod: "வழக்கமான முறை",
    railSyncAi: "RailSync AI",
    avgBlockDuration: "சராசரி தடுப்பு கால அளவு",
    weeklyConflicts: "வாராந்திர சிக்கல்கள்",
    networkAvailability: "நெட்வொர்க் கிடைக்கும் தன்மை",
    resourceUtilization: "வள பயன்பாடு",
    allResources: "அனைத்து வளங்களும்",
    machines: "இயந்திரங்கள்",
    crews: "பணிக்குழுக்கள்",
    delayImpactAnalysis: "தாமத தாக்க பகுப்பாய்வு",
    optimalZone: "உகந்த செயல்பாட்டு மண்டலம் (<25நிமி தாமதம்)",
    passengerDelayMins: "பயணிகள் ரயில் தாமதம் (நிமிடங்கள்)",
    blockDurationHours: "பாதை தடுப்பு கால அளவு (மணிநேரங்கள்)",

    // Footer
    footerGovt: "இந்திய அரசு • ரயில்வே அமைச்சகம்",
    footerPortal: "தேசிய ரயில் பாதை கட்டுப்பாடு மற்றும் ஆலோசனை போர்டல் (RailSync-v4.2)",
    securityLevel: "பாதுகாப்பு நிலை",
    consoleId: "சிடிசி கன்சோல் ஐடி",
    copyright: "© 2026 இந்திய ரயில்வே",

    // Statuses & Priorities
    onTime: "சரியான நேரத்தில்",
    conflict: "முரண்பாடு",
    delayed: "தாமதம் +15நிமி",
    holding: "லூப்பில் நிறுத்தப்பட்டது",
    speedRestricted: "60 கி.மீ வேகக் கட்டுப்பாடு",
    critical: "P1 - முக்கியம்",
    elevated: "P2 - உயர் முன்னுரிமை",
    standard: "P3 - சாதாரணம்",
    resolved: "தீர்க்கப்பட்டது"
  }
};
