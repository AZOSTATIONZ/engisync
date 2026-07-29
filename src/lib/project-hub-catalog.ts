import type { HubProject } from "@/lib/project-hub";

/**
 * The curated project catalogue.
 *
 * EDITORIAL RULES — please keep to these when adding entries.
 *
 * 1. Every project must be BUILDABLE BY A STUDENT IN ZIMBABWE. Budgets are in
 *    US dollars because that is how components are priced locally, and they
 *    assume parts ordered online or bought in Harare — not a university
 *    stockroom that may be empty.
 *
 * 2. Budgets are honest, including the parts people forget (jumper wires, a
 *    breadboard, an enclosure). A project advertised at $15 that actually
 *    costs $60 wastes money a student does not have.
 *
 * 3. `prerequisites` are honest too. It is kinder to say "you need to have
 *    done a control systems course" than to let someone spend three weeks
 *    discovering it.
 *
 * 4. Where a project can be done with no hardware at all, `simulationOnly` is
 *    true. Not every student can buy components, and a simulated build is a
 *    real build — Wokwi and LTspice are how professionals prototype.
 *
 * 5. `outcomes` describe CAPABILITY ("size a solar array from a load profile"),
 *    not topics covered ("learn about solar"). A student should be able to
 *    read the outcome and know whether it is worth their semester.
 *
 * 6. Links are `SourceId` references only. Never inline a URL here.
 */
export const HUB_PROJECTS: HubProject[] = [
  /* ── ELECTRICAL ──────────────────────────────────────────────────── */
  {
    slug: "solar-phone-charging-station",
    title: "Solar phone charging station",
    discipline: "ELECTRICAL",
    tier: "BEGINNER",
    summary:
      "A small photovoltaic panel, charge controller and battery that keeps phones charged through load shedding. The cheapest honest introduction to energy balance.",
    weeks: 3,
    budgetUsd: { min: 45, max: 80 },
    bom: [
      { item: "20 W polycrystalline PV panel", qty: 1, unitUsd: 22 },
      { item: "PWM solar charge controller (10 A)", qty: 1, unitUsd: 9 },
      { item: "12 V 7 Ah sealed lead-acid battery", qty: 1, unitUsd: 18 },
      { item: "12 V → 5 V USB buck converter", qty: 2, unitUsd: 3 },
      { item: "Inline fuse holder and 10 A fuses", qty: 1, unitUsd: 2 },
      { item: "Wiring, lugs, terminal block, enclosure", qty: 1, unitUsd: 8 },
    ],
    software: ["Multimeter (physical)", "Spreadsheet"],
    outcomes: [
      "Size a panel and battery from a measured daily load, not a guess",
      "Wire and fuse a DC system safely, with correct polarity and protection",
      "Measure charge and discharge behaviour and explain the losses you find",
    ],
    prerequisites: [
      "Ohm's law and series/parallel circuits",
      "Comfortable using a multimeter",
    ],
    challenges: [
      "Your measured output will be well below the panel rating — explaining why is the actual work",
      "Lead-acid batteries are ruined by deep discharge; your controller settings matter more than the panel",
    ],
    sources: [
      "allAboutCircuits",
      "electronicsTutorials",
      "engineeringToolbox",
      "falstad",
    ],
    tags: ["solar", "power", "energy", "battery", "dc"],
    simulationOnly: false,
  },
  {
    slug: "three-phase-motor-starter",
    title: "Three-phase motor starter with overload protection",
    discipline: "ELECTRICAL",
    tier: "INTERMEDIATE",
    summary:
      "A direct-on-line starter with contactor, thermal overload and control circuit — the single most common piece of industrial electrical work in the country.",
    weeks: 4,
    budgetUsd: { min: 60, max: 110 },
    bom: [
      { item: "3-pole contactor (9 A, 230 V coil)", qty: 1, unitUsd: 18 },
      { item: "Thermal overload relay", qty: 1, unitUsd: 15 },
      { item: "Start/stop push-button station", qty: 1, unitUsd: 9 },
      { item: "DIN rail, enclosure and terminals", qty: 1, unitUsd: 20 },
      { item: "Control and power cable", qty: 1, unitUsd: 12 },
    ],
    software: ["Circuit drawing tool", "LTspice (control logic study)"],
    outcomes: [
      "Draw and wire a control circuit from a ladder diagram",
      "Select a contactor and overload from motor nameplate data",
      "Explain latching, interlocks and why the stop button is normally closed",
    ],
    prerequisites: [
      "Three-phase fundamentals",
      "Supervised access to a lab bench — do not energise this alone",
    ],
    challenges: [
      "The normally-closed stop button is a safety requirement, not a style choice; be able to defend it",
      "Overload selection depends on service factor and duty cycle, not just rated current",
    ],
    sources: ["allAboutCircuits", "electronicsTutorials", "ltspice"],
    tags: ["motors", "control", "industrial", "power", "safety"],
    simulationOnly: false,
  },
  {
    slug: "prepaid-energy-meter",
    title: "Prepaid energy meter with tamper logging",
    discipline: "ELECTRICAL",
    tier: "ADVANCED",
    summary:
      "Measure real energy consumption with a current transformer and voltage divider, deduct from a prepaid balance, and log tamper events — the metering problem ZESA actually has.",
    weeks: 8,
    budgetUsd: { min: 55, max: 95 },
    bom: [
      { item: "ESP32 development board", qty: 1, unitUsd: 8 },
      { item: "SCT-013 split-core current transformer", qty: 1, unitUsd: 11 },
      { item: "ZMPT101B voltage sensor module", qty: 1, unitUsd: 6 },
      { item: "16x2 I2C LCD", qty: 1, unitUsd: 5 },
      { item: "Relay module (30 A) for disconnect", qty: 1, unitUsd: 7 },
      { item: "microSD module, enclosure, passives", qty: 1, unitUsd: 14 },
    ],
    software: ["Arduino IDE or PlatformIO", "Wokwi (logic prototyping)"],
    outcomes: [
      "Sample AC waveforms and compute true RMS power rather than assuming a power factor of 1",
      "Calibrate a sensor against a known reference and quantify your error",
      "Design an append-only event log that survives power loss",
    ],
    prerequisites: [
      "AC circuit theory including power factor",
      "Embedded C and interrupt-driven sampling",
      "Mains wiring must be done under supervision",
    ],
    challenges: [
      "Naive averaging gives apparent power, not real power — the phase relationship is the whole problem",
      "Calibration drifts with temperature; show that you measured it",
    ],
    sources: ["espIdf", "randomNerd", "wokwi", "platformio", "tiAppNotes"],
    tags: ["metering", "esp32", "power", "sensors", "iot"],
    simulationOnly: false,
  },
  {
    slug: "mppt-solar-charge-controller",
    title: "MPPT solar charge controller",
    discipline: "ELECTRICAL",
    tier: "FINAL_YEAR",
    summary:
      "A buck converter with maximum power point tracking, benchmarked against a PWM controller to prove the efficiency gain. Enough depth for a defensible final-year report.",
    weeks: 20,
    budgetUsd: { min: 90, max: 160 },
    bom: [
      { item: "Power MOSFETs and gate driver", qty: 1, unitUsd: 14 },
      { item: "Inductor, capacitors and passives", qty: 1, unitUsd: 18 },
      { item: "Current and voltage sense circuitry", qty: 1, unitUsd: 12 },
      { item: "STM32 or ESP32 controller board", qty: 1, unitUsd: 10 },
      { item: "Custom PCB (fabricated)", qty: 1, unitUsd: 30 },
      { item: "Heatsinks, connectors, enclosure", qty: 1, unitUsd: 16 },
    ],
    software: ["KiCad", "LTspice", "STM32CubeIDE", "MATLAB/Simulink"],
    outcomes: [
      "Design and simulate a buck converter, then build the board you simulated",
      "Implement perturb-and-observe MPPT and defend its limits under partial shading",
      "Produce a measured efficiency comparison with proper uncertainty",
    ],
    prerequisites: [
      "Power electronics course",
      "Control systems fundamentals",
      "Prior PCB design experience — this is not a first board",
    ],
    challenges: [
      "Switching layout is where these fail: gate loops and ground bounce, not the algorithm",
      "Perturb-and-observe oscillates around the maximum power point; quantify the loss rather than claiming perfection",
    ],
    sources: ["ltspice", "kicad", "stm32CubeIde", "tiAppNotes", "matlabOnramp", "scholar"],
    tags: ["power-electronics", "solar", "mppt", "pcb", "control"],
    simulationOnly: false,
  },

  /* ── ELECTRONIC ──────────────────────────────────────────────────── */
  {
    slug: "environment-data-logger",
    title: "Temperature and humidity data logger",
    discipline: "ELECTRONIC",
    tier: "BEGINNER",
    summary:
      "Read a sensor, timestamp it, write it to an SD card, and plot a week of real data. The project every other sensor project is built on.",
    weeks: 2,
    budgetUsd: { min: 18, max: 35 },
    bom: [
      { item: "Arduino Uno or Nano", qty: 1, unitUsd: 7 },
      { item: "DHT22 temperature/humidity sensor", qty: 1, unitUsd: 5 },
      { item: "DS3231 real-time clock module", qty: 1, unitUsd: 4 },
      { item: "microSD card module and card", qty: 1, unitUsd: 7 },
      { item: "Breadboard, jumpers, enclosure", qty: 1, unitUsd: 6 },
    ],
    software: ["Arduino IDE", "Wokwi", "Spreadsheet"],
    outcomes: [
      "Read a digital sensor over a one-wire protocol and handle read failures",
      "Timestamp and persist data so it survives a reset",
      "Turn a week of raw readings into a graph that says something",
    ],
    prerequisites: ["Basic programming (any language)"],
    challenges: [
      "DHT22 reads fail intermittently — handling that gracefully is the real lesson",
      "Without an RTC your timestamps reset on every power cut, which is exactly when you need them",
    ],
    sources: [
      "arduinoDocs",
      "wokwi",
      "randomNerd",
      "adafruitLearn",
      "tinkercadCircuits",
      "arduinoProjectHub",
    ],
    tags: ["sensors", "arduino", "logging", "data", "beginner"],
    simulationOnly: true,
  },
  {
    slug: "iot-weather-station",
    title: "IoT weather station with web dashboard",
    discipline: "ELECTRONIC",
    tier: "INTERMEDIATE",
    summary:
      "An ESP32 publishing temperature, humidity and pressure to a dashboard you can open from anywhere, designed to survive intermittent power and connectivity.",
    weeks: 5,
    budgetUsd: { min: 30, max: 55 },
    bom: [
      { item: "ESP32 development board", qty: 1, unitUsd: 8 },
      { item: "BME280 pressure/humidity/temperature sensor", qty: 1, unitUsd: 6 },
      { item: "18650 cell with TP4056 charger", qty: 1, unitUsd: 9 },
      { item: "Small solar panel (5 V, 2 W)", qty: 1, unitUsd: 8 },
      { item: "Weatherproof enclosure and mounting", qty: 1, unitUsd: 10 },
    ],
    software: ["Arduino IDE or PlatformIO", "Wokwi"],
    outcomes: [
      "Connect an embedded device to a network and publish data reliably",
      "Use deep sleep to make a battery last weeks instead of hours",
      "Buffer readings locally so a dropped connection loses nothing",
    ],
    prerequisites: [
      "Completed a basic sensor project",
      "Comfortable with Wi-Fi credentials and simple HTTP or MQTT",
    ],
    challenges: [
      "Reconnection logic is most of the code; the happy path is easy",
      "Self-heating from the ESP32 will bias your temperature readings if the sensor sits too close",
    ],
    sources: ["espIdf", "randomNerd", "wokwi", "platformio", "adafruitLearn"],
    tags: ["iot", "esp32", "sensors", "wireless", "low-power"],
    simulationOnly: false,
  },
  {
    slug: "custom-pcb-sensor-board",
    title: "Custom PCB sensor board",
    discipline: "ELECTRONIC",
    tier: "ADVANCED",
    summary:
      "Take a working breadboard circuit through schematic capture, layout, fabrication and bring-up. The step that separates a hobbyist from an electronic engineer.",
    weeks: 10,
    budgetUsd: { min: 50, max: 90 },
    bom: [
      { item: "PCB fabrication (5 boards, 2-layer)", qty: 1, unitUsd: 25 },
      { item: "Surface-mount components and connectors", qty: 1, unitUsd: 20 },
      { item: "Stencil (optional but recommended)", qty: 1, unitUsd: 12 },
      { item: "Solder paste, flux, consumables", qty: 1, unitUsd: 15 },
    ],
    software: ["KiCad", "LTspice"],
    outcomes: [
      "Produce a manufacturable board: correct footprints, DRC clean, sensible stackup",
      "Lay out decoupling, ground and power so the board actually works first time",
      "Bring up and debug your own hardware methodically rather than by guessing",
    ],
    prerequisites: [
      "A circuit that already works on breadboard",
      "Soldering practice — surface-mount is a skill, not a formality",
    ],
    challenges: [
      "Footprint errors are the classic first-board failure; check every one against the datasheet drawing",
      "Fabrication turnaround plus shipping to Zimbabwe is weeks — order early and order spares",
    ],
    sources: ["kicad", "ltspice", "tiAppNotes", "adafruitLearn", "allAboutCircuits"],
    tags: ["pcb", "kicad", "hardware", "design", "smd"],
    simulationOnly: false,
  },
  {
    slug: "lora-borehole-telemetry",
    title: "LoRa borehole water-level telemetry",
    discipline: "ELECTRONIC",
    tier: "FINAL_YEAR",
    summary:
      "Long-range, low-power monitoring of water level and pump status across kilometres with no cellular coverage — a genuine rural infrastructure problem.",
    weeks: 22,
    budgetUsd: { min: 110, max: 190 },
    bom: [
      { item: "LoRa transceiver modules (SX1276)", qty: 2, unitUsd: 12 },
      { item: "Submersible pressure level sensor (4–20 mA)", qty: 1, unitUsd: 45 },
      { item: "Low-power microcontroller boards", qty: 2, unitUsd: 8 },
      { item: "Solar panel, battery and charge circuit", qty: 1, unitUsd: 30 },
      { item: "Antennas, IP67 enclosures, cable gland", qty: 1, unitUsd: 35 },
    ],
    software: ["PlatformIO", "KiCad", "MATLAB or Python (analysis)"],
    outcomes: [
      "Design a radio link with a defensible link budget instead of hoping for range",
      "Condition a 4–20 mA industrial sensor into a microcontroller ADC",
      "Build a system with a power budget that survives a week of cloud",
    ],
    prerequisites: [
      "Embedded systems and communication principles",
      "Analogue signal conditioning",
      "Access to a site where you can actually test range",
    ],
    challenges: [
      "Range claims on datasheets assume line of sight; your report needs measured results across real terrain",
      "Regulatory duty-cycle limits on ISM bands constrain how often you may transmit",
    ],
    sources: ["platformio", "kicad", "espIdf", "scholar", "hackster"],
    tags: ["lora", "telemetry", "water", "rural", "low-power", "wireless"],
    simulationOnly: false,
  },

  /* ── COMPUTER ────────────────────────────────────────────────────── */
  {
    slug: "raspberry-pi-network-monitor",
    title: "Network monitor on a single-board computer",
    discipline: "COMPUTER",
    tier: "BEGINNER",
    summary:
      "Watch who is on the campus network, how much bandwidth they use, and when it degrades — using a Raspberry Pi and standard Linux tooling.",
    weeks: 3,
    budgetUsd: { min: 45, max: 75 },
    bom: [
      { item: "Raspberry Pi (any model with Ethernet)", qty: 1, unitUsd: 40 },
      { item: "microSD card (32 GB)", qty: 1, unitUsd: 8 },
      { item: "Power supply and case", qty: 1, unitUsd: 12 },
    ],
    software: ["Linux shell", "Python", "Git"],
    outcomes: [
      "Work confidently on the Linux command line without a GUI",
      "Collect, store and visualise time-series data",
      "Explain what actually happens when a network 'feels slow'",
    ],
    prerequisites: ["Basic programming", "Willingness to work in a terminal"],
    challenges: [
      "Monitoring a network you do not own has ethical and policy limits — get permission first",
      "SD cards die under constant writes; plan your storage accordingly",
    ],
    sources: ["missingSemester", "github", "freeCodeCamp"],
    tags: ["linux", "networking", "raspberry-pi", "monitoring", "python"],
    simulationOnly: false,
  },
  {
    slug: "rfid-attendance-system",
    title: "RFID attendance system with database",
    discipline: "COMPUTER",
    tier: "INTERMEDIATE",
    summary:
      "Card-tap attendance with a real database behind it, handling the cases that break naive versions: duplicate taps, offline periods and disputed records.",
    weeks: 6,
    budgetUsd: { min: 35, max: 60 },
    bom: [
      { item: "RC522 RFID reader module", qty: 1, unitUsd: 5 },
      { item: "RFID cards/tags", qty: 20, unitUsd: 1 },
      { item: "ESP32 board", qty: 1, unitUsd: 8 },
      { item: "OLED display and buzzer", qty: 1, unitUsd: 7 },
    ],
    software: ["PlatformIO", "PostgreSQL or SQLite", "Python or Node.js"],
    outcomes: [
      "Design a schema where an attendance record cannot be silently overwritten",
      "Handle offline capture and later synchronisation without duplicates",
      "Build an interface a lecturer can use without training",
    ],
    prerequisites: [
      "SQL basics",
      "One backend language",
      "A previous microcontroller project",
    ],
    challenges: [
      "The hard part is not reading cards — it is what happens when the same card taps twice, or the network drops mid-session",
      "Attendance data is personal data; decide who may see it before you build the UI",
    ],
    sources: ["platformio", "randomNerd", "github", "freeCodeCamp"],
    tags: ["rfid", "database", "attendance", "esp32", "backend"],
    simulationOnly: false,
  },
  {
    slug: "edge-ml-crop-disease",
    title: "Offline crop disease detection on a low-power device",
    discipline: "COMPUTER",
    tier: "ADVANCED",
    summary:
      "Train an image classifier for maize leaf disease, shrink it, and run it on-device so a farmer with no data connection still gets an answer.",
    weeks: 12,
    budgetUsd: { min: 60, max: 110 },
    bom: [
      { item: "Raspberry Pi 4 or ESP32-CAM", qty: 1, unitUsd: 45 },
      { item: "Camera module", qty: 1, unitUsd: 15 },
      { item: "Power bank and enclosure", qty: 1, unitUsd: 20 },
    ],
    software: ["Python", "TensorFlow Lite or ONNX Runtime", "Git"],
    outcomes: [
      "Train, evaluate and honestly report a classifier — including where it fails",
      "Quantise a model and measure the accuracy you traded for speed",
      "Deploy inference that runs with no internet connection",
    ],
    prerequisites: [
      "Python and basic machine learning",
      "Understanding of overfitting and validation splits",
    ],
    challenges: [
      "Public leaf datasets are photographed in labs; performance on real field photos will be much worse, and saying so is what makes the work credible",
      "Accuracy on an imbalanced dataset is a misleading metric — use per-class recall",
    ],
    sources: ["github", "scholar", "mitOcw", "freeCodeCamp"],
    tags: ["machine-learning", "edge", "agriculture", "python", "computer-vision"],
    simulationOnly: false,
  },
  {
    slug: "autonomous-navigation-ros",
    title: "Autonomous ground robot with ROS 2",
    discipline: "COMPUTER",
    tier: "FINAL_YEAR",
    summary:
      "A differential-drive robot that maps a room and navigates it without collisions — developed in simulation first, then transferred to hardware.",
    weeks: 24,
    budgetUsd: { min: 150, max: 280 },
    bom: [
      { item: "Raspberry Pi 4 (4 GB)", qty: 1, unitUsd: 55 },
      { item: "2D LiDAR module", qty: 1, unitUsd: 90 },
      { item: "Motors, encoders and driver", qty: 1, unitUsd: 40 },
      { item: "Chassis, wheels, battery pack", qty: 1, unitUsd: 45 },
    ],
    software: ["ROS 2", "Gazebo", "Python/C++", "Git"],
    outcomes: [
      "Build a ROS 2 system of nodes, topics and transforms that others could extend",
      "Run SLAM and explain the difference between mapping and localisation",
      "Quantify the gap between simulation and reality instead of ignoring it",
    ],
    prerequisites: [
      "Strong Python or C++",
      "Linear algebra and coordinate transforms",
      "Prior Linux experience — ROS assumes it",
    ],
    challenges: [
      "Almost everything works in Gazebo and then fails on carpet; budget weeks for the transfer",
      "Odometry drift compounds; without a correction step your map will curve",
    ],
    sources: ["rosDocs", "github", "scholar", "mitOcw"],
    tags: ["robotics", "ros", "slam", "navigation", "simulation"],
    simulationOnly: false,
  },

  /* ── SOFTWARE ────────────────────────────────────────────────────── */
  {
    slug: "cli-tool-with-tests",
    title: "Command-line tool with tests and CI",
    discipline: "SOFTWARE",
    tier: "BEGINNER",
    summary:
      "A small tool that solves one real annoyance, with tests and automated checks on every push. The habits here matter more than the tool.",
    weeks: 2,
    budgetUsd: { min: 0, max: 0 },
    bom: [],
    software: ["Git", "Python or Node.js", "GitHub Actions"],
    outcomes: [
      "Use git properly: branches, meaningful commits, pull requests",
      "Write tests that would actually catch a regression",
      "Set up continuous integration so broken code cannot merge",
    ],
    prerequisites: ["Any programming experience"],
    challenges: [
      "Writing the tool takes a day; making it survive bad input takes the rest",
      "A test that only passes on your machine is worse than no test",
    ],
    sources: ["missingSemester", "github", "freeCodeCamp"],
    tags: ["git", "testing", "ci", "cli", "tooling"],
    simulationOnly: true,
  },
  {
    slug: "rest-api-with-auth",
    title: "REST API with authentication and a real database",
    discipline: "SOFTWARE",
    tier: "INTERMEDIATE",
    summary:
      "A backend with users, sessions, permissions and a relational schema — built so that a wrong request is rejected by the server, not hidden by the UI.",
    weeks: 6,
    budgetUsd: { min: 0, max: 0 },
    bom: [],
    software: ["Node.js or Python", "PostgreSQL", "Git", "Docker (optional)"],
    outcomes: [
      "Model data relationally with sensible constraints and indexes",
      "Hash passwords correctly and manage sessions without hand-rolling crypto",
      "Enforce authorisation on the server, where it cannot be bypassed",
    ],
    prerequisites: ["Programming fundamentals", "Basic SQL"],
    challenges: [
      "Hiding a button is not access control; every endpoint needs its own check",
      "Storing passwords reversibly is a security failure, not a shortcut",
    ],
    sources: ["mdn", "freeCodeCamp", "github", "missingSemester"],
    tags: ["backend", "api", "database", "auth", "security"],
    simulationOnly: true,
  },
  {
    slug: "offline-first-pwa",
    title: "Offline-first progressive web app",
    discipline: "SOFTWARE",
    tier: "ADVANCED",
    summary:
      "An app that keeps working when the connection drops and reconciles cleanly when it returns — the correct architecture for expensive, intermittent mobile data.",
    weeks: 10,
    budgetUsd: { min: 0, max: 0 },
    bom: [],
    software: ["JavaScript/TypeScript", "Service Workers", "IndexedDB", "Git"],
    outcomes: [
      "Cache deliberately with a service worker instead of hoping the browser helps",
      "Queue writes offline and resolve conflicts on reconnection",
      "Measure and reduce the bytes a first visit actually costs a user",
    ],
    prerequisites: [
      "Solid JavaScript",
      "Experience with at least one web framework",
    ],
    challenges: [
      "Conflict resolution is a product decision before it is a technical one — decide who wins, and why",
      "A stale cache that never updates is a worse bug than being offline",
    ],
    sources: ["mdn", "github", "freeCodeCamp"],
    tags: ["web", "offline", "pwa", "javascript", "performance"],
    simulationOnly: true,
  },
  {
    slug: "full-stack-capstone",
    title: "Full-stack system with deployment and monitoring",
    discipline: "SOFTWARE",
    tier: "FINAL_YEAR",
    summary:
      "A complete system with real users, automated tests, continuous deployment and monitoring — assessed on operation, not just on features.",
    weeks: 24,
    budgetUsd: { min: 0, max: 25 },
    bom: [
      { item: "Domain name (optional)", qty: 1, unitUsd: 12 },
      { item: "Hosting beyond free tiers (optional)", qty: 1, unitUsd: 10 },
    ],
    software: ["TypeScript", "PostgreSQL", "Docker", "GitHub Actions"],
    outcomes: [
      "Ship to production repeatedly without breaking existing users",
      "Instrument a system so you learn about failures before your users report them",
      "Write technical documentation another developer could actually follow",
    ],
    prerequisites: [
      "Prior API and frontend experience",
      "Comfortable with git in a team",
    ],
    challenges: [
      "Deployment and migrations are where final-year projects fail, not features",
      "Real users find the edge cases your tests did not; leave time to respond",
    ],
    sources: ["github", "mdn", "missingSemester", "overleaf"],
    tags: ["full-stack", "devops", "deployment", "testing", "capstone"],
    simulationOnly: true,
  },

  /* ── MECHANICAL ──────────────────────────────────────────────────── */
  {
    slug: "parametric-cad-mechanism",
    title: "Parametric CAD mechanism",
    discipline: "MECHANICAL",
    tier: "BEGINNER",
    summary:
      "Model a working mechanism — a gearbox, linkage or clamp — parametrically, so changing one dimension updates the whole assembly correctly.",
    weeks: 3,
    budgetUsd: { min: 0, max: 20 },
    bom: [
      { item: "3D printing (optional, if available)", qty: 1, unitUsd: 15 },
    ],
    software: ["FreeCAD or Fusion 360"],
    outcomes: [
      "Build a model driven by constraints rather than fixed numbers",
      "Produce assemblies whose parts move without interfering",
      "Generate a dimensioned drawing someone could manufacture from",
    ],
    prerequisites: ["Engineering drawing fundamentals"],
    challenges: [
      "Over-constrained sketches are the usual beginner wall; learn to read the solver's complaint",
      "A model that looks right but cannot be dimensioned is not finished",
    ],
    sources: ["freecad", "fusionLearn", "grabcad"],
    tags: ["cad", "design", "drawing", "mechanism", "3d"],
    simulationOnly: true,
  },
  {
    slug: "solar-water-heater",
    title: "Solar water heater with thermal analysis",
    discipline: "MECHANICAL",
    tier: "INTERMEDIATE",
    summary:
      "Build a thermosiphon collector, then predict its output and compare against measurement — heat transfer you can feel.",
    weeks: 6,
    budgetUsd: { min: 70, max: 130 },
    bom: [
      { item: "Copper pipe and fittings", qty: 1, unitUsd: 45 },
      { item: "Insulated tank or repurposed geyser", qty: 1, unitUsd: 35 },
      { item: "Glazing and insulation material", qty: 1, unitUsd: 25 },
      { item: "Thermocouples and datalogger", qty: 1, unitUsd: 20 },
    ],
    software: ["Spreadsheet", "MATLAB (optional)"],
    outcomes: [
      "Apply conduction, convection and radiation to a system you built",
      "Predict performance, measure it, and account for the difference",
      "Calculate a realistic payback period in local currency",
    ],
    prerequisites: ["Thermodynamics", "Heat transfer fundamentals"],
    challenges: [
      "Your model will over-predict output; identifying which loss you underestimated is the assessment",
      "Thermosiphon flow depends on tank height above the collector — get this wrong and nothing circulates",
    ],
    sources: ["engineeringToolbox", "matlabOnramp", "mitOcw"],
    tags: ["thermal", "solar", "heat-transfer", "energy", "sustainability"],
    simulationOnly: false,
  },
  {
    slug: "small-wind-turbine-blade",
    title: "Small wind turbine blade design and test",
    discipline: "MECHANICAL",
    tier: "ADVANCED",
    summary:
      "Design a blade from aerofoil theory, manufacture it, and measure the power curve against your prediction.",
    weeks: 12,
    budgetUsd: { min: 80, max: 150 },
    bom: [
      { item: "Blade material (timber or composite)", qty: 1, unitUsd: 35 },
      { item: "Permanent magnet alternator or DC motor", qty: 1, unitUsd: 40 },
      { item: "Hub, tower mount and bearings", qty: 1, unitUsd: 35 },
      { item: "Anemometer and measurement gear", qty: 1, unitUsd: 30 },
    ],
    software: ["FreeCAD or Fusion 360", "MATLAB or Python", "QBlade (optional)"],
    outcomes: [
      "Apply blade element momentum theory to produce a real geometry",
      "Manufacture a twisted, tapered blade within tolerance",
      "Measure a power curve and compare it honestly to the Betz limit",
    ],
    prerequisites: ["Fluid mechanics", "Aerodynamics basics", "Workshop access"],
    challenges: [
      "Twist and taper are what make it work and what make it hard to manufacture",
      "Wind data varies enormously by site; a week of measurement is not a resource assessment",
    ],
    sources: ["engineeringToolbox", "matlabOnramp", "scholar", "freecad"],
    tags: ["aerodynamics", "wind", "energy", "cad", "manufacturing"],
    simulationOnly: false,
  },
  {
    slug: "maize-sheller-design",
    title: "Motorised maize sheller for smallholder farms",
    discipline: "MECHANICAL",
    tier: "FINAL_YEAR",
    summary:
      "Design, build and test a sheller sized for smallholder output, evaluated on throughput, grain damage and cost — a machine with an actual market in Zimbabwe.",
    weeks: 24,
    budgetUsd: { min: 180, max: 350 },
    bom: [
      { item: "Steel sheet, angle and shafting", qty: 1, unitUsd: 90 },
      { item: "Electric motor or small petrol engine", qty: 1, unitUsd: 110 },
      { item: "Bearings, pulleys and belts", qty: 1, unitUsd: 45 },
      { item: "Fasteners, paint, consumables", qty: 1, unitUsd: 35 },
      { item: "Welding and machining services", qty: 1, unitUsd: 50 },
    ],
    software: ["FreeCAD or SolidWorks", "Spreadsheet"],
    outcomes: [
      "Take a machine from requirements through design to a working prototype",
      "Size shafts, bearings and drives against calculated loads",
      "Test to a protocol and report throughput, losses and damage rates",
    ],
    prerequisites: [
      "Machine design",
      "Materials and manufacturing processes",
      "Workshop and welding access",
    ],
    challenges: [
      "Grain damage rises with throughput; the design is a trade-off, not an optimum",
      "Rotating machinery needs guarding — safety analysis belongs in the report",
    ],
    sources: ["freecad", "grabcad", "engineeringToolbox", "scholar"],
    tags: ["machine-design", "agriculture", "manufacturing", "cad", "capstone"],
    simulationOnly: false,
  },

  /* ── CIVIL ───────────────────────────────────────────────────────── */
  {
    slug: "concrete-mix-design",
    title: "Concrete mix design and cube testing",
    discipline: "CIVIL",
    tier: "BEGINNER",
    summary:
      "Design a mix for a target strength, cast cubes, cure them and crush them — then explain the gap between your design and your results.",
    weeks: 4,
    budgetUsd: { min: 25, max: 50 },
    bom: [
      { item: "Cement, sand and aggregate", qty: 1, unitUsd: 25 },
      { item: "Cube moulds (or hire from lab)", qty: 1, unitUsd: 15 },
    ],
    software: ["Spreadsheet"],
    outcomes: [
      "Produce a mix design to a target characteristic strength",
      "Run slump and compressive strength tests to standard",
      "Explain how water-cement ratio governs strength and workability",
    ],
    prerequisites: ["Materials fundamentals", "Lab access with a crushing machine"],
    challenges: [
      "Curing conditions change results more than most students expect",
      "Aggregate moisture content shifts your effective water-cement ratio if you ignore it",
    ],
    sources: ["engineeringToolbox", "mitOcw"],
    tags: ["concrete", "materials", "testing", "lab", "structures"],
    simulationOnly: false,
  },
  {
    slug: "rainwater-harvesting-design",
    title: "Rainwater harvesting system design",
    discipline: "CIVIL",
    tier: "INTERMEDIATE",
    summary:
      "Size a catchment, storage and treatment system for a real building from actual rainfall records, with a defensible reliability figure.",
    weeks: 5,
    budgetUsd: { min: 0, max: 30 },
    bom: [
      { item: "Site survey consumables (optional)", qty: 1, unitUsd: 20 },
    ],
    software: ["Spreadsheet", "AutoCAD or FreeCAD"],
    outcomes: [
      "Convert rainfall records into a storage requirement with a stated reliability",
      "Design first-flush diversion and basic treatment appropriate to end use",
      "Produce drawings and a costing someone could build from",
    ],
    prerequisites: ["Fluid mechanics", "Basic hydrology"],
    challenges: [
      "Sizing on average annual rainfall hides the dry season — model it monthly",
      "Roof material determines whether the water is usable; state your end use first",
    ],
    sources: ["engineeringToolbox", "scholar", "freecad"],
    tags: ["water", "hydrology", "sustainability", "design", "drawing"],
    simulationOnly: true,
  },
  {
    slug: "rc-beam-design-and-check",
    title: "Reinforced concrete beam design and verification",
    discipline: "CIVIL",
    tier: "ADVANCED",
    summary:
      "Design a beam by hand to code, then verify it with analysis software and reconcile any disagreement between the two.",
    weeks: 8,
    budgetUsd: { min: 0, max: 0 },
    bom: [],
    software: ["Spreadsheet", "Structural analysis software", "AutoCAD"],
    outcomes: [
      "Design flexural and shear reinforcement to a design code",
      "Check serviceability — deflection and cracking — not just strength",
      "Detail reinforcement so it can actually be fixed on site",
    ],
    prerequisites: [
      "Structural analysis",
      "Reinforced concrete design course",
    ],
    challenges: [
      "Software output is only as good as your restraints and load cases; the reconciliation is the learning",
      "Detailing is where designs fail in practice — bar spacing and cover are not afterthoughts",
    ],
    sources: ["mitOcw", "engineeringToolbox", "scholar"],
    tags: ["structures", "concrete", "design", "analysis", "codes"],
    simulationOnly: true,
  },
  {
    slug: "low-cost-housing-design",
    title: "Low-cost housing structural and services design",
    discipline: "CIVIL",
    tier: "FINAL_YEAR",
    summary:
      "A complete design for affordable housing — structure, water, sanitation and cost — assessed against local codes and a real budget ceiling.",
    weeks: 24,
    budgetUsd: { min: 0, max: 40 },
    bom: [
      { item: "Printing and site visit costs", qty: 1, unitUsd: 30 },
    ],
    software: ["AutoCAD or FreeCAD", "Structural analysis software", "Spreadsheet"],
    outcomes: [
      "Produce a coordinated set of structural and services drawings",
      "Prepare a bill of quantities and defend the cost against a target",
      "Justify material choices on locally available supply, not textbook defaults",
    ],
    prerequisites: [
      "Structural design",
      "Water and sanitation engineering",
      "Quantity surveying basics",
    ],
    challenges: [
      "Cost targets force real trade-offs; the report is judged on how you resolved them",
      "Imported materials may be unavailable — designing around local supply is part of the problem",
    ],
    sources: ["engineeringToolbox", "scholar", "overleaf", "mitOcw"],
    tags: ["structures", "housing", "costing", "drawing", "capstone"],
    simulationOnly: true,
  },

  /* ── CHEMICAL ────────────────────────────────────────────────────── */
  {
    slug: "water-quality-testing",
    title: "Water quality testing and treatment assessment",
    discipline: "CHEMICAL",
    tier: "BEGINNER",
    summary:
      "Sample local water sources, test the standard parameters, and assess them against drinking water guidelines.",
    weeks: 4,
    budgetUsd: { min: 30, max: 60 },
    bom: [
      { item: "Test kits (pH, hardness, chlorine, nitrate)", qty: 1, unitUsd: 35 },
      { item: "Sample bottles and consumables", qty: 1, unitUsd: 15 },
    ],
    software: ["Spreadsheet"],
    outcomes: [
      "Sample and preserve correctly so results mean something",
      "Interpret results against WHO or national guideline values",
      "Recommend treatment matched to the contamination you found",
    ],
    prerequisites: ["General chemistry", "Lab safety induction"],
    challenges: [
      "Bad sampling technique invalidates good analysis; document your method",
      "One sample is a snapshot, not a characterisation — sample over time",
    ],
    sources: ["engineeringToolbox", "scholar", "khanAcademy"],
    tags: ["water", "analysis", "lab", "quality", "public-health"],
    simulationOnly: false,
  },
  {
    slug: "biogas-digester",
    title: "Small-scale biogas digester",
    discipline: "CHEMICAL",
    tier: "INTERMEDIATE",
    summary:
      "Build a digester from organic waste, measure gas yield against retention time, and evaluate it as a cooking fuel substitute.",
    weeks: 8,
    budgetUsd: { min: 60, max: 120 },
    bom: [
      { item: "Digester vessel (drum or tank)", qty: 1, unitUsd: 45 },
      { item: "Gas collection and piping", qty: 1, unitUsd: 30 },
      { item: "pH and temperature instrumentation", qty: 1, unitUsd: 25 },
      { item: "Fittings, valves, sealant", qty: 1, unitUsd: 20 },
    ],
    software: ["Spreadsheet"],
    outcomes: [
      "Relate feedstock, retention time and temperature to measured gas yield",
      "Monitor and correct pH to keep digestion stable",
      "Assess energy output against household cooking demand",
    ],
    prerequisites: ["Chemical reaction fundamentals", "Basic microbiology helpful"],
    challenges: [
      "Digesters take weeks to stabilise; start early or you will have no data",
      "Biogas is flammable and can contain hydrogen sulphide — ventilation and gas safety are mandatory",
    ],
    sources: ["scholar", "engineeringToolbox", "mitOcw"],
    tags: ["biogas", "energy", "waste", "bioprocess", "sustainability"],
    simulationOnly: false,
  },
  {
    slug: "distillation-column-simulation",
    title: "Distillation column design and simulation",
    discipline: "CHEMICAL",
    tier: "ADVANCED",
    summary:
      "Design a separation column by hand using McCabe-Thiele, then simulate it and explain where the shortcut method breaks down.",
    weeks: 10,
    budgetUsd: { min: 0, max: 0 },
    bom: [],
    software: ["DWSIM or Aspen (if licensed)", "MATLAB or Python", "Spreadsheet"],
    outcomes: [
      "Determine stages and reflux ratio from vapour-liquid equilibrium data",
      "Build and converge a rigorous column simulation",
      "Explain the assumptions McCabe-Thiele makes and when they fail",
    ],
    prerequisites: [
      "Mass transfer",
      "Thermodynamics including phase equilibria",
    ],
    challenges: [
      "Convergence failures usually mean an infeasible specification, not a software bug",
      "Constant molar overflow is an assumption; show what changes when you drop it",
    ],
    sources: ["matlabOnramp", "mitOcw", "scholar", "engineeringToolbox"],
    tags: ["separation", "simulation", "thermodynamics", "process", "design"],
    simulationOnly: true,
  },
  {
    slug: "ethanol-from-agricultural-waste",
    title: "Ethanol production from agricultural waste",
    discipline: "CHEMICAL",
    tier: "FINAL_YEAR",
    summary:
      "Take a local waste stream through pretreatment, fermentation and distillation, then assess yield and economics at pilot scale.",
    weeks: 24,
    budgetUsd: { min: 120, max: 250 },
    bom: [
      { item: "Fermentation vessels and airlocks", qty: 1, unitUsd: 60 },
      { item: "Enzymes and yeast cultures", qty: 1, unitUsd: 55 },
      { item: "Distillation glassware or still", qty: 1, unitUsd: 80 },
      { item: "Analytical consumables", qty: 1, unitUsd: 45 },
    ],
    software: ["Spreadsheet", "DWSIM (process modelling)"],
    outcomes: [
      "Run a full bioprocess and quantify yield at each stage",
      "Identify the rate-limiting step with evidence rather than assumption",
      "Produce a mass and energy balance that supports an economic case",
    ],
    prerequisites: [
      "Bioprocess or reaction engineering",
      "Analytical chemistry",
      "Lab access with supervision",
    ],
    challenges: [
      "Pretreatment usually dominates cost and is where most projects under-deliver",
      "Producing ethanol may be legally restricted — confirm your institution's permissions before starting",
    ],
    sources: ["scholar", "mitOcw", "engineeringToolbox", "overleaf"],
    tags: ["bioprocess", "fermentation", "energy", "waste", "capstone"],
    simulationOnly: false,
  },

  /* ── INDUSTRIAL ──────────────────────────────────────────────────── */
  {
    slug: "time-and-motion-study",
    title: "Time and motion study of a real process",
    discipline: "INDUSTRIAL",
    tier: "BEGINNER",
    summary:
      "Measure a real workplace process — campus canteen, print shop, workshop — and propose changes justified by your own data.",
    weeks: 3,
    budgetUsd: { min: 0, max: 10 },
    bom: [{ item: "Stopwatch and notebook", qty: 1, unitUsd: 10 }],
    software: ["Spreadsheet"],
    outcomes: [
      "Break a process into elements and time it reliably",
      "Calculate standard time including allowances",
      "Propose an improvement supported by measurement, not opinion",
    ],
    prerequisites: ["Basic statistics"],
    challenges: [
      "People work differently when watched; account for it or your data is fiction",
      "Timing too few cycles gives a standard time with no confidence behind it",
    ],
    sources: ["mitOcw", "khanAcademy", "engineeringToolbox"],
    tags: ["work-study", "productivity", "measurement", "process", "statistics"],
    simulationOnly: false,
  },
  {
    slug: "facility-layout-optimisation",
    title: "Facility layout optimisation",
    discipline: "INDUSTRIAL",
    tier: "INTERMEDIATE",
    summary:
      "Re-plan a workshop or production floor to cut material travel, with before-and-after figures you can defend.",
    weeks: 5,
    budgetUsd: { min: 0, max: 0 },
    bom: [],
    software: ["Spreadsheet", "AutoCAD or FreeCAD", "Python (optional)"],
    outcomes: [
      "Build a from-to chart from observed material flow",
      "Generate and compare layout alternatives systematically",
      "Quantify the improvement in distance, time and cost",
    ],
    prerequisites: ["Operations management fundamentals"],
    challenges: [
      "Optimal on paper often ignores services, safety egress and how people actually move",
      "Relocation cost can exceed the saving; include it in the case",
    ],
    sources: ["mitOcw", "freecad", "scholar"],
    tags: ["layout", "optimisation", "operations", "logistics", "design"],
    simulationOnly: true,
  },
  {
    slug: "production-scheduling-lp",
    title: "Production scheduling with linear programming",
    discipline: "INDUSTRIAL",
    tier: "ADVANCED",
    summary:
      "Model a real scheduling problem as an optimisation, solve it, and compare the result against how the business currently decides.",
    weeks: 8,
    budgetUsd: { min: 0, max: 0 },
    bom: [],
    software: ["Python with PuLP or OR-Tools", "Spreadsheet solver"],
    outcomes: [
      "Formulate an objective and constraints that reflect the actual business",
      "Solve and interpret sensitivity — which constraint is really binding",
      "Present a recommendation a manager could act on",
    ],
    prerequisites: ["Operations research", "Programming basics"],
    challenges: [
      "Getting the model right matters far more than the solver; a wrong objective optimises the wrong thing",
      "Integer constraints make problems dramatically harder — know when you have crossed that line",
    ],
    sources: ["mitOcw", "github", "scholar", "khanAcademy"],
    tags: ["optimisation", "scheduling", "operations-research", "python", "modelling"],
    simulationOnly: true,
  },
  {
    slug: "lean-implementation-sme",
    title: "Lean implementation in a local SME",
    discipline: "INDUSTRIAL",
    tier: "FINAL_YEAR",
    summary:
      "Partner with a real small business, map the value stream, implement changes, and measure the outcome over a full semester.",
    weeks: 24,
    budgetUsd: { min: 0, max: 50 },
    bom: [
      { item: "Travel, printing, visual management materials", qty: 1, unitUsd: 45 },
    ],
    software: ["Spreadsheet", "Process mapping tool"],
    outcomes: [
      "Produce current and future state value stream maps from observation",
      "Implement change with people who did not ask for it, and get adoption",
      "Measure sustained improvement rather than a one-week effect",
    ],
    prerequisites: [
      "Operations management",
      "A committed business partner — secure this before proposing the topic",
    ],
    challenges: [
      "Resistance to change is the actual project; the tools are the easy part",
      "Improvements that vanish once you leave do not count — design for sustainment",
    ],
    sources: ["mitOcw", "scholar", "overleaf"],
    tags: ["lean", "process-improvement", "operations", "fieldwork", "capstone"],
    simulationOnly: false,
  },

  /* ── MINING ──────────────────────────────────────────────────────── */
  {
    slug: "rock-sample-characterisation",
    title: "Rock sample characterisation",
    discipline: "MINING",
    tier: "BEGINNER",
    summary:
      "Identify, describe and test rock samples for density, porosity and strength — the measurements every later mining calculation depends on.",
    weeks: 3,
    budgetUsd: { min: 15, max: 40 },
    bom: [
      { item: "Sample collection and preparation consumables", qty: 1, unitUsd: 25 },
    ],
    software: ["Spreadsheet"],
    outcomes: [
      "Describe rock systematically using standard terminology",
      "Measure bulk density and porosity correctly",
      "Relate measured properties to expected excavation behaviour",
    ],
    prerequisites: ["Geology fundamentals", "Lab access"],
    challenges: [
      "Sample preparation drives your scatter; poor prep looks like real variation",
      "One hand specimen does not represent a deposit",
    ],
    sources: ["scholar", "engineeringToolbox", "mitOcw"],
    tags: ["geology", "rock-mechanics", "lab", "characterisation", "testing"],
    simulationOnly: false,
  },
  {
    slug: "mine-ventilation-design",
    title: "Mine ventilation network design",
    discipline: "MINING",
    tier: "INTERMEDIATE",
    summary:
      "Calculate airflow requirements for an underground layout and design a network that delivers them — a legal safety requirement, not an optimisation.",
    weeks: 6,
    budgetUsd: { min: 0, max: 20 },
    bom: [
      { item: "Site visit and printing costs", qty: 1, unitUsd: 20 },
    ],
    software: ["Spreadsheet", "Ventilation network software (if available)"],
    outcomes: [
      "Determine airflow from personnel, equipment and gas dilution requirements",
      "Apply Atkinson's equation across a network and balance it",
      "Select fans against a calculated system characteristic",
    ],
    prerequisites: ["Fluid mechanics", "Mining methods"],
    challenges: [
      "Leakage through old workings can dominate; ignoring it makes the design worthless",
      "Ventilation is regulated — your design must meet statutory minimums, not just your calculation",
    ],
    sources: ["engineeringToolbox", "scholar", "mitOcw"],
    tags: ["ventilation", "underground", "safety", "fluids", "design"],
    simulationOnly: true,
  },
  {
    slug: "open-pit-slope-stability",
    title: "Open-pit slope stability analysis",
    discipline: "MINING",
    tier: "ADVANCED",
    summary:
      "Assess slope stability from structural and strength data, and recommend an angle that balances safety against the ore you leave behind.",
    weeks: 10,
    budgetUsd: { min: 0, max: 30 },
    bom: [
      { item: "Field data collection consumables", qty: 1, unitUsd: 25 },
    ],
    software: ["Spreadsheet", "Slope stability software", "Python (optional)"],
    outcomes: [
      "Analyse structural data stereographically to identify failure modes",
      "Compute factors of safety for the mechanisms that actually apply",
      "Justify a slope angle in both safety and economic terms",
    ],
    prerequisites: ["Rock mechanics", "Geotechnical engineering", "Structural geology"],
    challenges: [
      "Different failure modes need different analyses; picking the wrong one gives a confident wrong answer",
      "Groundwater is usually the controlling factor and the least well measured",
    ],
    sources: ["scholar", "engineeringToolbox", "mitOcw"],
    tags: ["geotechnical", "slope-stability", "rock-mechanics", "safety", "analysis"],
    simulationOnly: true,
  },
  {
    slug: "small-scale-gold-recovery",
    title: "Improving recovery in small-scale gold processing",
    discipline: "MINING",
    tier: "FINAL_YEAR",
    summary:
      "Study a small-scale operation, quantify where gold is being lost, and propose a mercury-free improvement — a live health and environmental problem in Zimbabwe.",
    weeks: 24,
    budgetUsd: { min: 100, max: 220 },
    bom: [
      { item: "Sampling and assay costs", qty: 1, unitUsd: 90 },
      { item: "Test equipment (sluice, shaking table hire)", qty: 1, unitUsd: 70 },
      { item: "Travel and fieldwork", qty: 1, unitUsd: 50 },
    ],
    software: ["Spreadsheet", "Statistical software"],
    outcomes: [
      "Build a metallurgical balance that locates losses quantitatively",
      "Evaluate gravity and non-mercury alternatives on evidence",
      "Present findings to operators in terms they can act on",
    ],
    prerequisites: [
      "Mineral processing",
      "Analytical methods",
      "Ethics clearance and site permission — arrange early",
    ],
    challenges: [
      "Sampling a heterogeneous feed is the hardest part; a bad sample invalidates every number after it",
      "Mercury exposure is a serious health hazard — your methodology must protect you and the operators",
    ],
    sources: ["scholar", "mitOcw", "overleaf", "engineeringToolbox"],
    tags: ["mineral-processing", "gold", "environment", "fieldwork", "capstone"],
    simulationOnly: false,
  },

  /* ── GENERAL ─────────────────────────────────────────────────────── */
  {
    slug: "technical-report-in-latex",
    title: "Technical report with proper citations",
    discipline: "GENERAL",
    tier: "BEGINNER",
    summary:
      "Produce a properly structured, correctly cited technical report — the deliverable every project is ultimately marked on.",
    weeks: 2,
    budgetUsd: { min: 0, max: 0 },
    bom: [],
    software: ["Overleaf (LaTeX)", "Reference manager"],
    outcomes: [
      "Structure a report so a marker can find what they are looking for",
      "Cite consistently and build a bibliography automatically",
      "Present figures and tables that are readable and referenced in the text",
    ],
    prerequisites: [],
    challenges: [
      "Citation formatting by hand always drifts; let the tool do it from the start",
      "A figure without a caption and an in-text reference is decoration, not evidence",
    ],
    sources: ["overleaf", "scholar"],
    tags: ["writing", "reports", "latex", "citations", "academic"],
    simulationOnly: true,
  },
  {
    slug: "literature-review",
    title: "Systematic literature review",
    discipline: "GENERAL",
    tier: "INTERMEDIATE",
    summary:
      "Survey what is already known on a topic with a documented, repeatable method — the work that makes a final-year proposal defensible.",
    weeks: 4,
    budgetUsd: { min: 0, max: 0 },
    bom: [],
    software: ["Google Scholar", "Reference manager", "Overleaf"],
    outcomes: [
      "Search systematically and record your method so it can be repeated",
      "Assess source quality rather than accepting whatever appears first",
      "Synthesise findings into an argument instead of summarising papers in turn",
    ],
    prerequisites: ["Report writing experience"],
    challenges: [
      "Paywalls are real; learn what your institution subscribes to and what open-access routes exist",
      "A review that lists papers one by one is a summary — synthesis means grouping by idea",
    ],
    sources: ["scholar", "overleaf", "mitOcw"],
    tags: ["research", "literature", "writing", "method", "academic"],
    simulationOnly: true,
  },
];
