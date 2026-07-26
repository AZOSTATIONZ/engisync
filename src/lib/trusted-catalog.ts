/**
 * Curated, trusted external resources used as the backbone of recommendations.
 * These are vetted engineering platforms/sites — the AI ranks and explains them
 * for each student rather than inventing URLs. `departmentCode: null` means the
 * resource is broadly useful across engineering; a code scopes it to a discipline.
 */

export type CatalogEntry = {
  name: string;
  url: string;
  category: string;
  description: string;
  difficulty: "BEGINNER" | "INTERMEDIATE" | "ADVANCED";
  tags: string[];
  topics: string[];
  departmentCode: string | null;
};

export const TRUSTED_CATALOG: CatalogEntry[] = [
  // ── Electronic / Electrical Engineering ──
  { name: "Wokwi", url: "https://wokwi.com", category: "Simulator", difficulty: "BEGINNER", departmentCode: "EE", tags: ["esp32", "arduino", "simulation", "embedded"], topics: ["embedded systems", "microcontrollers", "iot"], description: "Browser-based simulator for Arduino, ESP32, Raspberry Pi Pico and more — prototype circuits and firmware with no hardware." },
  { name: "KiCad", url: "https://www.kicad.org", category: "Software", difficulty: "INTERMEDIATE", departmentCode: "EE", tags: ["pcb", "schematic", "eda", "open-source"], topics: ["pcb design", "circuit design"], description: "Free, open-source EDA suite for schematic capture and PCB layout used widely in industry and academia." },
  { name: "LTspice", url: "https://www.analog.com/en/resources/design-tools-and-calculators/ltspice-simulator.html", category: "Simulator", difficulty: "INTERMEDIATE", departmentCode: "EE", tags: ["spice", "analog", "simulation"], topics: ["circuit simulation", "analog electronics"], description: "High-performance SPICE simulator from Analog Devices for analog and power circuit simulation." },
  { name: "STM32CubeIDE", url: "https://www.st.com/en/development-tools/stm32cubeide.html", category: "IDE", difficulty: "ADVANCED", departmentCode: "EE", tags: ["stm32", "arm", "firmware", "embedded"], topics: ["embedded systems", "microcontrollers"], description: "Official ST IDE for STM32 microcontroller development with configuration, code generation, and debugging." },
  { name: "ESP-IDF Documentation", url: "https://docs.espressif.com/projects/esp-idf/en/latest/", category: "Documentation", difficulty: "ADVANCED", departmentCode: "EE", tags: ["esp32", "espressif", "rtos", "iot"], topics: ["embedded systems", "iot", "wifi"], description: "Official Espressif IoT Development Framework docs for ESP32 — the reference for serious ESP32 firmware." },
  { name: "Arduino Documentation", url: "https://docs.arduino.cc", category: "Documentation", difficulty: "BEGINNER", departmentCode: "EE", tags: ["arduino", "embedded", "prototyping"], topics: ["microcontrollers", "embedded systems"], description: "Official Arduino language reference, libraries, and hardware guides — the standard starting point for embedded prototyping." },
  { name: "All About Circuits", url: "https://www.allaboutcircuits.com", category: "Tutorials", difficulty: "BEGINNER", departmentCode: "EE", tags: ["electronics", "theory", "tutorials"], topics: ["circuit theory", "analog electronics", "digital electronics"], description: "Comprehensive electronics textbooks, tutorials, and a community — strong on fundamentals." },
  { name: "Electronics-Tutorials", url: "https://www.electronics-tutorials.ws", category: "Tutorials", difficulty: "BEGINNER", departmentCode: "EE", tags: ["electronics", "tutorials", "theory"], topics: ["circuit theory", "components"], description: "Clear, topic-by-topic electronics tutorials covering components, circuits, and theory." },
  { name: "TI Application Notes", url: "https://www.ti.com/technical-documents/", category: "Reference", difficulty: "ADVANCED", departmentCode: "EE", tags: ["texas-instruments", "app-notes", "analog"], topics: ["analog design", "power electronics"], description: "Texas Instruments technical documents and application notes — authoritative design references." },
  { name: "Microchip Developer Help", url: "https://developerhelp.microchip.com", category: "Documentation", difficulty: "INTERMEDIATE", departmentCode: "EE", tags: ["microchip", "pic", "embedded"], topics: ["microcontrollers", "embedded systems"], description: "Microchip's learning and reference hub for PIC/AVR/SAM microcontrollers and tools." },
  { name: "DigiKey — Learn", url: "https://www.digikey.com/en/resources", category: "Learning", difficulty: "BEGINNER", departmentCode: "EE", tags: ["components", "learning", "reference"], topics: ["components", "electronics"], description: "DigiKey's tutorials, articles, and reference tools for selecting and using electronic components." },
  { name: "Falstad Circuit Simulator", url: "https://www.falstad.com/circuit/", category: "Simulator", difficulty: "BEGINNER", departmentCode: "EE", tags: ["simulation", "interactive", "teaching"], topics: ["circuit theory"], description: "Interactive, visual circuit simulator great for building intuition about how circuits behave." },

  // ── Mechanical / Design ──
  { name: "GrabCAD", url: "https://grabcad.com", category: "Library", difficulty: "BEGINNER", departmentCode: "MECH", tags: ["cad", "models", "community"], topics: ["cad", "mechanical design"], description: "Large community CAD model library and tutorials for mechanical design." },
  { name: "Autodesk Fusion — Learn", url: "https://www.autodesk.com/products/fusion-360/learn-support", category: "Learning", difficulty: "INTERMEDIATE", departmentCode: "MECH", tags: ["cad", "cam", "fusion360"], topics: ["cad", "cam", "simulation"], description: "Official learning hub for Fusion 360 CAD/CAM/CAE with free access for students." },
  { name: "Engineering Toolbox", url: "https://www.engineeringtoolbox.com", category: "Reference", difficulty: "BEGINNER", departmentCode: "MECH", tags: ["reference", "formulas", "materials"], topics: ["thermodynamics", "materials", "fluids"], description: "Vast reference of engineering formulas, material properties, and calculators." },

  // ── Software / Computer ──
  { name: "MDN Web Docs", url: "https://developer.mozilla.org", category: "Documentation", difficulty: "BEGINNER", departmentCode: "CS", tags: ["web", "javascript", "reference"], topics: ["web development"], description: "The definitive reference for web platform technologies (HTML/CSS/JS)." },
  { name: "freeCodeCamp", url: "https://www.freecodecamp.org", category: "Course", difficulty: "BEGINNER", departmentCode: "CS", tags: ["programming", "free", "projects"], topics: ["programming", "web development"], description: "Free, project-based programming curriculum with certifications." },
  { name: "The Missing Semester (MIT)", url: "https://missing.csail.mit.edu", category: "Course", difficulty: "INTERMEDIATE", departmentCode: "CS", tags: ["tooling", "shell", "git"], topics: ["developer tools", "version control"], description: "MIT's course on the tools every engineer should master: shell, git, editors, debugging." },

  // ── General engineering (all departments) ──
  { name: "GitHub", url: "https://github.com", category: "Platform", difficulty: "BEGINNER", departmentCode: null, tags: ["git", "collaboration", "open-source"], topics: ["version control", "collaboration"], description: "Version control and collaboration platform — host code, track issues, and work as a team." },
  { name: "Overleaf", url: "https://www.overleaf.com", category: "Tool", difficulty: "BEGINNER", departmentCode: null, tags: ["latex", "writing", "reports"], topics: ["technical writing", "reports"], description: "Collaborative LaTeX editor ideal for professional project reports and papers." },
  { name: "Google Scholar", url: "https://scholar.google.com", category: "Research", difficulty: "INTERMEDIATE", departmentCode: null, tags: ["research", "papers", "citations"], topics: ["literature review", "research"], description: "Search engine for scholarly literature — essential for literature reviews." },
  { name: "MATLAB Onramp", url: "https://matlabacademy.mathworks.com", category: "Course", difficulty: "BEGINNER", departmentCode: null, tags: ["matlab", "simulation", "maths"], topics: ["numerical computing", "simulation"], description: "Free interactive MATLAB/Simulink training from MathWorks." },
  { name: "Khan Academy", url: "https://www.khanacademy.org", category: "Course", difficulty: "BEGINNER", departmentCode: null, tags: ["maths", "physics", "fundamentals"], topics: ["mathematics", "physics"], description: "Free lessons in maths and physics fundamentals underpinning all engineering." },
];

/** Entries relevant to a department code (its own + general). */
export function catalogForDepartment(code: string | null | undefined): CatalogEntry[] {
  return TRUSTED_CATALOG.filter(
    (e) => e.departmentCode === null || (code && e.departmentCode === code),
  );
}
