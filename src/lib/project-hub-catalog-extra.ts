import type { HubProject } from "@/lib/project-hub";

/**
 * Additional project briefs, weighted to the departments that actually have
 * students in them.
 *
 * WHY THIS FILE EXISTS SEPARATELY
 * The original catalogue is balanced at four projects per discipline. That
 * reads as fair and behaves badly: Electronic Engineering holds 11 of the 41
 * students on this platform and Civil holds 7, so a project class of eleven
 * people picks from four ideas and collides on the first day. Chemical,
 * Mechanical and the rest are smaller but have the same problem in miniature.
 *
 * These entries are deliberately NOT spread evenly. Six went to Electronic,
 * four to Civil, three to Chemical, two each to the rest — matched to real
 * enrolment rather than to symmetry. Symmetry is what made the hub feel empty
 * to the people most likely to use it.
 *
 * Kept in its own file rather than appended to the original so that the two
 * intents stay legible: one is a balanced starter set, this one is a response
 * to measured demand. `HUB_PROJECTS` concatenates them.
 *
 * EVERY BUDGET IS A HARARE ESTIMATE in whole US dollars, and every source is
 * an existing key from `SOURCES` — no URL is written here from memory, for
 * the reason given at the top of `project-hub.ts`.
 */
export const HUB_PROJECTS_EXTRA: HubProject[] = [
  /* ── ELECTRONIC (largest department: 11 students) ────────────────── */
  {
    slug: "water-tank-level-gauge",
    title: "Water tank level gauge",
    discipline: "ELECTRONIC",
    tier: "BEGINNER",
    summary:
      "An ultrasonic sensor over a tank, a display at the door, and an alarm before it runs dry. Every household on borehole or delivered water guesses at this daily.",
    weeks: 3,
    budgetUsd: { min: 25, max: 45 },
    bom: [
      { item: "HC-SR04 ultrasonic sensor", qty: 1, unitUsd: 3 },
      { item: "Arduino Nano (or clone)", qty: 1, unitUsd: 6 },
      { item: "16x2 LCD with I2C backpack", qty: 1, unitUsd: 5 },
      { item: "Piezo buzzer", qty: 1, unitUsd: 1 },
      { item: "5 V supply and enclosure", qty: 1, unitUsd: 8 },
      { item: "Cable, sealed gland, mounting bracket", qty: 1, unitUsd: 6 },
    ],
    software: ["Arduino IDE", "Wokwi"],
    outcomes: [
      "Convert a time-of-flight reading into a depth, then into a useful percentage",
      "Handle a sensor that returns nonsense at the extremes instead of trusting every reading",
      "Mount electronics above water without condensation destroying them in a month",
    ],
    prerequisites: ["Basic Arduino sketches", "Reading a datasheet timing diagram"],
    challenges: [
      "Ultrasonic readings scatter badly off a rippling surface — the median of several readings is the honest fix, not a longer delay",
      "A tank is not a cylinder all the way down, so your percentage is wrong unless you measure the real geometry",
    ],
    sources: ["arduinoDocs", "wokwi", "randomNerd", "electronicsTutorials"],
    tags: ["sensors", "water", "ultrasonic", "arduino", "display"],
    simulationOnly: false,
  },
  {
    slug: "load-shedding-alert-unit",
    title: "Load-shedding alert and logger",
    discipline: "ELECTRONIC",
    tier: "BEGINNER",
    summary:
      "Detects when mains returns, announces it, and logs outage start and end times. Turns a daily frustration into a dataset you can analyse.",
    weeks: 3,
    budgetUsd: { min: 20, max: 40 },
    bom: [
      { item: "5 V phone charger used as mains-present sense", qty: 1, unitUsd: 3 },
      { item: "Optocoupler (PC817) and resistors", qty: 2, unitUsd: 1 },
      { item: "Arduino Nano", qty: 1, unitUsd: 6 },
      { item: "DS3231 real-time clock module", qty: 1, unitUsd: 4 },
      { item: "MicroSD card module and card", qty: 1, unitUsd: 6 },
      { item: "Buzzer, enclosure, terminal block", qty: 1, unitUsd: 8 },
    ],
    software: ["Arduino IDE", "Spreadsheet"],
    outcomes: [
      "Sense mains presence WITHOUT any galvanic connection to it",
      "Keep accurate time across power loss using a battery-backed clock",
      "Turn weeks of logged events into an outage-duration distribution",
    ],
    prerequisites: [
      "Ohm's law",
      "Basic Arduino sketches",
      "Mains wiring is done by a qualified person, not by you",
    ],
    challenges: [
      "The safe design never touches mains — you sense the OUTPUT of a sealed charger, and explaining why that is the right boundary is most of the report",
      "The device must log the instant power dies, which is the instant it also loses power; the clock module and a reservoir capacitor are the answer",
    ],
    sources: ["arduinoDocs", "allAboutCircuits", "electronicsTutorials", "randomNerd"],
    tags: ["mains", "logging", "rtc", "safety", "data"],
    simulationOnly: false,
  },
  {
    slug: "battery-capacity-tester",
    title: "Battery capacity tester",
    discipline: "ELECTRONIC",
    tier: "INTERMEDIATE",
    summary:
      "Discharges a cell at constant current while logging voltage, and reports true amp-hours. Half the second-hand batteries sold locally are nothing like their label.",
    weeks: 5,
    budgetUsd: { min: 35, max: 65 },
    bom: [
      { item: "IRLZ44N logic-level MOSFET", qty: 2, unitUsd: 2 },
      { item: "LM358 op-amp for the constant-current loop", qty: 1, unitUsd: 1 },
      { item: "Power resistors 5 W, assorted", qty: 4, unitUsd: 1 },
      { item: "INA219 current and voltage sensor", qty: 1, unitUsd: 5 },
      { item: "Arduino Nano and OLED display", qty: 1, unitUsd: 11 },
      { item: "Heatsink, fan, enclosure, terminals", qty: 1, unitUsd: 14 },
    ],
    software: ["Arduino IDE", "LTspice", "Spreadsheet"],
    outcomes: [
      "Build a closed-loop constant-current sink and explain why it holds current steady",
      "Integrate current over time to get amp-hours rather than approximating",
      "Dissipate real power safely, calculating the heatsink rather than hoping",
    ],
    prerequisites: [
      "Op-amp basics and feedback",
      "MOSFET operating regions",
      "Comfortable with a multimeter",
    ],
    challenges: [
      "The load gets genuinely hot — thermal design separates a working tester from a scorched breadboard",
      "Measuring cell voltage across the same wires carrying discharge current gives a wrong answer, which is what four-wire sensing exists for",
    ],
    sources: ["ltspice", "allAboutCircuits", "tiAppNotes", "arduinoDocs"],
    tags: ["battery", "power", "analog", "measurement", "mosfet"],
    simulationOnly: false,
  },
  {
    slug: "line-following-robot",
    title: "Line-following robot",
    discipline: "ELECTRONIC",
    tier: "BEGINNER",
    summary:
      "A two-motor chassis that tracks a taped line using reflectance sensors and a control loop. The cheapest honest introduction to feedback control.",
    weeks: 4,
    budgetUsd: { min: 30, max: 55 },
    bom: [
      { item: "2WD chassis with motors and wheels", qty: 1, unitUsd: 12 },
      { item: "L298N motor driver module", qty: 1, unitUsd: 4 },
      { item: "IR reflectance sensor array, 5 channel", qty: 1, unitUsd: 6 },
      { item: "Arduino Nano", qty: 1, unitUsd: 6 },
      { item: "18650 cells and holder", qty: 2, unitUsd: 8 },
      { item: "Wiring, switch, standoffs", qty: 1, unitUsd: 5 },
    ],
    software: ["Arduino IDE", "Tinkercad Circuits"],
    outcomes: [
      "Implement proportional then PD control and MEASURE the difference rather than asserting it",
      "Calibrate sensors to a surface instead of hard-coding thresholds that fail in another room",
      "Diagnose whether a failure is mechanical, electrical or in the control law",
    ],
    prerequisites: ["Basic Arduino sketches", "Simple algebra"],
    challenges: [
      "Pure proportional control oscillates; derivative helps and adds noise sensitivity, and quantifying that trade-off is the actual work",
      "Motors are never matched, so your straight line curves — correcting it in software is a legitimate engineering answer",
    ],
    sources: ["arduinoProjectHub", "tinkercadCircuits", "arduinoDocs", "khanAcademy"],
    tags: ["robotics", "control", "pid", "sensors", "motors"],
    simulationOnly: false,
  },
  {
    slug: "esp32-camera-gate-monitor",
    title: "ESP32 camera gate monitor",
    discipline: "ELECTRONIC",
    tier: "INTERMEDIATE",
    summary:
      "A camera at the gate that captures a still on motion and serves it over local wifi. All the awkward parts of embedded networking in one small box.",
    weeks: 5,
    budgetUsd: { min: 30, max: 60 },
    bom: [
      { item: "ESP32-CAM module with OV2640", qty: 1, unitUsd: 9 },
      { item: "FTDI USB-serial programmer", qty: 1, unitUsd: 5 },
      { item: "PIR motion sensor (HC-SR501)", qty: 1, unitUsd: 3 },
      { item: "MicroSD card", qty: 1, unitUsd: 5 },
      { item: "5 V 2 A supply, weatherproof box, gland", qty: 1, unitUsd: 14 },
    ],
    software: ["Arduino IDE or ESP-IDF", "PlatformIO"],
    outcomes: [
      "Bring up a camera peripheral from a datasheet rather than a copied sketch",
      "Serve images from a constrained device without exhausting its memory",
      "Explain the privacy implications of a camera on shared property, and design for them",
    ],
    prerequisites: ["C or C++ basics", "Some networking vocabulary", "Prior Arduino work"],
    challenges: [
      "The ESP32-CAM browns out on a weak supply and the symptom looks like a software bug — measure the rail before debugging code",
      "A recognisable image of a person is personal data; where it is stored and who can reach it belongs in the report, not as an afterthought",
    ],
    sources: ["espIdf", "randomNerd", "platformio", "adafruitLearn"],
    tags: ["esp32", "camera", "iot", "wifi", "privacy"],
    simulationOnly: false,
  },
  {
    slug: "class-d-audio-amplifier",
    title: "Class-D audio amplifier",
    discipline: "ELECTRONIC",
    tier: "ADVANCED",
    summary:
      "A switching audio amplifier built and measured properly: efficiency, distortion, and the output filter that makes it listenable.",
    weeks: 8,
    budgetUsd: { min: 45, max: 90 },
    bom: [
      { item: "TPA3116 class-D amplifier module or bare IC", qty: 1, unitUsd: 8 },
      { item: "Output filter inductors and film capacitors", qty: 1, unitUsd: 9 },
      { item: "Bulk and decoupling capacitors", qty: 1, unitUsd: 6 },
      { item: "Custom PCB, small run", qty: 1, unitUsd: 20 },
      { item: "Heatsink, connectors, enclosure", qty: 1, unitUsd: 16 },
      { item: "Test speaker or dummy load resistors", qty: 1, unitUsd: 10 },
    ],
    software: ["KiCad", "LTspice", "Audio analysis software"],
    outcomes: [
      "Design an output filter from the switching frequency and load, and show its effect on measurement",
      "Measure efficiency and distortion honestly, including the conditions each was measured under",
      "Lay out a switching PCB where loop area genuinely matters",
    ],
    prerequisites: ["Filter design", "PCB layout experience", "Access to an oscilloscope"],
    challenges: [
      "Ground layout dominates the result — the same schematic on two layouts measures differently, and that IS the finding worth reporting",
      "Measuring distortion needs care about what your instrument contributes; state the noise floor or the number is meaningless",
    ],
    sources: ["kicad", "ltspice", "tiAppNotes", "allAboutCircuits"],
    tags: ["audio", "power", "pcb", "switching", "measurement"],
    simulationOnly: false,
  },

  /* ── CIVIL (second largest: 7 students) ──────────────────────────── */
  {
    slug: "soil-bearing-capacity-field-test",
    title: "Soil bearing capacity field test",
    discipline: "CIVIL",
    tier: "BEGINNER",
    summary:
      "Determine allowable bearing pressure on a real site from hand-augered samples and standard classification, then state what you can safely found on it.",
    weeks: 4,
    budgetUsd: { min: 20, max: 60 },
    bom: [
      { item: "Hand auger hire", qty: 1, unitUsd: 15 },
      { item: "Sample bags, labels, tape", qty: 1, unitUsd: 6 },
      { item: "Atterberg limit consumables", qty: 1, unitUsd: 12 },
      { item: "Printing and survey stationery", qty: 1, unitUsd: 8 },
    ],
    software: ["Spreadsheet", "FreeCAD or AutoCAD for the borehole log"],
    outcomes: [
      "Classify a soil properly and justify the classification from your own data",
      "Derive an allowable bearing pressure with an explicit factor of safety",
      "Produce a borehole log a contractor could actually use",
    ],
    prerequisites: ["Soil mechanics fundamentals", "Lab safety induction"],
    challenges: [
      "One trial pit is not a site investigation; defending how many you need, and where, is the judgement being assessed",
      "Moisture content changes between sampling and testing unless you seal properly — a quiet source of wrong answers",
    ],
    sources: ["engineeringToolbox", "mitOcw", "scholar", "overleaf"],
    tags: ["geotechnical", "soil", "foundations", "site", "testing"],
    simulationOnly: false,
  },
  {
    slug: "septic-tank-and-soakaway-design",
    title: "Septic tank and soakaway design",
    discipline: "CIVIL",
    tier: "INTERMEDIATE",
    summary:
      "Size an on-site sanitation system for a household from first principles, including the percolation test that decides whether a soakaway works at all.",
    weeks: 5,
    budgetUsd: { min: 15, max: 45 },
    bom: [
      { item: "Percolation test consumables", qty: 1, unitUsd: 10 },
      { item: "Measuring tape, pegs, line", qty: 1, unitUsd: 8 },
      { item: "Drawing printing, A1", qty: 3, unitUsd: 4 },
      { item: "Sample containers", qty: 1, unitUsd: 6 },
    ],
    software: ["Spreadsheet", "FreeCAD or AutoCAD"],
    outcomes: [
      "Size a tank from occupancy and retention time rather than from a table you cannot justify",
      "Run and interpret a percolation test, including deciding that the site fails",
      "Set separation distances from a borehole and explain the public-health reason",
    ],
    prerequisites: ["Fluid mechanics basics", "Public health engineering introduction"],
    challenges: [
      "A soakaway sized on optimistic percolation floods in the wet season; the honest test is run on pre-wetted soil",
      "Distance to the nearest borehole is often the binding constraint, and 'this site is unsuitable' is a valid engineering conclusion",
    ],
    sources: ["engineeringToolbox", "mitOcw", "scholar", "freecad"],
    tags: ["sanitation", "water", "public-health", "design", "drawings"],
    simulationOnly: false,
  },
  {
    slug: "pavement-condition-survey",
    title: "Road pavement condition survey",
    discipline: "CIVIL",
    tier: "INTERMEDIATE",
    summary:
      "Survey a length of road to a standard distress index, then prioritise repairs against a fixed budget. The decision, not the survey, is the deliverable.",
    weeks: 5,
    budgetUsd: { min: 20, max: 45 },
    bom: [
      { item: "Measuring wheel hire", qty: 1, unitUsd: 12 },
      { item: "Straight edge and depth gauge", qty: 1, unitUsd: 10 },
      { item: "Safety vest and cones", qty: 1, unitUsd: 10 },
      { item: "Printing and forms", qty: 1, unitUsd: 5 },
    ],
    software: ["Spreadsheet", "QGIS or Google Earth"],
    outcomes: [
      "Apply a published distress index consistently across a real road",
      "Turn condition data into a ranked, costed maintenance programme",
      "Present a recommendation a council engineer could act on",
    ],
    prerequisites: ["Highway engineering basics", "Road safety awareness"],
    challenges: [
      "Two surveyors rate the same section differently; measuring and reporting your own repeatability is what makes the data defensible",
      "The cheapest intervention now is rarely the cheapest over ten years, and showing that trade-off is the report",
    ],
    sources: ["engineeringToolbox", "scholar", "mitOcw", "overleaf"],
    tags: ["highways", "survey", "maintenance", "asset-management", "budget"],
    simulationOnly: false,
  },
  {
    slug: "steel-roof-truss-design",
    title: "Steel roof truss design",
    discipline: "CIVIL",
    tier: "ADVANCED",
    summary:
      "Design and check a steel truss for a classroom-sized span under wind and dead load, with connection details drawn to fabrication standard.",
    weeks: 8,
    budgetUsd: { min: 10, max: 30 },
    bom: [{ item: "Drawing printing, A1 set", qty: 6, unitUsd: 4 }],
    software: ["Spreadsheet", "FreeCAD or AutoCAD", "Any frame analysis package"],
    outcomes: [
      "Combine load cases correctly and identify which one actually governs",
      "Check members for buckling, not only axial stress",
      "Detail a connection a fabricator can build without phoning you",
    ],
    prerequisites: [
      "Structural analysis of trusses",
      "Steel design fundamentals",
      "Access to the relevant design code",
    ],
    challenges: [
      "Wind uplift reverses member forces and turns a tie into a strut — missing that is the classic failure in this project",
      "The connection, not the member, usually governs; a careful member schedule with a hand-waved joint loses marks",
    ],
    sources: ["engineeringToolbox", "mitOcw", "scholar", "freecad"],
    tags: ["structures", "steel", "design", "wind", "connections"],
    simulationOnly: true,
  },

  /* ── CHEMICAL ────────────────────────────────────────────────────── */
  {
    slug: "jar-test-water-treatment",
    title: "Jar test for water treatment",
    discipline: "CHEMICAL",
    tier: "BEGINNER",
    summary:
      "Find the optimum coagulant dose for a real raw water by running a jar test series, and state the cost per cubic metre of treating it.",
    weeks: 4,
    budgetUsd: { min: 35, max: 75 },
    bom: [
      { item: "Aluminium sulphate (alum), laboratory grade", qty: 1, unitUsd: 12 },
      { item: "Beakers, 1 L", qty: 6, unitUsd: 3 },
      { item: "Turbidity standards or borrowed turbidimeter", qty: 1, unitUsd: 15 },
      { item: "pH strips or borrowed meter", qty: 1, unitUsd: 8 },
      { item: "Stirrer or improvised paddle rig", qty: 1, unitUsd: 10 },
    ],
    software: ["Spreadsheet"],
    outcomes: [
      "Determine an optimum dose from data rather than from a textbook figure",
      "Show how pH shifts with coagulant and why that moves the optimum",
      "Convert a laboratory dose into a plant chemical cost per cubic metre",
    ],
    prerequisites: ["Basic chemistry", "Laboratory safety induction"],
    challenges: [
      "Mixing intensity and time affect the result as much as dose; hold them constant or the series is not comparable",
      "Raw water changes between collection days — sample once for the whole series, or report the variation honestly",
    ],
    sources: ["engineeringToolbox", "mitOcw", "scholar", "khanAcademy"],
    tags: ["water", "treatment", "coagulation", "lab", "cost"],
    simulationOnly: false,
  },
  {
    slug: "soap-from-waste-cooking-oil",
    title: "Soap from waste cooking oil",
    discipline: "CHEMICAL",
    tier: "BEGINNER",
    summary:
      "Saponify collected waste oil into usable soap, with titration to set the correct lye ratio, and a yield and cost analysis at the end.",
    weeks: 4,
    budgetUsd: { min: 25, max: 55 },
    bom: [
      { item: "Sodium hydroxide, laboratory grade", qty: 1, unitUsd: 12 },
      { item: "Waste cooking oil, collected", qty: 1, unitUsd: 0 },
      { item: "Titration consumables", qty: 1, unitUsd: 15 },
      { item: "Moulds, thermometer, PPE", qty: 1, unitUsd: 18 },
    ],
    software: ["Spreadsheet"],
    outcomes: [
      "Titrate to determine free fatty acid content and adjust the lye charge accordingly",
      "Run a reaction with a genuine hazard under proper controls",
      "Report yield, quality and cost against a commercial equivalent",
    ],
    prerequisites: [
      "Organic chemistry basics",
      "Laboratory safety induction",
      "Supervised access to a well-ventilated bench",
    ],
    challenges: [
      "Waste oil varies batch to batch, so a fixed recipe gives inconsistent soap — the titration IS the project",
      "Excess lye makes a caustic product; testing the finished bar and reporting it is not optional",
    ],
    sources: ["khanAcademy", "mitOcw", "scholar", "engineeringToolbox"],
    tags: ["reaction", "waste", "titration", "yield", "safety"],
    simulationOnly: false,
  },
  {
    slug: "activated-carbon-from-maize-cobs",
    title: "Activated carbon from maize cobs",
    discipline: "CHEMICAL",
    tier: "INTERMEDIATE",
    summary:
      "Carbonise and activate an agricultural residue, then measure how much dye it actually adsorbs against a commercial product.",
    weeks: 7,
    budgetUsd: { min: 40, max: 90 },
    bom: [
      { item: "Maize cobs, collected", qty: 1, unitUsd: 0 },
      { item: "Activating agent (phosphoric acid or zinc chloride)", qty: 1, unitUsd: 20 },
      { item: "Crucibles and furnace access", qty: 1, unitUsd: 10 },
      { item: "Methylene blue and reagents", qty: 1, unitUsd: 18 },
      { item: "Commercial activated carbon for comparison", qty: 1, unitUsd: 15 },
      { item: "PPE and consumables", qty: 1, unitUsd: 12 },
    ],
    software: ["Spreadsheet", "Any curve-fitting tool"],
    outcomes: [
      "Produce a material and characterise it rather than assuming it worked",
      "Fit adsorption data to an isotherm and say what the fit does and does not prove",
      "Compare honestly against a commercial benchmark, including where yours is worse",
    ],
    prerequisites: [
      "Reaction engineering basics",
      "Laboratory safety induction",
      "Furnace access through your department",
    ],
    challenges: [
      "Activation temperature and time dominate the result; without controlling them the comparison means nothing",
      "A good isotherm fit is not proof of mechanism, and overclaiming there is the most common error in this project",
    ],
    sources: ["scholar", "mitOcw", "engineeringToolbox", "overleaf"],
    tags: ["adsorption", "materials", "waste", "characterisation", "isotherm"],
    simulationOnly: false,
  },

  /* ── ELECTRICAL ──────────────────────────────────────────────────── */
  {
    slug: "power-factor-correction-bank",
    title: "Power factor correction bank",
    discipline: "ELECTRICAL",
    tier: "INTERMEDIATE",
    summary:
      "Measure a workshop's real power factor, size a capacitor bank for it, and calculate what the correction saves on a commercial tariff.",
    weeks: 6,
    budgetUsd: { min: 60, max: 125 },
    bom: [
      { item: "Power quality clamp meter hire", qty: 1, unitUsd: 25 },
      { item: "Power factor correction capacitors", qty: 3, unitUsd: 15 },
      { item: "Contactor and protection", qty: 1, unitUsd: 20 },
      { item: "Enclosure, busbar, cable", qty: 1, unitUsd: 18 },
    ],
    software: ["Spreadsheet", "LTspice"],
    outcomes: [
      "Measure real, reactive and apparent power and keep the three distinct",
      "Size correction to a target power factor without overcorrecting into leading",
      "Turn an electrical improvement into a payback period in dollars",
    ],
    prerequisites: [
      "AC circuit theory",
      "Three-phase fundamentals",
      "Electrical safety training",
    ],
    challenges: [
      "Overcorrection is a real fault, not a harmless excess — a leading power factor can be penalised too",
      "Harmonics from variable-speed drives can resonate with your bank, and checking for that is what makes it a real design",
    ],
    sources: ["allAboutCircuits", "electronicsTutorials", "engineeringToolbox", "ltspice"],
    tags: ["power", "ac", "energy", "tariff", "capacitors"],
    simulationOnly: false,
  },
  {
    slug: "earthing-and-lightning-survey",
    title: "Earthing and lightning protection survey",
    discipline: "ELECTRICAL",
    tier: "INTERMEDIATE",
    summary:
      "Measure earth resistance at a real installation, assess lightning risk, and specify what it would take to bring it to standard.",
    weeks: 5,
    budgetUsd: { min: 25, max: 70 },
    bom: [
      { item: "Earth resistance tester hire", qty: 1, unitUsd: 30 },
      { item: "Test spikes and leads", qty: 1, unitUsd: 15 },
      { item: "Earth rod and clamp, sample", qty: 1, unitUsd: 12 },
      { item: "Printing and site stationery", qty: 1, unitUsd: 6 },
    ],
    software: ["Spreadsheet", "Any drawing package"],
    outcomes: [
      "Run a fall-of-potential test correctly and know when the result is invalid",
      "Assess lightning risk using a published method rather than intuition",
      "Write a remedial specification with quantities and cost",
    ],
    prerequisites: ["Electrical installation basics", "Site safety induction"],
    challenges: [
      "Soil resistivity swings between wet and dry season, so one measurement is a snapshot — say which season you measured in",
      "Zimbabwe has a high lightning ground-flash density; a risk assessment that ignores that reaches the wrong conclusion",
    ],
    sources: ["engineeringToolbox", "allAboutCircuits", "scholar", "mitOcw"],
    tags: ["earthing", "lightning", "safety", "survey", "standards"],
    simulationOnly: false,
  },

  /* ── MECHANICAL ──────────────────────────────────────────────────── */
  {
    slug: "pedal-powered-water-pump",
    title: "Pedal-powered water pump",
    discipline: "MECHANICAL",
    tier: "INTERMEDIATE",
    summary:
      "Adapt a bicycle drive to a pump and measure the head and flow a person can actually sustain, not the peak they manage for ten seconds.",
    weeks: 6,
    budgetUsd: { min: 50, max: 110 },
    bom: [
      { item: "Second-hand bicycle frame and drivetrain", qty: 1, unitUsd: 25 },
      { item: "Diaphragm or piston pump", qty: 1, unitUsd: 30 },
      { item: "Steel section for frame", qty: 1, unitUsd: 20 },
      { item: "Bearings, shaft, couplings", qty: 1, unitUsd: 18 },
      { item: "Pressure gauge and fittings", qty: 1, unitUsd: 12 },
    ],
    software: ["FreeCAD or Fusion", "Spreadsheet"],
    outcomes: [
      "Match a pump to a human power source using a realistic sustained output",
      "Measure a pump curve rather than quoting the manufacturer's",
      "Design a frame that survives repeated loading, not just one demonstration",
    ],
    prerequisites: ["Fluid mechanics", "Basic machine design", "Workshop induction"],
    challenges: [
      "Sustained human output is roughly 75 W, not the 300 W of a sprint — sizing to the wrong number makes the whole thing useless",
      "Welded bicycle steel is easy to get wrong, and joint design is where this project actually fails",
    ],
    sources: ["engineeringToolbox", "freecad", "grabcad", "mitOcw"],
    tags: ["pumps", "human-power", "water", "mechanism", "testing"],
    simulationOnly: false,
  },
  {
    slug: "heat-exchanger-performance-test",
    title: "Heat exchanger performance test",
    discipline: "MECHANICAL",
    tier: "INTERMEDIATE",
    summary:
      "Build or borrow a small concentric-tube exchanger and measure its effectiveness against theory, in both parallel and counter flow.",
    weeks: 6,
    budgetUsd: { min: 45, max: 100 },
    bom: [
      { item: "Copper tube and fittings", qty: 1, unitUsd: 30 },
      { item: "DS18B20 temperature sensors", qty: 4, unitUsd: 4 },
      { item: "Arduino Nano and logging", qty: 1, unitUsd: 10 },
      { item: "Small pump and reservoir", qty: 1, unitUsd: 22 },
      { item: "Insulation, clamps, stand", qty: 1, unitUsd: 15 },
    ],
    software: ["Arduino IDE", "Spreadsheet", "MATLAB Onramp or Python"],
    outcomes: [
      "Calculate effectiveness by the NTU method and compare it to what you measured",
      "Show why counter flow beats parallel flow using your own data",
      "Account for heat lost to the room instead of ignoring the discrepancy",
    ],
    prerequisites: ["Heat transfer fundamentals", "Basic instrumentation"],
    challenges: [
      "Your energy balance will not close, and finding where the missing watts go is the assessment rather than an embarrassment",
      "Sensor placement changes the answer — inserted into the flow, not taped to the outside of a tube",
    ],
    sources: ["engineeringToolbox", "mitOcw", "matlabOnramp", "arduinoDocs"],
    tags: ["heat-transfer", "thermofluids", "instrumentation", "testing", "ntu"],
    simulationOnly: false,
  },

  /* ── COMPUTER ────────────────────────────────────────────────────── */
  {
    slug: "usb-hid-macro-keypad",
    title: "Custom USB input device",
    discipline: "COMPUTER",
    tier: "INTERMEDIATE",
    summary:
      "Build a macro keypad the operating system recognises as a standard input device, with firmware written against the USB HID specification.",
    weeks: 6,
    budgetUsd: { min: 25, max: 55 },
    bom: [
      { item: "RP2040 or ATmega32U4 board", qty: 1, unitUsd: 8 },
      { item: "Mechanical key switches", qty: 9, unitUsd: 1 },
      { item: "Keycaps and diodes", qty: 1, unitUsd: 8 },
      { item: "Custom PCB or perfboard", qty: 1, unitUsd: 12 },
      { item: "Case material and fixings", qty: 1, unitUsd: 10 },
    ],
    software: ["PlatformIO", "KiCad", "Git"],
    outcomes: [
      "Implement a USB HID descriptor and understand what the host does with it",
      "Debounce in firmware and prove it with logged timings",
      "Ship firmware that survives being unplugged mid-write",
    ],
    prerequisites: ["C programming", "Basic digital electronics"],
    challenges: [
      "A malformed HID descriptor fails silently on one operating system and works on another, so reading the specification is unavoidable",
      "Matrix scanning without diodes gives ghost keypresses, and discovering that from behaviour is a genuine debugging exercise",
    ],
    sources: ["platformio", "kicad", "github", "mdn"],
    tags: ["usb", "firmware", "embedded", "pcb", "hid"],
    simulationOnly: false,
  },
  {
    slug: "can-bus-vehicle-logger",
    title: "CAN bus vehicle logger",
    discipline: "COMPUTER",
    tier: "ADVANCED",
    summary:
      "Read a vehicle's OBD-II port, decode the frames, and log a trip you can analyse afterwards. Real protocol work on hardware that does not forgive guessing.",
    weeks: 8,
    budgetUsd: { min: 40, max: 85 },
    bom: [
      { item: "MCP2515 CAN controller module", qty: 1, unitUsd: 7 },
      { item: "OBD-II connector and cable", qty: 1, unitUsd: 10 },
      { item: "Microcontroller board", qty: 1, unitUsd: 8 },
      { item: "MicroSD logging module", qty: 1, unitUsd: 6 },
      { item: "Enclosure and wiring", qty: 1, unitUsd: 12 },
    ],
    software: ["PlatformIO", "Python", "Git"],
    outcomes: [
      "Decode a real bus protocol from its specification and observed traffic",
      "Log at rate without dropping frames, and prove that you did not",
      "Analyse a trip and defend what the data does and does not show",
    ],
    prerequisites: [
      "C programming",
      "Serial protocol experience",
      "The vehicle owner's permission",
    ],
    challenges: [
      "Manufacturer-specific identifiers are undocumented, so establishing which frame is which is careful, honest reverse engineering",
      "Writing to a vehicle bus can affect the vehicle — this project reads only, and saying so explicitly belongs in your method",
    ],
    sources: ["platformio", "github", "scholar", "missingSemester"],
    tags: ["can", "obd", "protocol", "embedded", "logging"],
    simulationOnly: false,
  },

  /* ── SOFTWARE ────────────────────────────────────────────────────── */
  {
    slug: "timetable-conflict-solver",
    title: "Timetable conflict solver",
    discipline: "SOFTWARE",
    tier: "INTERMEDIATE",
    summary:
      "Take real course, room and lecturer constraints and produce a clash-free timetable, with an explanation of why a perfect one may not exist.",
    weeks: 7,
    budgetUsd: { min: 0, max: 0 },
    // No parts list, matching the convention for projects that cost nothing.
    bom: [],
    software: ["Python or TypeScript", "Git", "Any constraint solver library"],
    outcomes: [
      "Model a scheduling problem formally instead of coding heuristics by feel",
      "Distinguish hard constraints from soft preferences and weight them defensibly",
      "Report when the problem is infeasible and identify which constraint caused it",
    ],
    prerequisites: ["Programming in one language", "Basic algorithms"],
    challenges: [
      "Real constraints conflict, and the useful output is often 'this is impossible because of X' rather than a schedule",
      "Brute force works on toy inputs and dies on the real one; showing where the wall is beats pretending it is not there",
    ],
    sources: ["github", "mitOcw", "freeCodeCamp", "missingSemester"],
    tags: ["optimisation", "scheduling", "algorithms", "constraints", "python"],
    simulationOnly: true,
  },
  {
    slug: "barcode-inventory-system",
    title: "Barcode inventory system",
    discipline: "SOFTWARE",
    tier: "BEGINNER",
    summary:
      "A stock system a real storeroom could use: scan in, scan out, and a reconciliation report that finds what the paper ledger lost.",
    weeks: 5,
    budgetUsd: { min: 10, max: 40 },
    bom: [
      { item: "USB barcode scanner, or a phone camera", qty: 1, unitUsd: 25 },
      { item: "Label printing", qty: 1, unitUsd: 8 },
    ],
    software: ["Any web framework", "SQLite or PostgreSQL", "Git"],
    outcomes: [
      "Design a schema where stock movements are events, not an editable quantity",
      "Build an interface fast enough to use while holding a box",
      "Reconcile the system against a physical count and explain the differences",
    ],
    prerequisites: ["Basic programming", "Introductory databases"],
    challenges: [
      "Storing a running total instead of movements means you can never answer 'what happened' — an append-only ledger is the right shape",
      "A scanner is just a keyboard, and handling a scan that arrives faster than your form is a real problem to solve",
    ],
    sources: ["freeCodeCamp", "github", "mdn", "missingSemester"],
    tags: ["database", "inventory", "web", "barcode", "crud"],
    simulationOnly: true,
  },

  /* ── INDUSTRIAL ──────────────────────────────────────────────────── */
  {
    slug: "spc-control-charts",
    title: "Statistical process control for a small producer",
    discipline: "INDUSTRIAL",
    tier: "INTERMEDIATE",
    summary:
      "Measure a real production process, build control charts, and separate normal variation from problems worth chasing.",
    weeks: 6,
    budgetUsd: { min: 5, max: 30 },
    bom: [
      { item: "Callipers or gauge", qty: 1, unitUsd: 18 },
      { item: "Recording sheets and printing", qty: 1, unitUsd: 6 },
    ],
    software: ["Spreadsheet", "MATLAB Onramp or Python"],
    outcomes: [
      "Build X-bar and R charts from data you collected yourself",
      "Distinguish common-cause from special-cause variation and act differently on each",
      "Calculate process capability and say plainly whether the process can meet the specification",
    ],
    prerequisites: ["Basic statistics", "Access to a small producer or workshop"],
    challenges: [
      "Chasing every point that moves is the classic error, and the charts exist precisely to stop you doing it",
      "A capable process producing scrap is usually a specification problem rather than an operator problem, and saying so takes evidence",
    ],
    sources: ["engineeringToolbox", "matlabOnramp", "mitOcw", "scholar"],
    tags: ["quality", "statistics", "spc", "capability", "manufacturing"],
    simulationOnly: false,
  },
  {
    slug: "inventory-eoq-model",
    title: "Inventory policy for a small business",
    discipline: "INDUSTRIAL",
    tier: "BEGINNER",
    summary:
      "Build an order policy from real demand and lead-time data, then show what it saves against how the business currently orders.",
    weeks: 4,
    budgetUsd: { min: 0, max: 15 },
    bom: [{ item: "Printing and stationery", qty: 1, unitUsd: 8 }],
    software: ["Spreadsheet", "Python"],
    outcomes: [
      "Fit demand and lead-time distributions to real records",
      "Set reorder points and safety stock from a stated service level",
      "Quantify the saving in money, not as a percentage of an unstated base",
    ],
    prerequisites: ["Basic statistics", "A willing small business"],
    challenges: [
      "Real demand data is messy and incomplete, and cleaning it defensibly is most of the work",
      "EOQ assumes steady demand and instant replenishment — stating where those assumptions break for your case is the mark of a good report",
    ],
    sources: ["engineeringToolbox", "mitOcw", "scholar", "khanAcademy"],
    tags: ["inventory", "operations", "eoq", "forecasting", "cost"],
    simulationOnly: true,
  },

  /* ── MINING ──────────────────────────────────────────────────────── */
  {
    slug: "blast-fragmentation-analysis",
    title: "Blast fragmentation analysis",
    discipline: "MINING",
    tier: "INTERMEDIATE",
    summary:
      "Assess a muckpile from photographs, size the fragment distribution, and link it back to the blast design that produced it.",
    weeks: 6,
    budgetUsd: { min: 10, max: 40 },
    bom: [
      { item: "Scale objects for photographs", qty: 1, unitUsd: 8 },
      { item: "Site PPE", qty: 1, unitUsd: 25 },
      { item: "Printing", qty: 1, unitUsd: 5 },
    ],
    software: ["ImageJ or similar", "Spreadsheet", "Python"],
    outcomes: [
      "Produce a size distribution from image analysis and state its error honestly",
      "Relate fragmentation back to burden, spacing and powder factor",
      "Argue the downstream cost of poor fragmentation in crushing and haulage",
    ],
    prerequisites: [
      "Drilling and blasting fundamentals",
      "Site induction and supervised access",
    ],
    challenges: [
      "Photographic analysis systematically misses fines, and acknowledging that bias is worth more than a confident wrong curve",
      "You will not be allowed to change a real blast design, so the recommendation must be argued from data rather than tested",
    ],
    sources: ["scholar", "mitOcw", "engineeringToolbox", "overleaf"],
    tags: ["blasting", "fragmentation", "image-analysis", "mining", "cost"],
    simulationOnly: false,
  },
  {
    slug: "tailings-dam-monitoring",
    title: "Tailings storage monitoring plan",
    discipline: "MINING",
    tier: "ADVANCED",
    summary:
      "Design a monitoring regime for a tailings facility: what to measure, how often, and the trigger levels that would stop operations.",
    weeks: 8,
    budgetUsd: { min: 15, max: 50 },
    bom: [
      { item: "Site PPE", qty: 1, unitUsd: 25 },
      { item: "Survey and printing consumables", qty: 1, unitUsd: 15 },
    ],
    software: ["Spreadsheet", "QGIS", "Any slope stability package"],
    outcomes: [
      "Specify instrumentation against the failure modes it is meant to detect",
      "Set trigger action response levels that are defensible rather than arbitrary",
      "Write a plan that names who acts, not only what is measured",
    ],
    prerequisites: [
      "Soil mechanics",
      "Mine waste management fundamentals",
      "Supervised site access",
    ],
    challenges: [
      "Instruments nobody reads are worse than none because they create false confidence — the response plan is the deliverable",
      "Tailings failures are catastrophic and well documented, so a plan that ignores the published case histories will not convince anyone",
    ],
    sources: ["scholar", "mitOcw", "engineeringToolbox", "overleaf"],
    tags: ["tailings", "geotechnical", "monitoring", "risk", "environment"],
    simulationOnly: false,
  },
];
