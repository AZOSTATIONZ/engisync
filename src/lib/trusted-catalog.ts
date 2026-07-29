/**
 * Curated, trusted external resources used as the backbone of recommendations.
 * These are vetted engineering platforms/sites — the AI ranks and explains them
 * for each student rather than inventing URLs. `departmentCode: null` means the
 * resource is broadly useful across engineering; a code scopes it to a discipline.
 */

/**
 * WHAT AN ENTRY CARRIES, AND WHY
 * ------------------------------
 * A link and a blurb is a bookmark, not a resource. A student deciding whether
 * to spend an evening on something needs to know four things a URL cannot tell
 * them, so every entry answers them explicitly:
 *
 *   whyItMatters  What it gets you that a search engine would not. This is the
 *                 editorial judgement — the reason it is on the list at all.
 *   useFor        The concrete task you would open it to do. "Simulate an
 *                 ESP32 without owning one" beats "embedded systems".
 *   cost          FREE / FREE_TIER / FREE_FOR_STUDENTS / PAID. Students in
 *                 Zimbabwe cannot assume a card, and "free" that turns out to
 *                 mean a 14-day trial wastes their time.
 *   offline       Whether it works without a connection. Mobile data is
 *                 expensive and campus wifi is unreliable; a tool that needs
 *                 a live connection to open is a different proposition.
 *
 * VERIFICATION RULE: `url` must have been FETCHED and confirmed to load. A
 * plausible-looking URL written from memory is worse than no link, because a
 * student trusts it and loses an afternoon. Sources shared with the Project Hub
 * carry their verification date in lib/project-hub.ts.
 */
export type Cost = "FREE" | "FREE_TIER" | "FREE_FOR_STUDENTS" | "PAID";

export type CatalogEntry = {
  name: string;
  url: string;
  category: string;
  description: string;
  difficulty: "BEGINNER" | "INTERMEDIATE" | "ADVANCED";
  tags: string[];
  topics: string[];
  departmentCode: string | null;
  whyItMatters?: string;
  useFor?: string;
  cost?: Cost;
  offline?: boolean;
};

export const TRUSTED_CATALOG: CatalogEntry[] = [
  // ── Electronic / Electrical Engineering ──
  { name: "STM32CubeIDE", url: "https://www.st.com/en/development-tools/stm32cubeide.html", category: "IDE", difficulty: "ADVANCED", departmentCode: "EE", tags: ["stm32", "arm", "firmware", "embedded"], topics: ["embedded systems", "microcontrollers"], description: "Official ST IDE for STM32 microcontroller development with configuration, code generation, and debugging." },
  { name: "ESP-IDF Documentation", url: "https://docs.espressif.com/projects/esp-idf/en/latest/", category: "Documentation", difficulty: "ADVANCED", departmentCode: "EE", tags: ["esp32", "espressif", "rtos", "iot"], topics: ["embedded systems", "iot", "wifi"], description: "Official Espressif IoT Development Framework docs for ESP32 — the reference for serious ESP32 firmware." },
  { name: "Arduino Documentation", url: "https://docs.arduino.cc", category: "Documentation", difficulty: "BEGINNER", departmentCode: "EE", tags: ["arduino", "embedded", "prototyping"], topics: ["microcontrollers", "embedded systems"], description: "Official Arduino language reference, libraries, and hardware guides — the standard starting point for embedded prototyping." },
  { name: "All About Circuits", url: "https://www.allaboutcircuits.com", category: "Tutorials", difficulty: "BEGINNER", departmentCode: "EE", tags: ["electronics", "theory", "tutorials"], topics: ["circuit theory", "analog electronics", "digital electronics"], description: "Comprehensive electronics textbooks, tutorials, and a community — strong on fundamentals." },
  { name: "Electronics-Tutorials", url: "https://www.electronics-tutorials.ws", category: "Tutorials", difficulty: "BEGINNER", departmentCode: "EE", tags: ["electronics", "tutorials", "theory"], topics: ["circuit theory", "components"], description: "Clear, topic-by-topic electronics tutorials covering components, circuits, and theory." },
  { name: "TI Application Notes", url: "https://www.ti.com/technical-documents/", category: "Reference", difficulty: "ADVANCED", departmentCode: "EE", tags: ["texas-instruments", "app-notes", "analog"], topics: ["analog design", "power electronics"], description: "Texas Instruments technical documents and application notes — authoritative design references." },
  { name: "Microchip Developer Help", url: "https://developerhelp.microchip.com", category: "Documentation", difficulty: "INTERMEDIATE", departmentCode: "EE", tags: ["microchip", "pic", "embedded"], topics: ["microcontrollers", "embedded systems"], description: "Microchip's learning and reference hub for PIC/AVR/SAM microcontrollers and tools." },
  { name: "DigiKey — Learn", url: "https://www.digikey.com/en/resources", category: "Learning", difficulty: "BEGINNER", departmentCode: "EE", tags: ["components", "learning", "reference"], topics: ["components", "electronics"], description: "DigiKey's tutorials, articles, and reference tools for selecting and using electronic components." },

  // ── Mechanical / Design ──
  { name: "Autodesk Fusion — Learn", url: "https://www.autodesk.com/products/fusion-360/learn-support", category: "Learning", difficulty: "INTERMEDIATE", departmentCode: "MECH", tags: ["cad", "cam", "fusion360"], topics: ["cad", "cam", "simulation"], description: "Official learning hub for Fusion 360 CAD/CAM/CAE with free access for students." },
  { name: "Engineering Toolbox", url: "https://www.engineeringtoolbox.com", category: "Reference", difficulty: "BEGINNER", departmentCode: "MECH", tags: ["reference", "formulas", "materials"], topics: ["thermodynamics", "materials", "fluids"], description: "Vast reference of engineering formulas, material properties, and calculators." },

  // ── Software / Computer ──
  { name: "MDN Web Docs", url: "https://developer.mozilla.org", category: "Documentation", difficulty: "BEGINNER", departmentCode: "CS", tags: ["web", "javascript", "reference"], topics: ["web development"], description: "The definitive reference for web platform technologies (HTML/CSS/JS)." },
  { name: "freeCodeCamp", url: "https://www.freecodecamp.org", category: "Course", difficulty: "BEGINNER", departmentCode: "CS", tags: ["programming", "free", "projects"], topics: ["programming", "web development"], description: "Free, project-based programming curriculum with certifications." },

  // ── General engineering (all departments) ──
  { name: "GitHub", url: "https://github.com", category: "Platform", difficulty: "BEGINNER", departmentCode: null, tags: ["git", "collaboration", "open-source"], topics: ["version control", "collaboration"], description: "Version control and collaboration platform — host code, track issues, and work as a team." },
  { name: "Overleaf", url: "https://www.overleaf.com", category: "Tool", difficulty: "BEGINNER", departmentCode: null, tags: ["latex", "writing", "reports"], topics: ["technical writing", "reports"], description: "Collaborative LaTeX editor ideal for professional project reports and papers." },
  { name: "Google Scholar", url: "https://scholar.google.com", category: "Research", difficulty: "INTERMEDIATE", departmentCode: null, tags: ["research", "papers", "citations"], topics: ["literature review", "research"], description: "Search engine for scholarly literature — essential for literature reviews." },
  { name: "MATLAB Onramp", url: "https://matlabacademy.mathworks.com", category: "Course", difficulty: "BEGINNER", departmentCode: null, tags: ["matlab", "simulation", "maths"], topics: ["numerical computing", "simulation"], description: "Free interactive MATLAB/Simulink training from MathWorks." },
  { name: "Khan Academy", url: "https://www.khanacademy.org", category: "Course", difficulty: "BEGINNER", departmentCode: null, tags: ["maths", "physics", "fundamentals"], topics: ["mathematics", "physics"], description: "Free lessons in maths and physics fundamentals underpinning all engineering.", cost: "FREE", offline: false, useFor: "Filling a gap in calculus or mechanics before it blocks a module.", whyItMatters: "Most 'I can't do this course' problems are actually a missing prerequisite from two years earlier." },

  /* ── PROTOTYPING WITHOUT HARDWARE ─────────────────────────────────────
     The single biggest constraint on an engineering student in Zimbabwe is
     not ability, it is access to components. Everything below removes that
     constraint: a student with only a laptop can design, simulate and debug
     real systems, and arrive at a job already fluent in the tools. */
  {
    name: "Wokwi — ESP32 & Arduino simulator",
    url: "https://wokwi.com",
    category: "Simulator",
    difficulty: "BEGINNER",
    departmentCode: "EE",
    tags: ["esp32", "arduino", "simulation", "embedded", "no-hardware"],
    topics: ["embedded systems", "microcontrollers", "iot"],
    description:
      "Browser simulator for ESP32, Arduino and Raspberry Pi Pico with working sensors, displays and wifi.",
    whyItMatters:
      "You can build and debug a complete embedded project before buying a single component — and find your wiring mistakes for free.",
    useFor: "Prototyping firmware, testing a circuit, sharing a working demo as a link.",
    cost: "FREE_TIER",
    offline: false,
  },
  {
    name: "Tinkercad Circuits",
    url: "https://www.tinkercad.com/circuits",
    category: "Simulator",
    difficulty: "BEGINNER",
    departmentCode: "EE",
    tags: ["arduino", "breadboard", "simulation", "no-hardware"],
    topics: ["circuit theory", "microcontrollers"],
    description: "Drag-and-drop breadboard simulator with an integrated Arduino and multimeter.",
    whyItMatters:
      "The gentlest possible start: you can burn out a virtual LED and learn why, at no cost.",
    useFor: "A first circuit, and checking a breadboard layout before building it.",
    cost: "FREE",
    offline: false,
  },
  {
    name: "Falstad Circuit Simulator",
    url: "https://www.falstad.com/circuit/",
    category: "Simulator",
    difficulty: "BEGINNER",
    departmentCode: "EE",
    tags: ["simulation", "interactive", "analog", "no-hardware"],
    topics: ["circuit theory"],
    description: "Animated circuit simulator that draws current as moving charge.",
    whyItMatters:
      "It makes current and voltage visible. Students who 'know the equations but don't get it' usually get it here.",
    useFor: "Building intuition for filters, transients and reactive components.",
    cost: "FREE",
    offline: false,
  },
  {
    name: "Onshape",
    url: "https://www.onshape.com",
    category: "Software",
    difficulty: "INTERMEDIATE",
    departmentCode: "MECH",
    tags: ["cad", "cloud", "collaboration", "pdm", "no-install"],
    topics: ["cad", "mechanical design", "assemblies"],
    description:
      "Professional cloud CAD with version control and branching, running entirely in a browser.",
    whyItMatters:
      "Runs on a low-spec laptop where SolidWorks will not, and teaches branching and merging — the version control practice most engineering graduates lack.",
    useFor: "Team CAD where several people edit one assembly without emailing files.",
    cost: "FREE_FOR_STUDENTS",
    offline: false,
  },
  {
    name: "FreeCAD",
    url: "https://www.freecad.org",
    category: "Software",
    difficulty: "INTERMEDIATE",
    departmentCode: "MECH",
    tags: ["cad", "open-source", "fem", "parametric", "offline"],
    topics: ["cad", "finite element", "technical drawing"],
    description: "Open-source parametric 3D modeller with FEM, CAM and technical drawing.",
    whyItMatters:
      "Installs once and works with no internet and no licence — the only serious CAD option when connectivity or money is the constraint.",
    useFor: "Parametric modelling, dimensioned drawings, basic stress analysis.",
    cost: "FREE",
    offline: true,
  },
  {
    name: "KiCad",
    url: "https://www.kicad.org",
    category: "Software",
    difficulty: "INTERMEDIATE",
    departmentCode: "EE",
    tags: ["pcb", "schematic", "eda", "open-source", "offline"],
    topics: ["pcb design", "circuit design"],
    description: "Full open-source EDA suite: schematic capture, PCB layout, 3D preview, gerbers.",
    whyItMatters:
      "Producing a manufacturable board is the step that separates a hobbyist from an electronic engineer, and this is the industry-credible tool that costs nothing.",
    useFor: "Taking a working breadboard circuit to a fabricated PCB.",
    cost: "FREE",
    offline: true,
  },
  {
    name: "LTspice",
    url: "https://www.analog.com/en/resources/design-tools-and-calculators/ltspice-simulator.html",
    category: "Simulator",
    difficulty: "INTERMEDIATE",
    departmentCode: "EE",
    tags: ["spice", "analog", "power", "simulation", "offline"],
    topics: ["circuit simulation", "power electronics"],
    description: "Industry-standard SPICE simulator from Analog Devices, free and unlimited.",
    whyItMatters:
      "Power electronics designs are simulated before they are built, because the failure mode of getting it wrong is an exploding MOSFET.",
    useFor: "Verifying converter topologies, filters and op-amp circuits before committing.",
    cost: "FREE",
    offline: true,
  },
  {
    name: "ROS 2",
    url: "https://docs.ros.org/en/rolling/index.html",
    category: "Documentation",
    difficulty: "ADVANCED",
    departmentCode: "MECH",
    tags: ["robotics", "ros", "slam", "simulation"],
    topics: ["robotics", "navigation", "control"],
    description: "The robotics framework used across industry and research, with Gazebo simulation.",
    whyItMatters:
      "ROS is what robotics job adverts actually ask for, and Gazebo means you can develop a full robot before owning one.",
    useFor: "Autonomous navigation, sensor fusion, robot simulation.",
    cost: "FREE",
    offline: true,
  },
  {
    name: "PlatformIO",
    url: "https://docs.platformio.org/en/latest/",
    category: "Software",
    difficulty: "INTERMEDIATE",
    departmentCode: "EE",
    tags: ["embedded", "toolchain", "vscode", "ci"],
    topics: ["embedded systems", "build systems"],
    description: "Professional embedded build system supporting 1000+ boards inside VS Code.",
    whyItMatters:
      "The step up from the Arduino IDE: real dependency management, unit testing and CI for firmware — how embedded work is done in industry.",
    useFor: "Any firmware project that outgrew a single .ino file.",
    cost: "FREE",
    offline: true,
  },

  /* ── LEARNING BY BUILDING ───────────────────────────────────────────── */
  {
    name: "Arduino Project Hub",
    url: "https://projecthub.arduino.cc/",
    category: "Projects",
    difficulty: "BEGINNER",
    departmentCode: "EE",
    tags: ["projects", "arduino", "community", "ideas"],
    topics: ["embedded systems", "prototyping"],
    description: "Thousands of community projects with full code, wiring diagrams and parts lists.",
    whyItMatters: "Complete builds you can follow end to end, rather than fragments from a forum.",
    useFor: "Finding a project at your level and seeing exactly what it takes.",
    cost: "FREE",
    offline: false,
  },
  {
    name: "Hackster.io",
    url: "https://www.hackster.io/",
    category: "Projects",
    difficulty: "INTERMEDIATE",
    departmentCode: null,
    tags: ["projects", "hardware", "iot", "competitions"],
    topics: ["prototyping", "iot", "embedded systems"],
    description: "Hardware project community with build logs, plus regular sponsored competitions.",
    whyItMatters:
      "The competitions are a genuine route to hardware, recognition and a portfolio piece — entries are judged on working builds.",
    useFor: "Documenting your own project publicly and entering competitions.",
    cost: "FREE",
    offline: false,
  },
  {
    name: "Random Nerd Tutorials",
    url: "https://randomnerdtutorials.com/",
    category: "Tutorials",
    difficulty: "BEGINNER",
    departmentCode: "EE",
    tags: ["esp32", "iot", "tutorials", "wifi"],
    topics: ["iot", "embedded systems", "web servers"],
    description: "Consistently working, well-tested ESP32/ESP8266 tutorials with complete code.",
    whyItMatters:
      "Tutorials that actually compile. That sounds like a low bar until you have lost a weekend to one that does not.",
    useFor: "Getting a sensor, display or wifi feature working quickly and correctly.",
    cost: "FREE",
    offline: false,
  },
  {
    name: "Adafruit Learning System",
    url: "https://learn.adafruit.com/",
    category: "Tutorials",
    difficulty: "BEGINNER",
    departmentCode: "EE",
    tags: ["electronics", "circuitpython", "sensors", "wearables"],
    topics: ["electronics", "microcontrollers", "sensors"],
    description: "3,000+ illustrated guides covering components, soldering and CircuitPython.",
    whyItMatters:
      "Explains the WHY behind each wiring choice, so you can adapt a design rather than only copy it.",
    useFor: "Understanding a component properly before designing it into your own board.",
    cost: "FREE",
    offline: false,
  },
  {
    name: "GrabCAD",
    url: "https://grabcad.com",
    category: "Library",
    difficulty: "BEGINNER",
    departmentCode: "MECH",
    tags: ["cad", "models", "community", "parts"],
    topics: ["cad", "mechanical design"],
    description: "Millions of free CAD models — bearings, motors, fasteners, gearboxes.",
    whyItMatters:
      "Nobody should model a standard M8 bolt from scratch. Reusing library parts is how professionals work.",
    useFor: "Dropping accurate standard components into your assembly.",
    cost: "FREE",
    offline: false,
  },

  /* ── CAREER AND EMPLOYABILITY ───────────────────────────────────────── */
  {
    name: "roadmap.sh",
    url: "https://roadmap.sh/",
    category: "Learning path",
    difficulty: "BEGINNER",
    departmentCode: "CS",
    tags: ["career", "roadmap", "self-study", "interview"],
    topics: ["career development", "software engineering", "learning paths"],
    description:
      "Community-built step-by-step learning paths for every software role, plus project ideas.",
    whyItMatters:
      "Answers 'what do I learn next, and in what order' — the question that stalls most self-taught progress.",
    useFor: "Planning a semester of self-study toward a specific job title.",
    cost: "FREE",
    offline: false,
  },
  {
    name: "The Missing Semester (MIT)",
    url: "https://missing.csail.mit.edu",
    category: "Course",
    difficulty: "INTERMEDIATE",
    departmentCode: null,
    tags: ["shell", "git", "tooling", "debugging"],
    topics: ["developer tools", "version control"],
    description: "MIT's course on the tools every engineer is assumed to know and nobody teaches.",
    whyItMatters:
      "Shell, git and debugging are assumed knowledge in every engineering job and taught in almost no degree.",
    useFor: "Becoming fast and credible on a command line.",
    cost: "FREE",
    offline: false,
  },
  {
    name: "MIT OpenCourseWare",
    url: "https://ocw.mit.edu/",
    category: "Course",
    difficulty: "INTERMEDIATE",
    departmentCode: null,
    tags: ["lectures", "notes", "problem-sets", "university"],
    topics: ["engineering fundamentals", "mathematics", "physics"],
    description: "Full MIT course materials — lectures, notes, problem sets and exams — free.",
    whyItMatters:
      "When a lecturer's notes are thin, this is the same material taught by the people who wrote the textbook.",
    useFor: "A second explanation of a topic you did not follow the first time.",
    cost: "FREE",
    offline: false,
  },
];

/** Entries relevant to a department code (its own + general). */
export function catalogForDepartment(code: string | null | undefined): CatalogEntry[] {
  return TRUSTED_CATALOG.filter(
    (e) => e.departmentCode === null || (code && e.departmentCode === code),
  );
}
