/**
 * ============================================================================
 * BANTUG UNIVERSITY - Student Portal System
 * Centralized Data Management & Role-Permission Guard System (storage.js)
 *
 * Uses browser localStorage to persist and synchronize:
 * - Demo authentication session (Student, Faculty, Applicant)
 * - Official BSIT 2-2 subjects & actual Monday–Friday class timetable
 * - Faculty-managed grades & read-only student grade views
 * - Faculty-recorded attendance & read-only student attendance views
 * - Faculty-published assignments & student task submissions/completions
 * - Faculty-only announcements & student read/unread states
 * ============================================================================
 */

const StudentHubStorage = (function () {
  const STORAGE_KEY = "bantug_university_portal_v2";
  const SESSION_KEY = "bantug_university_session_v2";
  const SCHEMA_VERSION = 9; // Revision 8: Complete University Faculty Schedule Management System (All 15 Professors, 8 Sections, 14 Facilities)
  const LOGO_PATH = "assets/images/bantug-university-logo.png";

  const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
  const VALID_YEAR_LEVELS = ["Year 1", "Year 2", "Year 3", "Year 4"];
  const VALID_APPLICATION_STATUSES = ["Pending", "Under Review", "Approved", "Rejected"];
  const UNIVERSITY_SECTIONS = [
    "BSIT 1-1",
    "BSIT 1-2",
    "BSIT 2-1",
    "BSIT 2-2",
    "BSIT 3-1",
    "BSIT 3-2",
    "BSIT 4-1",
    "BSIT 4-2"
  ];

  const CAMPUS_ROOMS_AND_FACILITIES = [
    { code: "Room 1", legacyCode: "R1", name: "Room 1", category: "Regular Classroom" },
    { code: "Room 2", legacyCode: "R2", name: "Room 2", category: "Regular Classroom" },
    { code: "Room 3", legacyCode: "R3", name: "Room 3", category: "Regular Classroom" },
    { code: "Room 4", legacyCode: "R4", name: "Room 4", category: "Regular Classroom" },
    { code: "Room 5", legacyCode: "R5", name: "Room 5", category: "Regular Classroom" },
    { code: "Room 6", legacyCode: "R6", name: "Room 6", category: "Regular Classroom" },
    { code: "CL 1", legacyCode: "CL1", name: "CL 1", category: "Computer Laboratory" },
    { code: "CL 2", legacyCode: "CL2", name: "CL 2", category: "Computer Laboratory" },
    { code: "CL 3", legacyCode: "CL3", name: "CL 3", category: "Computer Laboratory" },
    { code: "IT Lab 1", legacyCode: "IT LAB 1", name: "IT Lab 1", category: "Computer Laboratory" },
    { code: "IT Lab 2", legacyCode: "IT LAB 2", name: "IT Lab 2", category: "Computer Laboratory" },
    { code: "Gym", legacyCode: "GYM", name: "Gym", category: "Physical Education Facility" },
    { code: "Open Gym", legacyCode: "OPEN GYM", name: "Open Gym", category: "Physical Education Facility" },
    {
      code: "Language or Audio-Visual Room (LAVR)",
      legacyCode: "LAVR",
      name: "Language or Audio-Visual Room (LAVR)",
      category: "Language & Audio-Visual Facility"
    }
  ];

  /**
   * Normalize room codes/aliases (e.g., "R5" -> "Room 5", "CL3" -> "CL 3", "IT LAB 1" -> "IT Lab 1")
   * so conflict detection and room filtering treat aliases as the exact same physical room.
   */
  function normalizeRoomName(rawRoom) {
    const str = String(rawRoom || "").trim();
    if (!str || str.toLowerCase() === "not specified" || str.toLowerCase() === "tba") {
      return "Not specified";
    }
    const upper = str.toUpperCase().replace(/\s+/g, " ");
    const aliasMap = {
      R1: "Room 1",
      "ROOM 1": "Room 1",
      R2: "Room 2",
      "ROOM 2": "Room 2",
      R3: "Room 3",
      "ROOM 3": "Room 3",
      R4: "Room 4",
      "ROOM 4": "Room 4",
      R5: "Room 5",
      "ROOM 5": "Room 5",
      R6: "Room 6",
      "ROOM 6": "Room 6",
      CL1: "CL 1",
      "CL 1": "CL 1",
      CL2: "CL 2",
      "CL 2": "CL 2",
      CL3: "CL 3",
      "CL 3": "CL 3",
      "IT LAB 1": "IT Lab 1",
      "ITLAB1": "IT Lab 1",
      "IT LAB 2": "IT Lab 2",
      "ITLAB2": "IT Lab 2",
      GYM: "Gym",
      "OPEN GYM": "Open Gym",
      LAVR: "Language or Audio-Visual Room (LAVR)",
      "LANGUAGE OR AUDIO-VISUAL ROOM (LAVR)": "Language or Audio-Visual Room (LAVR)",
      "LANGUAGE OR AUDIO-VISUAL ROOM": "Language or Audio-Visual Room (LAVR)"
    };
    return aliasMap[upper] || str;
  }

  /**
   * Determine visual class type ("Lecture" | "Laboratory" | "Physical Education")
   */
  function getClassTypeForSession(item = {}) {
    if (item.classType && ["Lecture", "Laboratory", "Physical Education"].includes(item.classType)) {
      return item.classType;
    }
    const code = String(item.courseCode || item.subjectCode || "").toUpperCase();
    const name = String(item.subjectName || item.displaySubject || "").toUpperCase();
    const normRoom = normalizeRoomName(item.room).toUpperCase();

    if (
      code.startsWith("PE") ||
      name.includes("PHYSICAL ACTIVITY") ||
      name.includes("MOVEMENT ENHANCEMENT") ||
      name.includes("TEAM SPORTS") ||
      normRoom.includes("GYM")
    ) {
      return "Physical Education";
    }
    if (normRoom.startsWith("CL ") || normRoom.startsWith("IT LAB")) {
      return "Laboratory";
    }
    return "Lecture";
  }

  /**
   * Format 24-hour "HH:MM" start and end time into readable "8:30–10:00 AM" label
   */
  function formatTimeRangeLabel(startTime, endTime) {
    const fmt = (hhmm) => {
      const [hStr, mStr] = String(hhmm || "08:00").split(":");
      const h = Number(hStr);
      const m = Number(mStr || 0);
      const period = h >= 12 ? "PM" : "AM";
      const h12 = h % 12 === 0 ? 12 : h % 12;
      const mPart = String(m).padStart(2, "0");
      return { text: `${h12}:${mPart}`, period };
    };
    const s = fmt(startTime);
    const e = fmt(endTime);
    if (s.period === e.period) {
      return `${s.text}–${e.text} ${e.period}`;
    }
    return `${s.text} ${s.period}–${e.text} ${e.period}`;
  }

  /**
   * Validate that a year level is strictly one of Year 1, Year 2, Year 3, or Year 4
   */
  function isValidYearLevel(val) {
    return VALID_YEAR_LEVELS.includes(String(val || "").trim());
  }

  /**
   * Normalize legacy or invalid year level strings into Year 1–Year 4
   */
  function normalizeYearLevel(val, fallback = "Year 2") {
    const str = String(val || "").trim();
    if (VALID_YEAR_LEVELS.includes(str)) return str;
    const legacyMap = {
      "1st Year": "Year 1",
      "First Year": "Year 1",
      "1": "Year 1",
      "2nd Year": "Year 2",
      "Second Year": "Year 2",
      "2": "Year 2",
      "3rd Year": "Year 3",
      "Third Year": "Year 3",
      "3": "Year 3",
      "4th Year": "Year 4",
      "Fourth Year": "Year 4",
      "4": "Year 4"
    };
    if (legacyMap[str]) return legacyMap[str];
    return VALID_YEAR_LEVELS.includes(fallback) ? fallback : "Year 2";
  }

  /**
   * Generate a unique identifier for records
   */
  function uid(prefix = "id") {
    return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 8)}`;
  }

  /**
   * Generate a formatted BANTUG UNIVERSITY Application Reference Number
   */
  function generateAppRef() {
    const year = new Date().getFullYear();
    const rand = Math.floor(10000 + Math.random() * 90000);
    return `BU-ADM-${year}-${rand}`;
  }

  /**
   * Format Date object as YYYY-MM-DD in local time
   */
  function formatLocalDate(dateObj) {
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, "0");
    const day = String(dateObj.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  /**
   * Return date string offset by `days` from today
   */
  function offsetDate(days) {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return formatLocalDate(d);
  }

  /**
   * Official Preloaded BSIT 2-2 Subjects & Actual Timetable
   * Program: Bachelor of Science in Information Technology
   * Year and Section: BSIT 2-2
   *
   * Connects the exact Monday–Friday timetable to the 9 existing subject records
   * without duplicating subject records.
   */
  function getInitialSubjects() {
    return [
      {
        id: "sub_t147",
        subjectCode: "T147",
        courseCode: "GE ELEC IT 3",
        subjectName: "Foreign Language 2",
        fullSubjectName: "GE ELEC IT 3 – Foreign Language 2",
        instructor: "Itliong, Samantha Dominique",
        course: "Bachelor of Science in Information Technology",
        yearLevel: "Year 2",
        section: "BSIT 2-2",
        units: 3,
        day: "Monday",
        startTime: "10:00",
        endTime: "11:30",
        room: "R5",
        scheduleSummary: "Mon 10:00–11:30 AM (R5) • Wed 10:00–11:30 AM (R5)",
        sessions: [
          {
            day: "Monday",
            startTime: "10:00",
            endTime: "11:30",
            timeLabel: "10:00–11:30 AM",
            room: "R5"
          },
          {
            day: "Wednesday",
            startTime: "10:00",
            endTime: "11:30",
            timeLabel: "10:00–11:30 AM",
            room: "R5"
          }
        ],
        quizzes: 94,
        assignments: 92,
        activities: 95,
        projects: 93,
        examinations: 92
      },
      {
        id: "sub_t146",
        subjectCode: "T146",
        courseCode: "GEC 6",
        subjectName: "Science, Technology and Society",
        fullSubjectName: "GEC 6 – Science, Technology and Society",
        instructor: "Duque, Bush",
        course: "Bachelor of Science in Information Technology",
        yearLevel: "Year 2",
        section: "BSIT 2-2",
        units: 3,
        day: "Monday",
        startTime: "08:30",
        endTime: "10:00",
        room: "R5",
        scheduleSummary: "Mon 8:30–10:00 AM (R5) • Wed 8:30–10:00 AM (R5)",
        sessions: [
          {
            day: "Monday",
            startTime: "08:30",
            endTime: "10:00",
            timeLabel: "8:30–10:00 AM",
            room: "R5"
          },
          {
            day: "Wednesday",
            startTime: "08:30",
            endTime: "10:00",
            timeLabel: "8:30–10:00 AM",
            room: "R5"
          }
        ],
        quizzes: 91,
        assignments: 93,
        activities: 90,
        projects: 92,
        examinations: 90
      },
      {
        id: "sub_t153",
        subjectCode: "T153",
        courseCode: "GEC 8",
        subjectName: "The Contemporary World",
        fullSubjectName: "GEC 8 – The Contemporary World",
        instructor: "Albano, Joan",
        course: "Bachelor of Science in Information Technology",
        yearLevel: "Year 2",
        section: "BSIT 2-2",
        units: 3,
        day: "Tuesday",
        startTime: "16:00",
        endTime: "17:30",
        room: "R5",
        scheduleSummary: "Tue 4:00–5:30 PM (R5) • Fri 4:00–5:30 PM (R5)",
        sessions: [
          {
            day: "Tuesday",
            startTime: "16:00",
            endTime: "17:30",
            timeLabel: "4:00–5:30 PM",
            room: "R5"
          },
          {
            day: "Friday",
            startTime: "16:00",
            endTime: "17:30",
            timeLabel: "4:00–5:30 PM",
            room: "R5"
          }
        ],
        quizzes: 90,
        assignments: 91,
        activities: 89,
        projects: 92,
        examinations: 90
      },
      {
        id: "sub_t148",
        subjectCode: "T148",
        courseCode: "IT 211",
        subjectName: "Data Structures and Algorithms",
        fullSubjectName: "IT 211 – Data Structures and Algorithms",
        instructor: "Binay-an, Lee-mher",
        course: "Bachelor of Science in Information Technology",
        yearLevel: "Year 2",
        section: "BSIT 2-2",
        units: 3,
        day: "Tuesday",
        startTime: "07:00",
        endTime: "10:00",
        room: "IT LAB 1",
        scheduleSummary:
          "Tue 7:00–10:00 AM (IT LAB 1) • Fri 7:00–8:00 AM (R1) • Fri 1:00–2:00 PM (R1)",
        sessions: [
          {
            day: "Tuesday",
            startTime: "07:00",
            endTime: "10:00",
            timeLabel: "7:00–10:00 AM",
            room: "IT LAB 1"
          },
          {
            day: "Friday",
            startTime: "07:00",
            endTime: "08:00",
            timeLabel: "7:00–8:00 AM",
            room: "R1"
          },
          {
            day: "Friday",
            startTime: "13:00",
            endTime: "14:00",
            timeLabel: "1:00–2:00 PM",
            room: "R1"
          }
        ],
        quizzes: 90,
        assignments: 92,
        activities: 91,
        projects: 94,
        examinations: 89
      },
      {
        id: "sub_t152",
        subjectCode: "T152",
        courseCode: "IT BPO 1",
        subjectName: "Business Communication",
        fullSubjectName: "IT BPO 1 – Business Communication",
        instructor: "Quevedo, Joseph",
        course: "Bachelor of Science in Information Technology",
        yearLevel: "Year 2",
        section: "BSIT 2-2",
        units: 3,
        day: "Tuesday",
        startTime: "14:30",
        endTime: "16:00",
        room: "R5",
        scheduleSummary: "Tue 2:30–4:00 PM (R5) • Fri 2:30–4:00 PM (R5)",
        sessions: [
          {
            day: "Tuesday",
            startTime: "14:30",
            endTime: "16:00",
            timeLabel: "2:30–4:00 PM",
            room: "R5"
          },
          {
            day: "Friday",
            startTime: "14:30",
            endTime: "16:00",
            timeLabel: "2:30–4:00 PM",
            room: "R5"
          }
        ],
        quizzes: 89,
        assignments: 90,
        activities: 91,
        projects: 90,
        examinations: 88
      },
      {
        id: "sub_t151",
        subjectCode: "T151",
        courseCode: "IT Elec 1",
        subjectName: "Platform Technologies",
        fullSubjectName: "IT Elec 1 – Platform Technologies",
        instructor: "Panganiban, Edward",
        course: "Bachelor of Science in Information Technology",
        yearLevel: "Year 2",
        section: "BSIT 2-2",
        units: 3,
        day: "Wednesday",
        startTime: "14:00",
        endTime: "17:00",
        room: "CL2",
        scheduleSummary: "Wed 2:00–5:00 PM (CL2) • Fri 10:00 AM–12:00 PM (Not specified)",
        sessions: [
          {
            day: "Wednesday",
            startTime: "14:00",
            endTime: "17:00",
            timeLabel: "2:00–5:00 PM",
            room: "CL2"
          },
          {
            day: "Friday",
            startTime: "10:00",
            endTime: "12:00",
            timeLabel: "10:00 AM–12:00 PM",
            room: "Not specified"
          }
        ],
        quizzes: 88,
        assignments: 90,
        activities: 89,
        projects: 91,
        examinations: 87
      },
      {
        id: "sub_t150",
        subjectCode: "T150",
        courseCode: "IT ELEC 2",
        subjectName: "Object-Oriented Programming",
        fullSubjectName: "IT ELEC 2 – Object-Oriented Programming",
        instructor: "Castillo, Wendell",
        course: "Bachelor of Science in Information Technology",
        yearLevel: "Year 2",
        section: "BSIT 2-2",
        units: 3,
        day: "Tuesday",
        startTime: "10:00",
        endTime: "13:00",
        room: "CL3",
        scheduleSummary:
          "Tue 10:00 AM–1:00 PM (CL3) • Wed 1:00–2:00 PM (R2) • Thu 1:00–2:00 PM (CL3)",
        sessions: [
          {
            day: "Tuesday",
            startTime: "10:00",
            endTime: "13:00",
            timeLabel: "10:00 AM–1:00 PM",
            room: "CL3"
          },
          {
            day: "Wednesday",
            startTime: "13:00",
            endTime: "14:00",
            timeLabel: "1:00–2:00 PM",
            room: "R2"
          },
          {
            day: "Thursday",
            startTime: "13:00",
            endTime: "14:00",
            timeLabel: "1:00–2:00 PM",
            room: "CL3"
          }
        ],
        quizzes: 92,
        assignments: 94,
        activities: 93,
        projects: 95,
        examinations: 91
      },
      {
        id: "sub_t003",
        subjectCode: "T003",
        courseCode: "IT INST 2",
        subjectName: "Creative and Critical Thinking",
        fullSubjectName: "IT INST 2 – Creative and Critical Thinking",
        instructor: "Vallestero III, Gorgonio",
        course: "Bachelor of Science in Information Technology",
        yearLevel: "Year 2",
        section: "BSIT 2-2",
        units: 3,
        day: "Thursday",
        startTime: "08:00",
        endTime: "12:00",
        room: "R1",
        scheduleSummary: "Thu 8:00 AM–12:00 PM (R1)",
        sessions: [
          {
            day: "Thursday",
            startTime: "08:00",
            endTime: "12:00",
            timeLabel: "8:00 AM–12:00 PM",
            room: "R1"
          }
        ],
        quizzes: null,
        assignments: null,
        activities: null,
        projects: null,
        examinations: null
      },
      {
        id: "sub_t149",
        subjectCode: "T149",
        courseCode: "PE 3",
        subjectName: "Physical Activity Towards Health Fitness III",
        fullSubjectName: "PE 3 – Physical Activity Towards Health Fitness III",
        instructor: "Not specified",
        course: "Bachelor of Science in Information Technology",
        yearLevel: "Year 2",
        section: "BSIT 2-2",
        units: 2,
        day: "Monday",
        startTime: "15:00",
        endTime: "17:00",
        room: "GYM",
        scheduleSummary: "Mon 3:00–5:00 PM (GYM)",
        sessions: [
          {
            day: "Monday",
            startTime: "15:00",
            endTime: "17:00",
            timeLabel: "3:00–5:00 PM",
            room: "GYM"
          }
        ],
        quizzes: 95,
        assignments: 95,
        activities: 96,
        projects: 95,
        examinations: 94
      }
    ];
  }

  /**
   * Historical Master Schedule Reference (September 15–17)
   * Preserved as a read-only historical reference archive as requested in Requirement 2
   * without merging into or duplicating the active weekly timetable.
   */
  function getHistoricalSept15To17Schedule() {
    return [
      {
        referenceId: "hist_sept15_1",
        dateLabel: "Monday, September 15",
        day: "Monday",
        subjectCode: "T146",
        courseCode: "GEC 6",
        subjectName: "Science, Technology and Society",
        displaySubject: "GEC 6 – Science, Technology and Society",
        instructor: "Duque, Bush",
        section: "BSIT 2-2",
        yearLevel: "Year 2",
        startTime: "08:30",
        endTime: "10:00",
        timeLabel: "8:30–10:00 AM",
        room: "R4",
        canonicalRoom: "Room 4",
        classType: "Lecture",
        note: "Historical Sept 15–17 Schedule Reference (Active weekly timetable uses R5)"
      },
      {
        referenceId: "hist_sept15_2",
        dateLabel: "Monday, September 15",
        day: "Monday",
        subjectCode: "T147",
        courseCode: "GE ELEC IT 3",
        subjectName: "Foreign Language 2",
        displaySubject: "GE ELEC IT 3 – Foreign Language 2",
        instructor: "Itliong, Samantha Dominique",
        section: "BSIT 2-2",
        yearLevel: "Year 2",
        startTime: "10:00",
        endTime: "11:30",
        timeLabel: "10:00–11:30 AM",
        room: "R4",
        canonicalRoom: "Room 4",
        classType: "Lecture",
        note: "Historical Sept 15–17 Schedule Reference (Active weekly timetable uses R5)"
      },
      {
        referenceId: "hist_sept15_3",
        dateLabel: "Monday, September 15",
        day: "Monday",
        subjectCode: "T149",
        courseCode: "PE 3",
        subjectName: "Physical Activity Towards Health Fitness III",
        displaySubject: "PE 3 – Physical Activity Towards Health Fitness III",
        instructor: "Not specified",
        section: "BSIT 2-2",
        yearLevel: "Year 2",
        startTime: "15:00",
        endTime: "17:00",
        timeLabel: "3:00–5:00 PM",
        room: "Open Gym",
        canonicalRoom: "Open Gym",
        classType: "Physical Education",
        note: "Historical Sept 15–17 Schedule Reference (Active weekly timetable uses GYM)"
      },
      {
        referenceId: "hist_sept16_1",
        dateLabel: "Tuesday, September 16",
        day: "Tuesday",
        subjectCode: "T148",
        courseCode: "IT 211",
        subjectName: "Data Structures and Algorithms",
        displaySubject: "IT 211 – Data Structures and Algorithms",
        instructor: "Binay-an, Lee-mher",
        section: "BSIT 2-2",
        yearLevel: "Year 2",
        startTime: "07:00",
        endTime: "10:00",
        timeLabel: "7:00–10:00 AM",
        room: "CL2",
        canonicalRoom: "CL 2",
        classType: "Laboratory",
        note: "Historical Sept 15–17 Schedule Reference (Active weekly timetable uses IT LAB 1)"
      },
      {
        referenceId: "hist_sept16_2",
        dateLabel: "Tuesday, September 16",
        day: "Tuesday",
        subjectCode: "T150",
        courseCode: "IT ELEC 2",
        subjectName: "Object-Oriented Programming",
        displaySubject: "IT ELEC 2 – Object-Oriented Programming",
        instructor: "Castillo, Wendell",
        section: "BSIT 2-2",
        yearLevel: "Year 2",
        startTime: "10:00",
        endTime: "13:00",
        timeLabel: "10:00 AM–1:00 PM",
        room: "CL1",
        canonicalRoom: "CL 1",
        classType: "Laboratory",
        note: "Historical Sept 15–17 Schedule Reference (Active weekly timetable uses CL3)"
      },
      {
        referenceId: "hist_sept16_3",
        dateLabel: "Tuesday, September 16",
        day: "Tuesday",
        subjectCode: "T152",
        courseCode: "IT BPO 1",
        subjectName: "Business Communication",
        displaySubject: "IT BPO 1 – Business Communication",
        instructor: "Quevedo, Joseph",
        section: "BSIT 2-2",
        yearLevel: "Year 2",
        startTime: "14:30",
        endTime: "16:00",
        timeLabel: "2:30–4:00 PM",
        room: "R4",
        canonicalRoom: "Room 4",
        classType: "Lecture",
        note: "Historical Sept 15–17 Schedule Reference (Active weekly timetable uses R5)"
      },
      {
        referenceId: "hist_sept16_4",
        dateLabel: "Tuesday, September 16",
        day: "Tuesday",
        subjectCode: "T153",
        courseCode: "GEC 8",
        subjectName: "The Contemporary World",
        displaySubject: "GEC 8 – The Contemporary World",
        instructor: "Albano, Joan",
        section: "BSIT 2-2",
        yearLevel: "Year 2",
        startTime: "16:00",
        endTime: "17:30",
        timeLabel: "4:00–5:30 PM",
        room: "R4",
        canonicalRoom: "Room 4",
        classType: "Lecture",
        note: "Historical Sept 15–17 Schedule Reference (Active weekly timetable uses R5)"
      },
      {
        referenceId: "hist_sept17_1",
        dateLabel: "Wednesday, September 17",
        day: "Wednesday",
        subjectCode: "T150",
        courseCode: "IT ELEC 2",
        subjectName: "Object-Oriented Programming",
        displaySubject: "IT ELEC 2 – Object-Oriented Programming",
        instructor: "Castillo, Wendell",
        section: "BSIT 2-2",
        yearLevel: "Year 2",
        startTime: "13:00",
        endTime: "14:00",
        timeLabel: "1:00–2:00 PM",
        room: "R2",
        canonicalRoom: "Room 2",
        classType: "Lecture",
        note: "Historical Sept 15–17 Schedule Reference (Matches active weekly R2 session)"
      },
      {
        referenceId: "hist_sept17_2",
        dateLabel: "Wednesday, September 17",
        day: "Wednesday",
        subjectCode: "T151",
        courseCode: "IT Elec 1",
        subjectName: "Platform Technologies",
        displaySubject: "IT Elec 1 – Platform Technologies",
        instructor: "Panganiban, Edward",
        section: "BSIT 2-2",
        yearLevel: "Year 2",
        startTime: "14:00",
        endTime: "17:00",
        timeLabel: "2:00–5:00 PM",
        room: "CL2",
        canonicalRoom: "CL 2",
        classType: "Laboratory",
        note: "Historical Sept 15–17 Schedule Reference (Matches active weekly CL2 session)"
      }
    ];
  }

  /**
   * Complete University-Wide Extended BSIT Subject & Schedule Catalog (Sample / Demo Data)
   * Provides conflict-free schedules across all 15 Faculty Accounts (`FAC-BU-01` to `FAC-BU-15`),
   * all 8 BSIT sections (`BSIT 1-1`, `BSIT 1-2`, `BSIT 2-1`, `BSIT 2-2`, `BSIT 3-1`, `BSIT 3-2`, `BSIT 4-1`, `BSIT 4-2`),
   * and all 14 campus classrooms, laboratories, and PE facilities.
   */
  function getExtendedCatalogSubjects() {
    return [
      // FAC-BU-01: Itliong, Samantha Dominique (Foreign Language 1 & 2 in LAVR)
      {
        id: "sub_t147a",
        subjectCode: "T147A",
        courseCode: "GE ELEC IT 3",
        subjectName: "Foreign Language 2",
        fullSubjectName: "GE ELEC IT 3 – Foreign Language 2",
        instructor: "Itliong, Samantha Dominique",
        facultyId: "FAC-BU-01",
        course: "Bachelor of Science in Information Technology",
        yearLevel: "Year 2",
        section: "BSIT 2-1",
        units: 3,
        isSampleData: true,
        day: "Tuesday",
        startTime: "08:30",
        endTime: "10:00",
        room: "Language or Audio-Visual Room (LAVR)",
        scheduleSummary: "Tue 8:30–10:00 AM (LAVR) • Thu 8:30–10:00 AM (LAVR)",
        sessions: [
          {
            day: "Tuesday",
            startTime: "08:30",
            endTime: "10:00",
            timeLabel: "8:30–10:00 AM",
            room: "Language or Audio-Visual Room (LAVR)",
            classType: "Lecture"
          },
          {
            day: "Thursday",
            startTime: "08:30",
            endTime: "10:00",
            timeLabel: "8:30–10:00 AM",
            room: "Language or Audio-Visual Room (LAVR)",
            classType: "Lecture"
          }
        ],
        quizzes: 93,
        assignments: 94,
        activities: 95,
        projects: 92,
        examinations: 93
      },
      {
        id: "sub_t107",
        subjectCode: "T107",
        courseCode: "GE ELEC IT 1",
        subjectName: "Foreign Language 1",
        fullSubjectName: "GE ELEC IT 1 – Foreign Language 1",
        instructor: "Itliong, Samantha Dominique",
        facultyId: "FAC-BU-01",
        course: "Bachelor of Science in Information Technology",
        yearLevel: "Year 1",
        section: "BSIT 1-2",
        units: 3,
        isSampleData: true,
        day: "Monday",
        startTime: "13:00",
        endTime: "14:30",
        room: "Language or Audio-Visual Room (LAVR)",
        scheduleSummary: "Mon 1:00–2:30 PM (LAVR) • Wed 1:00–2:30 PM (LAVR)",
        sessions: [
          {
            day: "Monday",
            startTime: "13:00",
            endTime: "14:30",
            timeLabel: "1:00–2:30 PM",
            room: "Language or Audio-Visual Room (LAVR)",
            classType: "Lecture"
          },
          {
            day: "Wednesday",
            startTime: "13:00",
            endTime: "14:30",
            timeLabel: "1:00–2:30 PM",
            room: "Language or Audio-Visual Room (LAVR)",
            classType: "Lecture"
          }
        ],
        quizzes: 91,
        assignments: 92,
        activities: 93,
        projects: 90,
        examinations: 91
      },

      // FAC-BU-02: Duque, Bush (Science, Technology and Society in Room 2 & Room 4)
      {
        id: "sub_t146a",
        subjectCode: "T146A",
        courseCode: "GEC 6",
        subjectName: "Science, Technology and Society",
        fullSubjectName: "GEC 6 – Science, Technology and Society",
        instructor: "Duque, Bush",
        facultyId: "FAC-BU-02",
        course: "Bachelor of Science in Information Technology",
        yearLevel: "Year 2",
        section: "BSIT 2-1",
        units: 3,
        isSampleData: true,
        day: "Monday",
        startTime: "10:00",
        endTime: "11:30",
        room: "Room 2",
        scheduleSummary: "Mon 10:00–11:30 AM (Room 2) • Wed 10:00–11:30 AM (Room 2)",
        sessions: [
          { day: "Monday", startTime: "10:00", endTime: "11:30", timeLabel: "10:00–11:30 AM", room: "Room 2", classType: "Lecture" },
          { day: "Wednesday", startTime: "10:00", endTime: "11:30", timeLabel: "10:00–11:30 AM", room: "Room 2", classType: "Lecture" }
        ],
        quizzes: 90,
        assignments: 91,
        activities: 90,
        projects: 92,
        examinations: 89
      },
      {
        id: "sub_t106",
        subjectCode: "T106",
        courseCode: "GEC 6",
        subjectName: "Science, Technology and Society",
        fullSubjectName: "GEC 6 – Science, Technology and Society",
        instructor: "Duque, Bush",
        facultyId: "FAC-BU-02",
        course: "Bachelor of Science in Information Technology",
        yearLevel: "Year 1",
        section: "BSIT 1-1",
        units: 3,
        isSampleData: true,
        day: "Tuesday",
        startTime: "10:00",
        endTime: "11:30",
        room: "Room 4",
        scheduleSummary: "Tue 10:00–11:30 AM (Room 4) • Thu 10:00–11:30 AM (Room 4)",
        sessions: [
          { day: "Tuesday", startTime: "10:00", endTime: "11:30", timeLabel: "10:00–11:30 AM", room: "Room 4", classType: "Lecture" },
          { day: "Thursday", startTime: "10:00", endTime: "11:30", timeLabel: "10:00–11:30 AM", room: "Room 4", classType: "Lecture" }
        ],
        quizzes: 91,
        assignments: 90,
        activities: 92,
        projects: 91,
        examinations: 90
      },

      // FAC-BU-03: Albano, Joan (The Contemporary World & Philippine History in Room 3)
      {
        id: "sub_t153a",
        subjectCode: "T153A",
        courseCode: "GEC 8",
        subjectName: "The Contemporary World",
        fullSubjectName: "GEC 8 – The Contemporary World",
        instructor: "Albano, Joan",
        facultyId: "FAC-BU-03",
        course: "Bachelor of Science in Information Technology",
        yearLevel: "Year 2",
        section: "BSIT 2-1",
        units: 3,
        isSampleData: true,
        day: "Monday",
        startTime: "13:00",
        endTime: "14:30",
        room: "Room 3",
        scheduleSummary: "Mon 1:00–2:30 PM (Room 3) • Wed 1:00–2:30 PM (Room 3)",
        sessions: [
          { day: "Monday", startTime: "13:00", endTime: "14:30", timeLabel: "1:00–2:30 PM", room: "Room 3", classType: "Lecture" },
          { day: "Wednesday", startTime: "13:00", endTime: "14:30", timeLabel: "1:00–2:30 PM", room: "Room 3", classType: "Lecture" }
        ],
        quizzes: 92,
        assignments: 91,
        activities: 93,
        projects: 90,
        examinations: 91
      },
      {
        id: "sub_t108",
        subjectCode: "T108",
        courseCode: "GEC 2",
        subjectName: "Readings in Philippine History",
        fullSubjectName: "GEC 2 – Readings in Philippine History",
        instructor: "Albano, Joan",
        facultyId: "FAC-BU-03",
        course: "Bachelor of Science in Information Technology",
        yearLevel: "Year 1",
        section: "BSIT 1-2",
        units: 3,
        isSampleData: true,
        day: "Tuesday",
        startTime: "13:00",
        endTime: "14:30",
        room: "Room 3",
        scheduleSummary: "Tue 1:00–2:30 PM (Room 3) • Thu 1:00–2:30 PM (Room 3)",
        sessions: [
          { day: "Tuesday", startTime: "13:00", endTime: "14:30", timeLabel: "1:00–2:30 PM", room: "Room 3", classType: "Lecture" },
          { day: "Thursday", startTime: "13:00", endTime: "14:30", timeLabel: "1:00–2:30 PM", room: "Room 3", classType: "Lecture" }
        ],
        quizzes: 93,
        assignments: 92,
        activities: 94,
        projects: 91,
        examinations: 92
      },

      // FAC-BU-04: Somera, Fabian (Data Structures BSIT 2-1 & Algorithms BSIT 3-2)
      {
        id: "sub_t148a",
        subjectCode: "T148A",
        courseCode: "IT 211",
        subjectName: "Data Structures and Algorithms",
        fullSubjectName: "IT 211 – Data Structures and Algorithms",
        instructor: "Somera, Fabian",
        facultyId: "FAC-BU-04",
        course: "Bachelor of Science in Information Technology",
        yearLevel: "Year 2",
        section: "BSIT 2-1",
        units: 3,
        isSampleData: true,
        day: "Monday",
        startTime: "07:00",
        endTime: "10:00",
        room: "IT Lab 1",
        scheduleSummary: "Mon 7:00–10:00 AM (IT Lab 1) • Thu 7:00–8:30 AM (Room 2)",
        sessions: [
          { day: "Monday", startTime: "07:00", endTime: "10:00", timeLabel: "7:00–10:00 AM", room: "IT Lab 1", classType: "Laboratory" },
          { day: "Thursday", startTime: "07:00", endTime: "08:30", timeLabel: "7:00–8:30 AM", room: "Room 2", classType: "Lecture" }
        ],
        quizzes: 92,
        assignments: 93,
        activities: 94,
        projects: 95,
        examinations: 91
      },
      {
        id: "sub_t304",
        subjectCode: "T304",
        courseCode: "IT 314",
        subjectName: "Algorithms and Complexity",
        fullSubjectName: "IT 314 – Algorithms and Complexity",
        instructor: "Somera, Fabian",
        facultyId: "FAC-BU-04",
        course: "Bachelor of Science in Information Technology",
        yearLevel: "Year 3",
        section: "BSIT 3-2",
        units: 3,
        isSampleData: true,
        day: "Tuesday",
        startTime: "13:00",
        endTime: "16:00",
        room: "CL 1",
        scheduleSummary: "Tue 1:00–4:00 PM (CL 1) • Fri 8:00–10:00 AM (Room 2)",
        sessions: [
          { day: "Tuesday", startTime: "13:00", endTime: "16:00", timeLabel: "1:00–4:00 PM", room: "CL 1", classType: "Laboratory" },
          { day: "Friday", startTime: "08:00", endTime: "10:00", timeLabel: "8:00–10:00 AM", room: "Room 2", classType: "Lecture" }
        ],
        quizzes: 91,
        assignments: 92,
        activities: 93,
        projects: 94,
        examinations: 90
      },

      // FAC-BU-05: Quevedo, Joseph (Business Communication BSIT 2-1 & BPO 2 BSIT 3-1)
      {
        id: "sub_t152a",
        subjectCode: "T152A",
        courseCode: "IT BPO 1",
        subjectName: "Business Communication",
        fullSubjectName: "IT BPO 1 – Business Communication",
        instructor: "Quevedo, Joseph",
        facultyId: "FAC-BU-05",
        course: "Bachelor of Science in Information Technology",
        yearLevel: "Year 2",
        section: "BSIT 2-1",
        units: 3,
        isSampleData: true,
        day: "Tuesday",
        startTime: "10:00",
        endTime: "11:30",
        room: "Room 6",
        scheduleSummary: "Tue 10:00–11:30 AM (Room 6) • Thu 10:00–11:30 AM (Room 6)",
        sessions: [
          { day: "Tuesday", startTime: "10:00", endTime: "11:30", timeLabel: "10:00–11:30 AM", room: "Room 6", classType: "Lecture" },
          { day: "Thursday", startTime: "10:00", endTime: "11:30", timeLabel: "10:00–11:30 AM", room: "Room 6", classType: "Lecture" }
        ],
        quizzes: 90,
        assignments: 91,
        activities: 92,
        projects: 90,
        examinations: 91
      },
      {
        id: "sub_t305",
        subjectCode: "T305",
        courseCode: "IT BPO 2",
        subjectName: "Service Culture and Operations",
        fullSubjectName: "IT BPO 2 – Service Culture and Operations",
        instructor: "Quevedo, Joseph",
        facultyId: "FAC-BU-05",
        course: "Bachelor of Science in Information Technology",
        yearLevel: "Year 3",
        section: "BSIT 3-1",
        units: 3,
        isSampleData: true,
        day: "Monday",
        startTime: "10:00",
        endTime: "11:30",
        room: "Room 4",
        scheduleSummary: "Mon 10:00–11:30 AM (Room 4) • Wed 11:00 AM–1:00 PM (Room 4)",
        sessions: [
          { day: "Monday", startTime: "10:00", endTime: "11:30", timeLabel: "10:00–11:30 AM", room: "Room 4", classType: "Lecture" },
          { day: "Wednesday", startTime: "11:00", endTime: "13:00", timeLabel: "11:00 AM–1:00 PM", room: "Room 4", classType: "Lecture" }
        ],
        quizzes: 92,
        assignments: 93,
        activities: 91,
        projects: 93,
        examinations: 92
      },

      // FAC-BU-06: Panganiban, Edward (Platform Tech BSIT 2-1 & Cloud Infrastructure BSIT 4-2)
      {
        id: "sub_t151a",
        subjectCode: "T151A",
        courseCode: "IT Elec 1",
        subjectName: "Platform Technologies",
        fullSubjectName: "IT Elec 1 – Platform Technologies",
        instructor: "Panganiban, Edward",
        facultyId: "FAC-BU-06",
        course: "Bachelor of Science in Information Technology",
        yearLevel: "Year 2",
        section: "BSIT 2-1",
        units: 3,
        isSampleData: true,
        day: "Monday",
        startTime: "14:30",
        endTime: "17:30",
        room: "CL 2",
        scheduleSummary: "Mon 2:30–5:30 PM (CL 2) • Thu 1:00–3:00 PM (Room 2)",
        sessions: [
          { day: "Monday", startTime: "14:30", endTime: "17:30", timeLabel: "2:30–5:30 PM", room: "CL 2", classType: "Laboratory" },
          { day: "Thursday", startTime: "13:00", endTime: "15:00", timeLabel: "1:00–3:00 PM", room: "Room 2", classType: "Lecture" }
        ],
        quizzes: 89,
        assignments: 90,
        activities: 91,
        projects: 92,
        examinations: 88
      },
      {
        id: "sub_t403",
        subjectCode: "T403",
        courseCode: "IT 413",
        subjectName: "Cloud & Platform Infrastructure",
        fullSubjectName: "IT 413 – Cloud & Platform Infrastructure",
        instructor: "Panganiban, Edward",
        facultyId: "FAC-BU-06",
        course: "Bachelor of Science in Information Technology",
        yearLevel: "Year 4",
        section: "BSIT 4-2",
        units: 3,
        isSampleData: true,
        day: "Tuesday",
        startTime: "13:00",
        endTime: "16:00",
        room: "CL 2",
        scheduleSummary: "Tue 1:00–4:00 PM (CL 2) • Fri 1:00–3:00 PM (Room 4)",
        sessions: [
          { day: "Tuesday", startTime: "13:00", endTime: "16:00", timeLabel: "1:00–4:00 PM", room: "CL 2", classType: "Laboratory" },
          { day: "Friday", startTime: "13:00", endTime: "15:00", timeLabel: "1:00–3:00 PM", room: "Room 4", classType: "Lecture" }
        ],
        quizzes: 91,
        assignments: 92,
        activities: 90,
        projects: 93,
        examinations: 91
      },

      // FAC-BU-07: Salvador, Francis Van (OOP BSIT 2-1 & Event-Driven Programming BSIT 3-2)
      {
        id: "sub_t150a",
        subjectCode: "T150A",
        courseCode: "IT ELEC 2",
        subjectName: "Object-Oriented Programming",
        fullSubjectName: "IT ELEC 2 – Object-Oriented Programming",
        instructor: "Salvador, Francis Van",
        facultyId: "FAC-BU-07",
        course: "Bachelor of Science in Information Technology",
        yearLevel: "Year 2",
        section: "BSIT 2-1",
        units: 3,
        isSampleData: true,
        day: "Tuesday",
        startTime: "13:00",
        endTime: "16:00",
        room: "CL 3",
        scheduleSummary: "Tue 1:00–4:00 PM (CL 3) • Thu 3:00–5:00 PM (Room 2)",
        sessions: [
          { day: "Tuesday", startTime: "13:00", endTime: "16:00", timeLabel: "1:00–4:00 PM", room: "CL 3", classType: "Laboratory" },
          { day: "Thursday", startTime: "15:00", endTime: "17:00", timeLabel: "3:00–5:00 PM", room: "Room 2", classType: "Lecture" }
        ],
        quizzes: 93,
        assignments: 94,
        activities: 92,
        projects: 95,
        examinations: 92
      },
      {
        id: "sub_t306",
        subjectCode: "T306",
        courseCode: "IT 315",
        subjectName: "Event-Driven Programming",
        fullSubjectName: "IT 315 – Event-Driven Programming",
        instructor: "Salvador, Francis Van",
        facultyId: "FAC-BU-07",
        course: "Bachelor of Science in Information Technology",
        yearLevel: "Year 3",
        section: "BSIT 3-2",
        units: 3,
        isSampleData: true,
        day: "Monday",
        startTime: "13:00",
        endTime: "16:00",
        room: "CL 3",
        scheduleSummary: "Mon 1:00–4:00 PM (CL 3) • Wed 3:00–5:00 PM (Room 6)",
        sessions: [
          { day: "Monday", startTime: "13:00", endTime: "16:00", timeLabel: "1:00–4:00 PM", room: "CL 3", classType: "Laboratory" },
          { day: "Wednesday", startTime: "15:00", endTime: "17:00", timeLabel: "3:00–5:00 PM", room: "Room 6", classType: "Lecture" }
        ],
        quizzes: 92,
        assignments: 93,
        activities: 94,
        projects: 94,
        examinations: 91
      },

      // FAC-BU-08: Vallestero III, Gorgonio (Creative Thinking BSIT 2-1 & Design Thinking BSIT 1-1)
      {
        id: "sub_t003a",
        subjectCode: "T003A",
        courseCode: "IT INST 2",
        subjectName: "Creative and Critical Thinking",
        fullSubjectName: "IT INST 2 – Creative and Critical Thinking",
        instructor: "Vallestero III, Gorgonio",
        facultyId: "FAC-BU-08",
        course: "Bachelor of Science in Information Technology",
        yearLevel: "Year 2",
        section: "BSIT 2-1",
        units: 3,
        isSampleData: true,
        day: "Friday",
        startTime: "08:00",
        endTime: "11:00",
        room: "Room 3",
        scheduleSummary: "Fri 8:00–11:00 AM (Room 3)",
        sessions: [
          { day: "Friday", startTime: "08:00", endTime: "11:00", timeLabel: "8:00–11:00 AM", room: "Room 3", classType: "Lecture" }
        ],
        quizzes: 91,
        assignments: 92,
        activities: 93,
        projects: 92,
        examinations: 90
      },
      {
        id: "sub_t001",
        subjectCode: "T001",
        courseCode: "IT INST 1",
        subjectName: "Design Thinking and Innovation",
        fullSubjectName: "IT INST 1 – Design Thinking and Innovation",
        instructor: "Vallestero III, Gorgonio",
        facultyId: "FAC-BU-08",
        course: "Bachelor of Science in Information Technology",
        yearLevel: "Year 1",
        section: "BSIT 1-1",
        units: 3,
        isSampleData: true,
        day: "Wednesday",
        startTime: "10:00",
        endTime: "12:00",
        room: "Room 1",
        scheduleSummary: "Wed 10:00 AM–12:00 PM (Room 1)",
        sessions: [
          { day: "Wednesday", startTime: "10:00", endTime: "12:00", timeLabel: "10:00 AM–12:00 PM", room: "Room 1", classType: "Lecture" }
        ],
        quizzes: 93,
        assignments: 91,
        activities: 94,
        projects: 92,
        examinations: 91
      },

      // FAC-BU-09: Santos, Elena (Physical Education across Open Gym & Gym)
      {
        id: "sub_t149a",
        subjectCode: "T149A",
        courseCode: "PE 3",
        subjectName: "Physical Activity Towards Health Fitness III",
        fullSubjectName: "PE 3 – Physical Activity Towards Health Fitness III",
        instructor: "Santos, Elena (Visiting Faculty - Simulated Demo)",
        facultyId: "FAC-BU-09",
        course: "Bachelor of Science in Information Technology",
        yearLevel: "Year 2",
        section: "BSIT 2-1",
        units: 2,
        isSampleData: true,
        day: "Wednesday",
        startTime: "15:00",
        endTime: "17:00",
        room: "Open Gym",
        scheduleSummary: "Wed 3:00–5:00 PM (Open Gym)",
        sessions: [
          { day: "Wednesday", startTime: "15:00", endTime: "17:00", timeLabel: "3:00–5:00 PM", room: "Open Gym", classType: "Physical Education" }
        ],
        quizzes: 95,
        assignments: 94,
        activities: 96,
        projects: 95,
        examinations: 94
      },
      {
        id: "sub_t109",
        subjectCode: "T109",
        courseCode: "PE 1",
        subjectName: "Movement Enhancement",
        fullSubjectName: "PE 1 – Movement Enhancement",
        instructor: "Santos, Elena (Visiting Faculty - Simulated Demo)",
        facultyId: "FAC-BU-09",
        course: "Bachelor of Science in Information Technology",
        yearLevel: "Year 1",
        section: "BSIT 1-1",
        units: 2,
        isSampleData: true,
        day: "Monday",
        startTime: "15:00",
        endTime: "17:00",
        room: "Open Gym",
        scheduleSummary: "Mon 3:00–5:00 PM (Open Gym)",
        sessions: [
          { day: "Monday", startTime: "15:00", endTime: "17:00", timeLabel: "3:00–5:00 PM", room: "Open Gym", classType: "Physical Education" }
        ],
        quizzes: 94,
        assignments: 95,
        activities: 96,
        projects: 94,
        examinations: 95
      },
      {
        id: "sub_t110",
        subjectCode: "T110",
        courseCode: "PE 2",
        subjectName: "Fitness Exercises",
        fullSubjectName: "PE 2 – Fitness Exercises",
        instructor: "Santos, Elena (Visiting Faculty - Simulated Demo)",
        facultyId: "FAC-BU-09",
        course: "Bachelor of Science in Information Technology",
        yearLevel: "Year 1",
        section: "BSIT 1-2",
        units: 2,
        isSampleData: true,
        day: "Thursday",
        startTime: "15:00",
        endTime: "17:00",
        room: "Gym",
        scheduleSummary: "Thu 3:00–5:00 PM (Gym)",
        sessions: [
          { day: "Thursday", startTime: "15:00", endTime: "17:00", timeLabel: "3:00–5:00 PM", room: "Gym", classType: "Physical Education" }
        ],
        quizzes: 95,
        assignments: 95,
        activities: 97,
        projects: 95,
        examinations: 94
      },
      {
        id: "sub_t409",
        subjectCode: "T409",
        courseCode: "PE 4",
        subjectName: "Team Sports and Recreation",
        fullSubjectName: "PE 4 – Team Sports and Recreation",
        instructor: "Santos, Elena (Visiting Faculty - Simulated Demo)",
        facultyId: "FAC-BU-09",
        course: "Bachelor of Science in Information Technology",
        yearLevel: "Year 4",
        section: "BSIT 4-1",
        units: 2,
        isSampleData: true,
        day: "Friday",
        startTime: "09:00",
        endTime: "11:00",
        room: "Open Gym",
        scheduleSummary: "Fri 9:00–11:00 AM (Open Gym)",
        sessions: [
          { day: "Friday", startTime: "09:00", endTime: "11:00", timeLabel: "9:00–11:00 AM", room: "Open Gym", classType: "Physical Education" }
        ],
        quizzes: 96,
        assignments: 95,
        activities: 97,
        projects: 96,
        examinations: 95
      },

      // FAC-BU-10: Binay-an, Lee-mher (Additional Sections: BSIT 1-1 & BSIT 3-1)
      {
        id: "sub_t104",
        subjectCode: "T104",
        courseCode: "IT 113",
        subjectName: "Discrete Structures 1",
        fullSubjectName: "IT 113 – Discrete Structures 1",
        instructor: "Binay-an, Lee-mher",
        facultyId: "FAC-BU-10",
        course: "Bachelor of Science in Information Technology",
        yearLevel: "Year 1",
        section: "BSIT 1-1",
        units: 3,
        isSampleData: true,
        day: "Monday",
        startTime: "11:00",
        endTime: "12:30",
        room: "Room 1",
        scheduleSummary: "Mon 11:00 AM–12:30 PM (Room 1) • Wed 1:00–2:30 PM (Room 1)",
        sessions: [
          { day: "Monday", startTime: "11:00", endTime: "12:30", timeLabel: "11:00 AM–12:30 PM", room: "Room 1", classType: "Lecture" },
          { day: "Wednesday", startTime: "13:00", endTime: "14:30", timeLabel: "1:00–2:30 PM", room: "Room 1", classType: "Lecture" }
        ],
        quizzes: 90,
        assignments: 91,
        activities: 90,
        projects: 92,
        examinations: 89
      },
      {
        id: "sub_t307",
        subjectCode: "T307",
        courseCode: "IT 316",
        subjectName: "Quantitative Methods & Modeling",
        fullSubjectName: "IT 316 – Quantitative Methods & Modeling",
        instructor: "Binay-an, Lee-mher",
        facultyId: "FAC-BU-10",
        course: "Bachelor of Science in Information Technology",
        yearLevel: "Year 3",
        section: "BSIT 3-1",
        units: 3,
        isSampleData: true,
        day: "Thursday",
        startTime: "10:00",
        endTime: "12:00",
        room: "IT Lab 2",
        scheduleSummary: "Thu 10:00 AM–12:00 PM (IT Lab 2)",
        sessions: [
          { day: "Thursday", startTime: "10:00", endTime: "12:00", timeLabel: "10:00 AM–12:00 PM", room: "IT Lab 2", classType: "Laboratory" }
        ],
        quizzes: 92,
        assignments: 91,
        activities: 93,
        projects: 92,
        examinations: 91
      },

      // FAC-BU-11: Castillo, Wendell (Additional Section: BSIT 1-2)
      {
        id: "sub_t105",
        subjectCode: "T105",
        courseCode: "IT 114",
        subjectName: "Human-Computer Interaction 1",
        fullSubjectName: "IT 114 – Human-Computer Interaction 1",
        instructor: "Castillo, Wendell",
        facultyId: "FAC-BU-11",
        course: "Bachelor of Science in Information Technology",
        yearLevel: "Year 1",
        section: "BSIT 1-2",
        units: 3,
        isSampleData: true,
        day: "Monday",
        startTime: "09:00",
        endTime: "12:00",
        room: "IT Lab 2",
        scheduleSummary: "Mon 9:00 AM–12:00 PM (IT Lab 2) • Fri 10:00 AM–12:00 PM (Room 2)",
        sessions: [
          { day: "Monday", startTime: "09:00", endTime: "12:00", timeLabel: "9:00 AM–12:00 PM", room: "IT Lab 2", classType: "Laboratory" },
          { day: "Friday", startTime: "10:00", endTime: "12:00", timeLabel: "10:00 AM–12:00 PM", room: "Room 2", classType: "Lecture" }
        ],
        quizzes: 93,
        assignments: 92,
        activities: 94,
        projects: 93,
        examinations: 91
      },

      // FAC-BU-12: Delos Reyes, Arturo (Demo Faculty) (BSIT 1-1 & BSIT 1-2)
      {
        id: "sub_t101",
        subjectCode: "T101",
        courseCode: "IT 111",
        subjectName: "Introduction to Computing",
        fullSubjectName: "IT 111 – Introduction to Computing",
        instructor: "Delos Reyes, Arturo (Demo Faculty)",
        facultyId: "FAC-BU-12",
        course: "Bachelor of Science in Information Technology",
        yearLevel: "Year 1",
        section: "BSIT 1-1",
        units: 3,
        isSampleData: true,
        day: "Monday",
        startTime: "08:00",
        endTime: "11:00",
        room: "CL 1",
        scheduleSummary: "Mon 8:00–11:00 AM (CL 1) • Wed 8:00–10:00 AM (Room 3)",
        sessions: [
          { day: "Monday", startTime: "08:00", endTime: "11:00", timeLabel: "8:00–11:00 AM", room: "CL 1", classType: "Laboratory" },
          { day: "Wednesday", startTime: "08:00", endTime: "10:00", timeLabel: "8:00–10:00 AM", room: "Room 3", classType: "Lecture" }
        ],
        quizzes: 92,
        assignments: 90,
        activities: 93,
        projects: 91,
        examinations: 90
      },
      {
        id: "sub_t102",
        subjectCode: "T102",
        courseCode: "IT 112",
        subjectName: "Computer Programming 1",
        fullSubjectName: "IT 112 – Computer Programming 1",
        instructor: "Delos Reyes, Arturo (Demo Faculty)",
        facultyId: "FAC-BU-12",
        course: "Bachelor of Science in Information Technology",
        yearLevel: "Year 1",
        section: "BSIT 1-2",
        units: 3,
        isSampleData: true,
        day: "Tuesday",
        startTime: "09:00",
        endTime: "12:00",
        room: "CL 1",
        scheduleSummary: "Tue 9:00 AM–12:00 PM (CL 1) • Thu 9:00–11:00 AM (Room 3)",
        sessions: [
          { day: "Tuesday", startTime: "09:00", endTime: "12:00", timeLabel: "9:00 AM–12:00 PM", room: "CL 1", classType: "Laboratory" },
          { day: "Thursday", startTime: "09:00", endTime: "11:00", timeLabel: "9:00–11:00 AM", room: "Room 3", classType: "Lecture" }
        ],
        quizzes: 90,
        assignments: 91,
        activities: 92,
        projects: 93,
        examinations: 89
      },

      // FAC-BU-13: Macapagal, Clarissa (Demo Faculty) (BSIT 3-1 & BSIT 3-2)
      {
        id: "sub_t301",
        subjectCode: "T301",
        courseCode: "IT 311",
        subjectName: "Database Management Systems 2",
        fullSubjectName: "IT 311 – Database Management Systems 2",
        instructor: "Macapagal, Clarissa (Demo Faculty)",
        facultyId: "FAC-BU-13",
        course: "Bachelor of Science in Information Technology",
        yearLevel: "Year 3",
        section: "BSIT 3-1",
        units: 3,
        isSampleData: true,
        day: "Monday",
        startTime: "13:00",
        endTime: "16:00",
        room: "IT Lab 2",
        scheduleSummary: "Mon 1:00–4:00 PM (IT Lab 2) • Wed 1:00–3:00 PM (Room 6)",
        sessions: [
          { day: "Monday", startTime: "13:00", endTime: "16:00", timeLabel: "1:00–4:00 PM", room: "IT Lab 2", classType: "Laboratory" },
          { day: "Wednesday", startTime: "13:00", endTime: "15:00", timeLabel: "1:00–3:00 PM", room: "Room 6", classType: "Lecture" }
        ],
        quizzes: 91,
        assignments: 93,
        activities: 92,
        projects: 94,
        examinations: 90
      },
      {
        id: "sub_t302",
        subjectCode: "T302",
        courseCode: "IT 312",
        subjectName: "Web Systems and Technologies",
        fullSubjectName: "IT 312 – Web Systems and Technologies",
        instructor: "Macapagal, Clarissa (Demo Faculty)",
        facultyId: "FAC-BU-13",
        course: "Bachelor of Science in Information Technology",
        yearLevel: "Year 3",
        section: "BSIT 3-1",
        units: 3,
        isSampleData: true,
        day: "Tuesday",
        startTime: "08:00",
        endTime: "11:00",
        room: "IT Lab 2",
        scheduleSummary: "Tue 8:00–11:00 AM (IT Lab 2) • Thu 8:00–10:00 AM (Room 6)",
        sessions: [
          { day: "Tuesday", startTime: "08:00", endTime: "11:00", timeLabel: "8:00–11:00 AM", room: "IT Lab 2", classType: "Laboratory" },
          { day: "Thursday", startTime: "08:00", endTime: "10:00", timeLabel: "8:00–10:00 AM", room: "Room 6", classType: "Lecture" }
        ],
        quizzes: 94,
        assignments: 92,
        activities: 95,
        projects: 93,
        examinations: 92
      },
      {
        id: "sub_t308",
        subjectCode: "T308",
        courseCode: "IT 312",
        subjectName: "Web Systems and Technologies",
        fullSubjectName: "IT 312 – Web Systems and Technologies",
        instructor: "Macapagal, Clarissa (Demo Faculty)",
        facultyId: "FAC-BU-13",
        course: "Bachelor of Science in Information Technology",
        yearLevel: "Year 3",
        section: "BSIT 3-2",
        units: 3,
        isSampleData: true,
        day: "Friday",
        startTime: "10:00",
        endTime: "13:00",
        room: "IT Lab 2",
        scheduleSummary: "Fri 10:00 AM–1:00 PM (IT Lab 2)",
        sessions: [
          { day: "Friday", startTime: "10:00", endTime: "13:00", timeLabel: "10:00 AM–1:00 PM", room: "IT Lab 2", classType: "Laboratory" }
        ],
        quizzes: 93,
        assignments: 92,
        activities: 94,
        projects: 93,
        examinations: 91
      },

      // FAC-BU-14: Villamor, Renato (Demo Faculty) (BSIT 3-2, BSIT 4-1, BSIT 4-2)
      {
        id: "sub_t303",
        subjectCode: "T303",
        courseCode: "IT 313",
        subjectName: "Information Assurance and Security 1",
        fullSubjectName: "IT 313 – Information Assurance and Security 1",
        instructor: "Villamor, Renato (Demo Faculty)",
        facultyId: "FAC-BU-14",
        course: "Bachelor of Science in Information Technology",
        yearLevel: "Year 3",
        section: "BSIT 3-2",
        units: 3,
        isSampleData: true,
        day: "Wednesday",
        startTime: "09:00",
        endTime: "12:00",
        room: "CL 2",
        scheduleSummary: "Wed 9:00 AM–12:00 PM (CL 2) • Fri 1:00–3:00 PM (Room 6)",
        sessions: [
          { day: "Wednesday", startTime: "09:00", endTime: "12:00", timeLabel: "9:00 AM–12:00 PM", room: "CL 2", classType: "Laboratory" },
          { day: "Friday", startTime: "13:00", endTime: "15:00", timeLabel: "1:00–3:00 PM", room: "Room 6", classType: "Lecture" }
        ],
        quizzes: 89,
        assignments: 90,
        activities: 91,
        projects: 92,
        examinations: 88
      },
      {
        id: "sub_t402",
        subjectCode: "T402",
        courseCode: "IT 412",
        subjectName: "Systems Administration and Maintenance",
        fullSubjectName: "IT 412 – Systems Administration and Maintenance",
        instructor: "Villamor, Renato (Demo Faculty)",
        facultyId: "FAC-BU-14",
        course: "Bachelor of Science in Information Technology",
        yearLevel: "Year 4",
        section: "BSIT 4-1",
        units: 3,
        isSampleData: true,
        day: "Monday",
        startTime: "09:00",
        endTime: "12:00",
        room: "CL 3",
        scheduleSummary: "Mon 9:00 AM–12:00 PM (CL 3) • Fri 11:00 AM–1:00 PM (Room 6)",
        sessions: [
          { day: "Monday", startTime: "09:00", endTime: "12:00", timeLabel: "9:00 AM–12:00 PM", room: "CL 3", classType: "Laboratory" },
          { day: "Friday", startTime: "11:00", endTime: "13:00", timeLabel: "11:00 AM–1:00 PM", room: "Room 6", classType: "Lecture" }
        ],
        quizzes: 92,
        assignments: 91,
        activities: 93,
        projects: 94,
        examinations: 91
      },
      {
        id: "sub_t404",
        subjectCode: "T404",
        courseCode: "IT 414",
        subjectName: "Network Security & Forensics",
        fullSubjectName: "IT 414 – Network Security & Forensics",
        instructor: "Villamor, Renato (Demo Faculty)",
        facultyId: "FAC-BU-14",
        course: "Bachelor of Science in Information Technology",
        yearLevel: "Year 4",
        section: "BSIT 4-2",
        units: 3,
        isSampleData: true,
        day: "Thursday",
        startTime: "09:00",
        endTime: "12:00",
        room: "CL 2",
        scheduleSummary: "Thu 9:00 AM–12:00 PM (CL 2)",
        sessions: [
          { day: "Thursday", startTime: "09:00", endTime: "12:00", timeLabel: "9:00 AM–12:00 PM", room: "CL 2", classType: "Laboratory" }
        ],
        quizzes: 91,
        assignments: 92,
        activities: 92,
        projects: 93,
        examinations: 90
      },

      // FAC-BU-15: Ocampo, Maricel (Demo Faculty) (BSIT 4-1 & BSIT 4-2)
      {
        id: "sub_t401",
        subjectCode: "T401",
        courseCode: "IT 411",
        subjectName: "Capstone Project and Research 2",
        fullSubjectName: "IT 411 – Capstone Project and Research 2",
        instructor: "Ocampo, Maricel (Demo Faculty)",
        facultyId: "FAC-BU-15",
        course: "Bachelor of Science in Information Technology",
        yearLevel: "Year 4",
        section: "BSIT 4-1",
        units: 3,
        isSampleData: true,
        day: "Thursday",
        startTime: "13:00",
        endTime: "16:00",
        room: "IT Lab 1",
        scheduleSummary: "Thu 1:00–4:00 PM (IT Lab 1) • Fri 2:00–4:00 PM (IT Lab 1)",
        sessions: [
          { day: "Thursday", startTime: "13:00", endTime: "16:00", timeLabel: "1:00–4:00 PM", room: "IT Lab 1", classType: "Laboratory" },
          { day: "Friday", startTime: "14:00", endTime: "16:00", timeLabel: "2:00–4:00 PM", room: "IT Lab 1", classType: "Laboratory" }
        ],
        quizzes: 95,
        assignments: 94,
        activities: 96,
        projects: 97,
        examinations: 94
      },
      {
        id: "sub_t405",
        subjectCode: "T405",
        courseCode: "IT 411",
        subjectName: "Capstone Project and Research 2",
        fullSubjectName: "IT 411 – Capstone Project and Research 2",
        instructor: "Ocampo, Maricel (Demo Faculty)",
        facultyId: "FAC-BU-15",
        course: "Bachelor of Science in Information Technology",
        yearLevel: "Year 4",
        section: "BSIT 4-2",
        units: 3,
        isSampleData: true,
        day: "Monday",
        startTime: "10:00",
        endTime: "13:00",
        room: "IT Lab 1",
        scheduleSummary: "Mon 10:00 AM–1:00 PM (IT Lab 1) • Wed 9:00–11:00 AM (Room 4)",
        sessions: [
          { day: "Monday", startTime: "10:00", endTime: "13:00", timeLabel: "10:00 AM–1:00 PM", room: "IT Lab 1", classType: "Laboratory" },
          { day: "Wednesday", startTime: "09:00", endTime: "11:00", timeLabel: "9:00–11:00 AM", room: "Room 4", classType: "Lecture" }
        ],
        quizzes: 94,
        assignments: 95,
        activities: 95,
        projects: 96,
        examinations: 93
      }
    ];
  }

  /**
   * Build initial facultyGrades map synchronized with getInitialSubjects()
   */
  function getInitialFacultyGrades(subjects) {
    const weights = {
      quizzes: 20,
      assignments: 15,
      activities: 15,
      projects: 25,
      examinations: 25
    };
    const map = {};
    subjects.forEach((s) => {
      const demoAvg = computeSubjectAverage(s, weights);
      if (demoAvg !== null) {
        map[s.subjectCode] = {
          "2025-BSIT-0202": demoAvg,
          "2025-BSIT-0205": Number(Math.min(98, demoAvg + 1.2).toFixed(2)),
          "2025-BSIT-0209": Number(Math.max(82, demoAvg - 2.1).toFixed(2)),
          "2025-BSIT-0214": Number(Math.min(97, demoAvg + 0.5).toFixed(2)),
          "2025-BSIT-0218": Number(Math.max(80, demoAvg - 3.4).toFixed(2)),
          "2025-BSIT-0221": Number(Math.min(96, demoAvg + 0.8).toFixed(2)),
          "2025-BSIT-0225": Number(Math.max(84, demoAvg - 1.5).toFixed(2)),
          "2026-BSIT-0101": 91.5,
          "2026-BSIT-0104": 89.25,
          "2026-BSIT-0108": 93.0,
          "2024-BSIT-0302": 90.75,
          "2024-BSIT-0307": 94.2,
          "2024-BSIT-0312": 88.5,
          "2023-BSIT-0401": 95.1,
          "2023-BSIT-0406": 92.4
        };
      } else {
        map[s.subjectCode] = {};
      }
    });
    return map;
  }

  /**
   * Build default BANTUG UNIVERSITY demonstration dataset
   */
  function getDefaultData() {
    const initialSubjects = getInitialSubjects();
    const initialFacultyGrades = getInitialFacultyGrades(initialSubjects);

    const initialAttendance = [
      {
        id: "att_201",
        studentNumber: "2025-BSIT-0202",
        subjectCode: "T148",
        subject: "T148 - IT 211 - Data Structures and Algorithms",
        date: offsetDate(-4),
        status: "Present",
        remarks: "Recorded by Faculty (Somera, Fabian) — Lecture on linked lists and stacks"
      },
      {
        id: "att_202",
        studentNumber: "2025-BSIT-0202",
        subjectCode: "T150",
        subject: "T150 - IT ELEC 2 - Object-Oriented Programming",
        date: offsetDate(-3),
        status: "Present",
        remarks: "Recorded by Faculty (Salvador, Francis Van) — Encapsulation and inheritance lab"
      },
      {
        id: "att_203",
        studentNumber: "2025-BSIT-0202",
        subjectCode: "T151",
        subject: "T151 - IT ELEC 1 - Platform Technologies",
        date: offsetDate(-2),
        status: "Present",
        remarks: "Recorded by Faculty (Panganiban, Edward) — Operating environment configuration"
      },
      {
        id: "att_204",
        studentNumber: "2025-BSIT-0202",
        subjectCode: "T146",
        subject: "T146 - GEC 6 - Science, Technology, and Society",
        date: offsetDate(-1),
        status: "Late",
        remarks: "Recorded by Faculty (Duque, Bush) — Arrived 8 minutes after roll call"
      },
      {
        id: "att_205",
        studentNumber: "2025-BSIT-0202",
        subjectCode: "T152",
        subject: "T152 - IT BPO 1 - Business Communication",
        date: offsetDate(0),
        status: "Present",
        remarks: "Recorded by Faculty (Quevedo, Joseph) — Professional correspondence workshop"
      }
    ];

    const initialFacultyAttendanceLogs = initialAttendance.map((att, idx) => ({
      id: `facatt_20${idx + 1}`,
      subjectCode: att.subjectCode,
      date: att.date,
      records: {
        "2025-BSIT-0202": att.status,
        "2025-BSIT-0205": "Present",
        "2025-BSIT-0209": idx === 2 ? "Late" : "Present",
        "2025-BSIT-0214": "Present",
        "2025-BSIT-0218": idx === 1 ? "Absent" : "Present"
      }
    }));

    return {
      schemaVersion: SCHEMA_VERSION,

      // 1. Primary Student Profile (BSIT 2-2)
      profile: {
        studentNumber: "2025-BSIT-0202",
        fullName: "Racel Valiente (Demo Student)",
        course: "Bachelor of Science in Information Technology",
        yearLevel: "Year 2",
        section: "BSIT 2-2",
        email: "student.demo@bantug.edu.example",
        contactNumber: "+63 917 555 0202",
        address: "Bantug University Residence Area, Campus District (Sample Address)",
        guardianName: "Maria Dela Cruz",
        guardianContact: "+63 917 555 0299",
        academicTerm: "2nd Semester, AY 2026–2027",
        bio: "Year 2 BSIT 2-2 student at BANTUG UNIVERSITY focusing on Data Structures, Object-Oriented Programming, and Platform Technologies.",
        avatar: "assets/images/default-avatar.svg"
      },

      // 2. Faculty Profile & Faculty Directory for BSIT 2-2 (Individual Professor Accounts)
      facultyProfile: {
        facultyId: "FAC-BU-04",
        fullName: "Somera, Fabian",
        department: "College of Information Technology & Computing",
        designation: "Instructor, Information Technology Department",
        email: "f.somera.demo@bantug.edu.example",
        contactNumber: "+63 917 555 0811",
        officeLocation: "IT Faculty Consultation Room, BANTUG UNIVERSITY",
        advisorySection: "BSIT 2-2",
        activeInstructorFilter: "Somera, Fabian"
      },

      facultyDirectory: [
        {
          facultyId: "FAC-BU-04",
          username: "f.somera",
          name: "Somera, Fabian",
          department: "College of Information Technology & Computing",
          designation: "Instructor, Information Technology Department",
          email: "f.somera.demo@bantug.edu.example",
          contactNumber: "+63 917 555 0811",
          advisorySection: "BSIT 2-1",
          assignedSubjects: [
            "T148A – IT 211 – Data Structures and Algorithms (BSIT 2-1)",
            "T304 – IT 314 – Algorithms and Complexity (BSIT 3-2)"
          ],
          isDemoData: false
        },
        {
          facultyId: "FAC-BU-07",
          username: "f.salvador",
          name: "Salvador, Francis Van",
          department: "College of Information Technology & Computing",
          designation: "Instructor, Object-Oriented Programming",
          email: "f.salvador.demo@bantug.edu.example",
          contactNumber: "+63 917 555 0817",
          advisorySection: "BSIT 2-1",
          assignedSubjects: [
            "T150A – IT ELEC 2 – Object-Oriented Programming (BSIT 2-1)",
            "T306 – IT 315 – Event-Driven Programming (BSIT 3-2)"
          ],
          isDemoData: false
        },
        {
          facultyId: "FAC-BU-01",
          username: "s.itliong",
          name: "Itliong, Samantha Dominique",
          department: "Department of General Education & Languages",
          designation: "Instructor, Foreign Language 1 & 2",
          email: "s.itliong.demo@bantug.edu.example",
          contactNumber: "+63 917 555 0810",
          advisorySection: "BSIT 2-2",
          assignedSubjects: [
            "T147 – GE ELEC IT 3 – Foreign Language 2 (BSIT 2-2)",
            "T147A – GE ELEC IT 3 – Foreign Language 2 (BSIT 2-1)",
            "T107 – GE ELEC IT 1 – Foreign Language 1 (BSIT 1-2)"
          ],
          isDemoData: false
        },
        {
          facultyId: "FAC-BU-02",
          username: "b.duque",
          name: "Duque, Bush",
          department: "Department of General Education",
          designation: "Instructor, Science, Technology, and Society",
          email: "b.duque.demo@bantug.edu.example",
          contactNumber: "+63 917 555 0812",
          advisorySection: "BSIT 2-2",
          assignedSubjects: [
            "T146 – GEC 6 – Science, Technology and Society (BSIT 2-2)",
            "T146A – GEC 6 – Science, Technology and Society (BSIT 2-1)",
            "T106 – GEC 6 – Science, Technology and Society (BSIT 1-1)"
          ],
          isDemoData: false
        },
        {
          facultyId: "FAC-BU-03",
          username: "j.albano",
          name: "Albano, Joan",
          department: "Department of Social Sciences & General Education",
          designation: "Instructor, The Contemporary World & History",
          email: "j.albano.demo@bantug.edu.example",
          contactNumber: "+63 917 555 0813",
          advisorySection: "BSIT 2-2",
          assignedSubjects: [
            "T153 – GEC 8 – The Contemporary World (BSIT 2-2)",
            "T153A – GEC 8 – The Contemporary World (BSIT 2-1)",
            "T108 – GEC 2 – Readings in Philippine History (BSIT 1-2)"
          ],
          isDemoData: false
        },
        {
          facultyId: "FAC-BU-05",
          username: "j.quevedo",
          name: "Quevedo, Joseph",
          department: "College of Information Technology & Computing",
          designation: "Instructor, Business Communication & Service Operations",
          email: "j.quevedo.demo@bantug.edu.example",
          contactNumber: "+63 917 555 0815",
          advisorySection: "BSIT 2-2",
          assignedSubjects: [
            "T152 – IT BPO 1 – Business Communication (BSIT 2-2)",
            "T152A – IT BPO 1 – Business Communication (BSIT 2-1)",
            "T305 – IT BPO 2 – Service Culture and Operations (BSIT 3-1)"
          ],
          isDemoData: false
        },
        {
          facultyId: "FAC-BU-06",
          username: "e.panganiban",
          name: "Panganiban, Edward",
          department: "College of Information Technology & Computing",
          designation: "Instructor, Platform Technologies & Cloud Infrastructure",
          email: "e.panganiban.demo@bantug.edu.example",
          contactNumber: "+63 917 555 0816",
          advisorySection: "BSIT 2-2",
          assignedSubjects: [
            "T151 – IT Elec 1 – Platform Technologies (BSIT 2-2)",
            "T151A – IT Elec 1 – Platform Technologies (BSIT 2-1)",
            "T403 – IT 413 – Cloud & Platform Infrastructure (BSIT 4-2)"
          ],
          isDemoData: false
        },
        {
          facultyId: "FAC-BU-08",
          username: "g.vallestero",
          name: "Vallestero III, Gorgonio",
          department: "College of Information Technology & Computing",
          designation: "Instructor, Creative & Critical Thinking",
          email: "g.vallestero.demo@bantug.edu.example",
          contactNumber: "+63 917 555 0818",
          advisorySection: "BSIT 2-2",
          assignedSubjects: [
            "T003 – IT INST 2 – Creative and Critical Thinking (BSIT 2-2)",
            "T003A – IT INST 2 – Creative and Critical Thinking (BSIT 2-1)",
            "T001 – IT INST 1 – Design Thinking and Innovation (BSIT 1-1)"
          ],
          isDemoData: false
        },
        {
          facultyId: "FAC-BU-09",
          username: "e.santos",
          name: "Santos, Elena (Visiting Faculty - Simulated Demo)",
          department: "Department of Physical Education & Sports",
          designation: "Visiting Lecturer, Physical Education (Demo)",
          email: "e.santos.demo@bantug.edu.example",
          contactNumber: "+63 917 555 0819",
          advisorySection: "BSIT 2-1",
          assignedSubjects: [
            "T149A – PE 3 – Physical Activity Towards Health Fitness III (BSIT 2-1)",
            "T109 – PE 1 – Movement Enhancement (BSIT 1-1)",
            "T110 – PE 2 – Fitness Exercises (BSIT 1-2)",
            "T409 – PE 4 – Team Sports and Recreation (BSIT 4-1)"
          ],
          isDemoData: true
        },
        {
          facultyId: "FAC-BU-10",
          username: "l.binayan",
          name: "Binay-an, Lee-mher",
          department: "College of Information Technology & Computing",
          designation: "Instructor, Data Structures & Quantitative Modeling",
          email: "l.binayan.demo@bantug.edu.example",
          contactNumber: "+63 917 555 0820",
          advisorySection: "BSIT 2-2",
          assignedSubjects: [
            "T148 – IT 211 – Data Structures and Algorithms (BSIT 2-2)",
            "T104 – IT 113 – Discrete Structures 1 (BSIT 1-1)",
            "T307 – IT 316 – Quantitative Methods & Modeling (BSIT 3-1)"
          ],
          isDemoData: false
        },
        {
          facultyId: "FAC-BU-11",
          username: "w.castillo",
          name: "Castillo, Wendell",
          department: "College of Information Technology & Computing",
          designation: "Instructor, Object-Oriented Programming & HCI",
          email: "w.castillo.demo@bantug.edu.example",
          contactNumber: "+63 917 555 0821",
          advisorySection: "BSIT 2-2",
          assignedSubjects: [
            "T150 – IT ELEC 2 – Object-Oriented Programming (BSIT 2-2)",
            "T105 – IT 114 – Human-Computer Interaction 1 (BSIT 1-2)"
          ],
          isDemoData: false
        },
        {
          facultyId: "FAC-BU-12",
          username: "a.delosreyes",
          name: "Delos Reyes, Arturo (Demo Faculty)",
          department: "College of Information Technology & Computing",
          designation: "Assistant Professor, Computing Fundamentals (Demo)",
          email: "a.delosreyes.demo@bantug.edu.example",
          contactNumber: "+63 917 555 0822",
          advisorySection: "BSIT 1-1",
          assignedSubjects: [
            "T101 – IT 111 – Introduction to Computing (BSIT 1-1)",
            "T102 – IT 112 – Computer Programming 1 (BSIT 1-2)"
          ],
          isDemoData: true
        },
        {
          facultyId: "FAC-BU-13",
          username: "c.macapagal",
          name: "Macapagal, Clarissa (Demo Faculty)",
          department: "College of Information Technology & Computing",
          designation: "Associate Professor, Database & Web Systems (Demo)",
          email: "c.macapagal.demo@bantug.edu.example",
          contactNumber: "+63 917 555 0823",
          advisorySection: "BSIT 3-1",
          assignedSubjects: [
            "T301 – IT 311 – Database Management Systems 2 (BSIT 3-1)",
            "T302 – IT 312 – Web Systems and Technologies (BSIT 3-1)",
            "T308 – IT 312 – Web Systems and Technologies (BSIT 3-2)"
          ],
          isDemoData: true
        },
        {
          facultyId: "FAC-BU-14",
          username: "r.villamor",
          name: "Villamor, Renato (Demo Faculty)",
          department: "College of Information Technology & Computing",
          designation: "Instructor, Information Assurance & Systems Admin (Demo)",
          email: "r.villamor.demo@bantug.edu.example",
          contactNumber: "+63 917 555 0824",
          advisorySection: "BSIT 3-2",
          assignedSubjects: [
            "T303 – IT 313 – Information Assurance and Security 1 (BSIT 3-2)",
            "T402 – IT 412 – Systems Administration and Maintenance (BSIT 4-1)",
            "T404 – IT 414 – Network Security & Forensics (BSIT 4-2)"
          ],
          isDemoData: true
        },
        {
          facultyId: "FAC-BU-15",
          username: "m.ocampo",
          name: "Ocampo, Maricel (Demo Faculty)",
          department: "College of Information Technology & Computing",
          designation: "Capstone Coordinator & Senior IT Faculty (Demo)",
          email: "m.ocampo.demo@bantug.edu.example",
          contactNumber: "+63 917 555 0825",
          advisorySection: "BSIT 4-1",
          assignedSubjects: [
            "T401 – IT 411 – Capstone Project and Research 2 (BSIT 4-1)",
            "T405 – IT 411 – Capstone Project and Research 2 (BSIT 4-2)"
          ],
          isDemoData: true
        }
      ],

      // 3. Demonstration Student Roster — 15 BSIT Students across Year 1, Year 2, Year 3, and Year 4
      sectionRoster: [
        {
          studentNumber: "2025-BSIT-0202",
          username: "r.valiente",
          fullName: "Racel Valiente (Demo Student)",
          course: "Bachelor of Science in Information Technology",
          yearLevel: "Year 2",
          section: "BSIT 2-2",
          email: "student.demo@bantug.edu.example",
          contactNumber: "+63 917 555 0202",
          status: "Regular",
          isPrimaryDemoStudent: true
        },
        {
          studentNumber: "2025-BSIT-0205",
          username: "a.santos",
          fullName: "Santos, Angela Mae (Sample Student)",
          course: "Bachelor of Science in Information Technology",
          yearLevel: "Year 2",
          section: "BSIT 2-2",
          email: "a.santos.demo@bantug.edu.example",
          contactNumber: "+63 917 555 0205",
          status: "Regular",
          isPrimaryDemoStudent: false
        },
        {
          studentNumber: "2025-BSIT-0209",
          username: "c.reyes",
          fullName: "Reyes, Christian Kyle (Sample Student)",
          course: "Bachelor of Science in Information Technology",
          yearLevel: "Year 2",
          section: "BSIT 2-2",
          email: "c.reyes.demo@bantug.edu.example",
          contactNumber: "+63 917 555 0209",
          status: "Regular",
          isPrimaryDemoStudent: false
        },
        {
          studentNumber: "2025-BSIT-0214",
          username: "p.mendoza",
          fullName: "Mendoza, Patricia Anne (Sample Student)",
          course: "Bachelor of Science in Information Technology",
          yearLevel: "Year 2",
          section: "BSIT 2-2",
          email: "p.mendoza.demo@bantug.edu.example",
          contactNumber: "+63 917 555 0214",
          status: "Regular",
          isPrimaryDemoStudent: false
        },
        {
          studentNumber: "2025-BSIT-0218",
          username: "m.garcia",
          fullName: "Garcia, Mark Anthony (Sample Student)",
          course: "Bachelor of Science in Information Technology",
          yearLevel: "Year 2",
          section: "BSIT 2-2",
          email: "m.garcia.demo@bantug.edu.example",
          contactNumber: "+63 917 555 0218",
          status: "Regular",
          isPrimaryDemoStudent: false
        },
        {
          studentNumber: "2025-BSIT-0221",
          username: "c.villanueva.st",
          fullName: "Villanueva, Camille Joy (Sample Student)",
          course: "Bachelor of Science in Information Technology",
          yearLevel: "Year 2",
          section: "BSIT 2-2",
          email: "c.villanueva.st@bantug.edu.example",
          contactNumber: "+63 917 555 0221",
          status: "Regular",
          isPrimaryDemoStudent: false
        },
        {
          studentNumber: "2025-BSIT-0225",
          username: "j.aquino",
          fullName: "Aquino, Joshua Daniel (Sample Student)",
          course: "Bachelor of Science in Information Technology",
          yearLevel: "Year 2",
          section: "BSIT 2-2",
          email: "j.aquino.demo@bantug.edu.example",
          contactNumber: "+63 917 555 0225",
          status: "Regular",
          isPrimaryDemoStudent: false
        },
        {
          studentNumber: "2026-BSIT-0101",
          username: "a.cruz",
          fullName: "Cruz, Alyssa Nicole (Sample Student)",
          course: "Bachelor of Science in Information Technology",
          yearLevel: "Year 1",
          section: "BSIT 1-1",
          email: "a.cruz.demo@bantug.edu.example",
          contactNumber: "+63 917 555 0101",
          status: "Regular",
          isPrimaryDemoStudent: false
        },
        {
          studentNumber: "2026-BSIT-0104",
          username: "g.bautista",
          fullName: "Bautista, Gabriel Lorenzo (Sample Student)",
          course: "Bachelor of Science in Information Technology",
          yearLevel: "Year 1",
          section: "BSIT 1-1",
          email: "g.bautista.demo@bantug.edu.example",
          contactNumber: "+63 917 555 0104",
          status: "Regular",
          isPrimaryDemoStudent: false
        },
        {
          studentNumber: "2026-BSIT-0108",
          username: "s.ramos",
          fullName: "Ramos, Sophia Marie (Sample Student)",
          course: "Bachelor of Science in Information Technology",
          yearLevel: "Year 1",
          section: "BSIT 1-2",
          email: "s.ramos.demo@bantug.edu.example",
          contactNumber: "+63 917 555 0108",
          status: "Regular",
          isPrimaryDemoStudent: false
        },
        {
          studentNumber: "2024-BSIT-0302",
          username: "k.flores",
          fullName: "Flores, Kenneth Adrian (Sample Student)",
          course: "Bachelor of Science in Information Technology",
          yearLevel: "Year 3",
          section: "BSIT 3-1",
          email: "k.flores.demo@bantug.edu.example",
          contactNumber: "+63 917 555 0302",
          status: "Regular",
          isPrimaryDemoStudent: false
        },
        {
          studentNumber: "2024-BSIT-0307",
          username: "j.tolentino",
          fullName: "Tolentino, Jasmine Claire (Sample Student)",
          course: "Bachelor of Science in Information Technology",
          yearLevel: "Year 3",
          section: "BSIT 3-1",
          email: "j.tolentino.demo@bantug.edu.example",
          contactNumber: "+63 917 555 0307",
          status: "Regular",
          isPrimaryDemoStudent: false
        },
        {
          studentNumber: "2024-BSIT-0312",
          username: "b.navarro",
          fullName: "Navarro, Bryan Paolo (Sample Student)",
          course: "Bachelor of Science in Information Technology",
          yearLevel: "Year 3",
          section: "BSIT 3-2",
          email: "b.navarro.demo@bantug.edu.example",
          contactNumber: "+63 917 555 0312",
          status: "Regular",
          isPrimaryDemoStudent: false
        },
        {
          studentNumber: "2023-BSIT-0401",
          username: "e.pascual",
          fullName: "Pascual, Erika Mae (Sample Student)",
          course: "Bachelor of Science in Information Technology",
          yearLevel: "Year 4",
          section: "BSIT 4-1",
          email: "e.pascual.demo@bantug.edu.example",
          contactNumber: "+63 917 555 0401",
          status: "Regular",
          isPrimaryDemoStudent: false
        },
        {
          studentNumber: "2023-BSIT-0406",
          username: "d.soriano",
          fullName: "Soriano, Dominic Vince (Sample Student)",
          course: "Bachelor of Science in Information Technology",
          yearLevel: "Year 4",
          section: "BSIT 4-1",
          email: "d.soriano.demo@bantug.edu.example",
          contactNumber: "+63 917 555 0406",
          status: "Regular",
          isPrimaryDemoStudent: false
        }
      ],

      // 4. Faculty Grade Sheet for BSIT 2-2 Roster (keyed by subjectCode -> studentNumber -> grade value or null)
      facultyGrades: initialFacultyGrades,

      // 5. Faculty Attendance Sheet for BSIT 2-2 Roster
      facultyAttendanceLogs: initialFacultyAttendanceLogs,

      // 6. Configurable Grading Weights
      gradingWeights: {
        quizzes: 20,
        assignments: 15,
        activities: 15,
        projects: 25,
        examinations: 25
      },

      // 7. Unified Subjects List (Used by Schedule, Grades, Dashboard, and Faculty Portal)
      schedules: initialSubjects.map((s) => ({
        ...s,
        sessions: s.sessions.map((sess) => ({ ...sess }))
      })),
      grades: initialSubjects.map((s) => ({
        ...s,
        sessions: s.sessions.map((sess) => ({ ...sess }))
      })),

      // 8. Student Attendance Logs (Recorded by Faculty, Read-Only for Students)
      attendance: initialAttendance,

      // 9. Academic Assignments / Tasks (Published by Faculty, Submitted/Completed by Students)
      tasks: [
        {
          id: "tsk_201",
          title: "Implement Stack & Queue Data Structure Operations",
          subjectCode: "T148",
          subject: "T148 - IT 211 - Data Structures and Algorithms",
          instructor: "Somera, Fabian",
          deadline: offsetDate(2),
          priority: "High",
          status: "Pending",
          description:
            "Complete the algorithm trace and time-complexity analysis for the BSIT 2-2 laboratory exercise on Stack and Queue operations.",
          publishedBy: "Somera, Fabian",
          submissions: {}
        },
        {
          id: "tsk_202",
          title: "Class Hierarchy & Polymorphism Programming Exercise",
          subjectCode: "T150",
          subject: "T150 - IT ELEC 2 - Object-Oriented Programming",
          instructor: "Salvador, Francis Van",
          deadline: offsetDate(4),
          priority: "High",
          status: "Pending",
          description:
            "Design base and derived classes demonstrating inheritance, encapsulation, and method overriding.",
          publishedBy: "Salvador, Francis Van",
          submissions: {}
        },
        {
          id: "tsk_203",
          title: "Foreign Language 2 Vocabulary & Dialogue Practice",
          subjectCode: "T147",
          subject: "T147 - GE ELEC IT 3 - Foreign Language 2",
          instructor: "Itliong, Samantha Dominique",
          deadline: offsetDate(5),
          priority: "Medium",
          status: "Submitted",
          description:
            "Prepare and submit your conversational dialogue script for the BSIT 2-2 oral recitation session.",
          publishedBy: "Itliong, Samantha Dominique",
          submissions: {
            "2025-BSIT-0202": {
              studentNumber: "2025-BSIT-0202",
              studentName: "Racel Valiente (Demo Student)",
              status: "Submitted",
              responseText:
                "Submitted dialogue script and vocabulary pronunciation notes for Partner Exercise 2.",
              submittedAt: offsetDate(-1)
            }
          }
        },
        {
          id: "tsk_204",
          title: "Reflection Essay on Globalization & Digital Society",
          subjectCode: "T153",
          subject: "T153 - GEC 8 - The Contemporary World",
          instructor: "Albano, Joan",
          deadline: offsetDate(-2),
          priority: "Medium",
          status: "Overdue",
          description:
            "Submit an 800-word synthesis paper analyzing the impact of digital globalization on developing economies.",
          publishedBy: "Albano, Joan",
          submissions: {}
        },
        {
          id: "tsk_205",
          title: "Business Memo & Technical Proposal Draft",
          subjectCode: "T152",
          subject: "T152 - IT BPO 1 - Business Communication",
          instructor: "Quevedo, Joseph",
          deadline: offsetDate(-4),
          priority: "Low",
          status: "Completed",
          description:
            "Draft an executive memo and technical project proposal following standard business communication format.",
          publishedBy: "Quevedo, Joseph",
          submissions: {
            "2025-BSIT-0202": {
              studentNumber: "2025-BSIT-0202",
              studentName: "Racel Valiente (Demo Student)",
              status: "Completed",
              responseText:
                "Completed and verified during BSIT 2-2 Business Communication workshop.",
              submittedAt: offsetDate(-4)
            }
          }
        }
      ],

      // 10. BANTUG UNIVERSITY Announcements (Published by Faculty, Read-Only for Students)
      announcements: [
        {
          id: "ann_201",
          title: "BSIT 2-2 Official Class Timetable & Room Assignments",
          category: "Academic",
          date: offsetDate(0),
          author: "Somera, Fabian • College of Information Technology & Computing",
          description:
            "BSIT 2-2 students may now view the official Monday-to-Friday class schedule under Class Schedule. Please take note of your room assignments (R1, R2, R5, CL2, CL3, IT LAB 1, and GYM) and arrive on time for laboratory and lecture sessions.",
          published: true,
          read: false
        },
        {
          id: "ann_202",
          title: "IT 211 & IT ELEC 2 Laboratory Submission Guidelines for BSIT 2-2",
          category: "Academic",
          date: offsetDate(-2),
          author: "Salvador, Francis Van • IT Department Faculty",
          description:
            "Students enrolled in Data Structures and Algorithms (IT 211) and Object-Oriented Programming (IT ELEC 2) are reminded to submit their completed programming exercises through the Academic Task Manager before the posted deadline.",
          published: true,
          read: false
        },
        {
          id: "ann_203",
          title: "BANTUG UNIVERSITY Foundation Week & IT Skills Exhibition",
          category: "Events",
          date: offsetDate(-4),
          author: "Office of Student Affairs & IT Faculty",
          description:
            "All BSIT sections are invited to participate in the Web Development and Software Design Showcase. Coordinate with your class adviser and section officers for project booth registration.",
          published: true,
          read: true
        },
        {
          id: "ann_204",
          title: "University Library Digital Commons & Open Learning Links",
          category: "Campus Notice",
          date: offsetDate(-6),
          author: "BANTUG UNIVERSITY Learning Resource Center",
          description:
            "Updated open-access references for Data Structures, OOP, Platform Technologies, and General Education courses are available under the Learning Resources module.",
          published: true,
          read: true
        }
      ],

      // 11. Learning Resources (Connected to BSIT 2-2 subjects)
      resources: [
        {
          id: "res_201",
          title: "Visualgo: Visualizing Data Structures and Algorithms",
          subject: "T148 - IT 211 - Data Structures and Algorithms",
          category: "Tutorials",
          url: "https://visualgo.net/en",
          description:
            "Interactive step-by-step animations for sorting, trees, graphs, linked lists, and stacks."
        },
        {
          id: "res_202",
          title: "MDN Web Docs: Object-Oriented Programming Concepts",
          subject: "T150 - IT ELEC 2 - Object-Oriented Programming",
          category: "Reference Links",
          url: "https://developer.mozilla.org/en-US/docs/Learn/JavaScript/Objects/Object-oriented_programming",
          description:
            "Open-access guide covering classes, constructors, encapsulation, inheritance, and polymorphism."
        },
        {
          id: "res_203",
          title: "Operating Systems & Platform Architecture Reference (OSDev Wiki)",
          subject: "T151 - IT ELEC 1 - Platform Technologies",
          category: "Study Materials",
          url: "https://wiki.osdev.org/Expanded_Main_Page",
          description:
            "Public technical reference on hardware platforms, operating system kernels, and system architecture."
        },
        {
          id: "res_204",
          title: "Purdue OWL: Professional & Business Writing Guidelines",
          subject: "T152 - IT BPO 1 - Business Communication",
          category: "Lecture Notes",
          url: "https://owl.purdue.edu/owl/subject_specific_writing/professional_technical_writing/index.html",
          description:
            "Reference material for workplace communication, memos, executive summaries, and presentations."
        },
        {
          id: "res_205",
          title: "Stanford Encyclopedia: Ethics and History of Science & Technology",
          subject: "T146 - GEC 6 - Science, Technology, and Society",
          category: "Reference Links",
          url: "https://plato.stanford.edu/",
          description:
            "Open academic articles examining the interplay of scientific innovation and modern society."
        }
      ],

      // 12. Actual Applicant Submissions (Separate from Applicant Demo Account)
      applications: [],

      // 13. Dedicated Applicant Demo Account Profile & Sample Status Records
      demoApplicantProfile: {
        applicantId: "APP-DEMO-2026-01",
        fullName: "Ceasar Villanueva (Applicant Demo Account)",
        email: "applicant.demo@bantug.edu.example",
        contactNumber: "+63 917 555 0921",
        yearLevel: "Year 1",
        desiredProgram: "Bachelor of Science in Information Technology (BSIT)",
        note: "Simulated Applicant Demo Account — Not connected to a live university admissions database."
      },

      demoApplicantRecords: [
        {
          id: "app_demo_1",
          referenceNumber: "BU-ADM-2026-10482",
          username: "c.villanueva",
          fullName: "Ceasar Villanueva (Sample Demo Record)",
          dateOfBirth: "2007-05-14",
          email: "applicant.demo@bantug.edu.example",
          contactNumber: "+63 917 555 0921",
          address: "45 Mabini St., Poblacion (Sample Applicant Address)",
          applicantType: "Senior High School Graduate / Freshman",
          yearLevel: "Year 1",
          desiredProgram: "Bachelor of Science in Information Technology (BSIT)",
          secondChoiceProgram: "Bachelor of Science in Computer Science (BSCS)",
          previousSchool: "Bantug National High School - Senior High Dept. (Sample)",
          educationalBackground: "STEM / ICT Strand - Honors Graduate",
          graduationYear: "2026",
          submittedDate: offsetDate(-3),
          status: "Under Review",
          isDemoRecord: true,
          remarks:
            "Sample Demo Record: Academic credentials and program choice are under simulated evaluation."
        },
        {
          id: "app_demo_2",
          referenceNumber: "BU-ADM-2026-10319",
          username: "r.mendoza",
          fullName: "Rafael Luis Mendoza (Sample Demo Record)",
          dateOfBirth: "2007-08-22",
          email: "rafael.mendoza.demo@bantug.edu.example",
          contactNumber: "+63 917 555 0432",
          address: "88 Rizal Ave., San Isidro (Sample Applicant Address)",
          applicantType: "Senior High School Graduate / Freshman",
          yearLevel: "Year 1",
          desiredProgram: "Bachelor of Science in Computer Science (BSCS)",
          secondChoiceProgram: "Bachelor of Science in Information Technology (BSIT)",
          previousSchool: "San Isidro Science & Technology High School (Sample)",
          educationalBackground: "TVL-ICT Strand (Computer Programming)",
          graduationYear: "2026",
          submittedDate: offsetDate(-1),
          status: "Pending",
          isDemoRecord: true,
          remarks:
            "Sample Demo Record: Application received in simulated demo queue awaiting initial review."
        },
        {
          id: "app_demo_3",
          referenceNumber: "BU-ADM-2026-10105",
          username: "b.aquino",
          fullName: "Bea Katrina Aquino (Sample Demo Record)",
          dateOfBirth: "2006-11-09",
          email: "bea.aquino.demo@bantug.edu.example",
          contactNumber: "+63 917 555 0674",
          address: "12 Burgos Blvd., Central District (Sample Applicant Address)",
          applicantType: "College Transferee",
          yearLevel: "Year 2",
          desiredProgram: "Bachelor of Science in Information Technology (BSIT)",
          secondChoiceProgram: "Bachelor of Science in Information Systems (BSIS)",
          previousSchool: "Northern Luzon State Polytechnic (Sample)",
          educationalBackground: "Completed 1st Year BSIT Units",
          graduationYear: "2025",
          submittedDate: offsetDate(-7),
          status: "Approved",
          isDemoRecord: true,
          remarks:
            "Sample Demo Record: Simulated application approved for Year 2 admission."
        },
        {
          id: "app_demo_4",
          referenceNumber: "BU-ADM-2026-10044",
          username: "j.bautista.app",
          fullName: "Jerome Carlo Bautista (Sample Demo Record)",
          dateOfBirth: "2007-02-19",
          email: "jerome.bautista.demo@bantug.edu.example",
          contactNumber: "+63 917 555 0788",
          address: "210 Luna St., West District (Sample Applicant Address)",
          applicantType: "Senior High School Graduate / Freshman",
          yearLevel: "Year 1",
          desiredProgram: "Bachelor of Science in Information Systems (BSIS)",
          secondChoiceProgram: "None",
          previousSchool: "West District Integrated High School (Sample)",
          educationalBackground: "General Academic Strand (GAS)",
          graduationYear: "2026",
          submittedDate: offsetDate(-10),
          status: "Rejected",
          isDemoRecord: true,
          remarks:
            "Sample Demo Record: Simulated status demonstrating an incomplete/rejected application state."
        },
        {
          id: "app_demo_5",
          referenceNumber: "BU-ADM-2026-10511",
          username: "h.delarosa",
          fullName: "Hannah Sophia Dela Rosa (Sample Demo Record)",
          dateOfBirth: "2007-09-12",
          email: "hannah.delarosa.demo@bantug.edu.example",
          contactNumber: "+63 917 555 0905",
          address: "54 Bonifacio St., Central Poblacion (Sample Applicant Address)",
          applicantType: "Senior High School Graduate / Freshman",
          yearLevel: "Year 1",
          desiredProgram: "Bachelor of Science in Information Technology (BSIT)",
          secondChoiceProgram: "Bachelor of Science in Computer Science (BSCS)",
          previousSchool: "Bantug Science High School (Sample)",
          educationalBackground: "STEM Strand - With High Honors",
          graduationYear: "2026",
          submittedDate: offsetDate(-2),
          status: "Pending",
          isDemoRecord: true,
          remarks: "Sample Demo Record: New BSIT freshman application awaiting faculty evaluation."
        },
        {
          id: "app_demo_6",
          referenceNumber: "BU-ADM-2026-10524",
          username: "m.castro",
          fullName: "Miguel Antonio Castro (Sample Demo Record)",
          dateOfBirth: "2007-04-03",
          email: "miguel.castro.demo@bantug.edu.example",
          contactNumber: "+63 917 555 0906",
          address: "19 Del Pilar St., North District (Sample Applicant Address)",
          applicantType: "Senior High School Graduate / Freshman",
          yearLevel: "Year 1",
          desiredProgram: "Bachelor of Science in Information Technology (BSIT)",
          secondChoiceProgram: "Bachelor of Science in Information Systems (BSIS)",
          previousSchool: "North District National High School (Sample)",
          educationalBackground: "TVL-ICT Strand (Computer Systems Servicing)",
          graduationYear: "2026",
          submittedDate: offsetDate(-4),
          status: "Under Review",
          isDemoRecord: true,
          remarks: "Sample Demo Record: Currently under review by IT Department Admissions Committee."
        },
        {
          id: "app_demo_7",
          referenceNumber: "BU-ADM-2026-10538",
          username: "k.mercado",
          fullName: "Katrina Mae Mercado (Sample Demo Record)",
          dateOfBirth: "2007-01-25",
          email: "katrina.mercado.demo@bantug.edu.example",
          contactNumber: "+63 917 555 0907",
          address: "72 Quezon Blvd., East Poblacion (Sample Applicant Address)",
          applicantType: "Senior High School Graduate / Freshman",
          yearLevel: "Year 1",
          desiredProgram: "Bachelor of Science in Information Technology (BSIT)",
          secondChoiceProgram: "Bachelor of Science in Business Administration (BSBA)",
          previousSchool: "Bantug Integrated Academy (Sample)",
          educationalBackground: "STEM Strand",
          graduationYear: "2026",
          submittedDate: offsetDate(-8),
          status: "Approved",
          isDemoRecord: true,
          remarks: "Sample Demo Record: Approved for Year 1 BSIT enrollment."
        },
        {
          id: "app_demo_8",
          referenceNumber: "BU-ADM-2026-10549",
          username: "l.domingo",
          fullName: "Lance Gabriel Domingo (Sample Demo Record)",
          dateOfBirth: "2006-12-11",
          email: "lance.domingo.demo@bantug.edu.example",
          contactNumber: "+63 917 555 0908",
          address: "105 Aguinaldo Highway, San Roque (Sample Applicant Address)",
          applicantType: "College Transferee",
          yearLevel: "Year 2",
          desiredProgram: "Bachelor of Science in Computer Science (BSCS)",
          secondChoiceProgram: "Bachelor of Science in Information Technology (BSIT)",
          previousSchool: "Central Valley College (Sample)",
          educationalBackground: "1st Year College Units (Incomplete TOR)",
          graduationYear: "2025",
          submittedDate: offsetDate(-11),
          status: "Rejected",
          isDemoRecord: true,
          remarks: "Sample Demo Record: Missing required honorable dismissal and complete transcript."
        },
        {
          id: "app_demo_9",
          referenceNumber: "BU-ADM-2026-10562",
          username: "t.salazar",
          fullName: "Trisha Nicole Salazar (Sample Demo Record)",
          dateOfBirth: "2007-07-08",
          email: "trisha.salazar.demo@bantug.edu.example",
          contactNumber: "+63 917 555 0909",
          address: "33 Zamora St., Brgy. San Jose (Sample Applicant Address)",
          applicantType: "Senior High School Graduate / Freshman",
          yearLevel: "Year 1",
          desiredProgram: "Bachelor of Science in Information Systems (BSIS)",
          secondChoiceProgram: "Bachelor of Science in Information Technology (BSIT)",
          previousSchool: "San Jose Senior High School (Sample)",
          educationalBackground: "ABM / ICT Track",
          graduationYear: "2026",
          submittedDate: offsetDate(-2),
          status: "Pending",
          isDemoRecord: true,
          remarks: "Sample Demo Record: Pending initial verification of Senior High School report card."
        },
        {
          id: "app_demo_10",
          referenceNumber: "BU-ADM-2026-10577",
          username: "v.pangilinan",
          fullName: "Vincent Paul Pangilinan (Sample Demo Record)",
          dateOfBirth: "2007-03-17",
          email: "vincent.pangilinan.demo@bantug.edu.example",
          contactNumber: "+63 917 555 0910",
          address: "64 Magsaysay Ave., South District (Sample Applicant Address)",
          applicantType: "Senior High School Graduate / Freshman",
          yearLevel: "Year 1",
          desiredProgram: "Bachelor of Science in Information Technology (BSIT)",
          secondChoiceProgram: "Bachelor of Science in Computer Science (BSCS)",
          previousSchool: "South District Regional High School (Sample)",
          educationalBackground: "TVL-ICT Strand (Web Development)",
          graduationYear: "2026",
          submittedDate: offsetDate(-5),
          status: "Under Review",
          isDemoRecord: true,
          remarks: "Sample Demo Record: Application under faculty evaluation for BSIT section placement."
        },
        {
          id: "app_demo_11",
          referenceNumber: "BU-ADM-2026-10583",
          username: "c.evangelista",
          fullName: "Clarisse Joy Evangelista (Sample Demo Record)",
          dateOfBirth: "2007-10-30",
          email: "clarisse.evangelista.demo@bantug.edu.example",
          contactNumber: "+63 917 555 0911",
          address: "18 Legazpi St., Poblacion West (Sample Applicant Address)",
          applicantType: "Senior High School Graduate / Freshman",
          yearLevel: "Year 1",
          desiredProgram: "Bachelor of Science in Business Administration (BSBA)",
          secondChoiceProgram: "Bachelor of Science in Information Systems (BSIS)",
          previousSchool: "Bantug Central High School (Sample)",
          educationalBackground: "ABM Strand - With Honors",
          graduationYear: "2026",
          submittedDate: offsetDate(-9),
          status: "Approved",
          isDemoRecord: true,
          remarks: "Sample Demo Record: Approved by Admissions & Department Committee."
        },
        {
          id: "app_demo_12",
          referenceNumber: "BU-ADM-2026-10590",
          username: "d.magno",
          fullName: "Daryl Christian Magno (Sample Demo Record)",
          dateOfBirth: "2006-06-21",
          email: "daryl.magno.demo@bantug.edu.example",
          contactNumber: "+63 917 555 0912",
          address: "91 Kalayaan Rd., Brgy. Sta. Maria (Sample Applicant Address)",
          applicantType: "Second Degree Applicant",
          yearLevel: "Year 3",
          desiredProgram: "Bachelor of Science in Information Technology (BSIT)",
          secondChoiceProgram: "None",
          previousSchool: "Eastern Provincial Institute (Sample)",
          educationalBackground: "Diploma in Technical Studies",
          graduationYear: "2024",
          submittedDate: offsetDate(-12),
          status: "Rejected",
          isDemoRecord: true,
          remarks: "Sample Demo Record: Did not meet prerequisite mathematics and programming credit units."
        },
        {
          id: "app_demo_13",
          referenceNumber: "BU-ADM-2026-10604",
          username: "n.galang",
          fullName: "Nadine Rose Galang (Sample Demo Record)",
          dateOfBirth: "2007-04-19",
          email: "nadine.galang.demo@bantug.edu.example",
          contactNumber: "+63 917 555 0913",
          address: "27 Tandang Sora St., Brgy. Maligaya (Sample Applicant Address)",
          applicantType: "Senior High School Graduate / Freshman",
          yearLevel: "Year 1",
          desiredProgram: "Bachelor of Secondary Education (BSED)",
          secondChoiceProgram: "Bachelor of Science in Information Technology (BSIT)",
          previousSchool: "Maligaya National High School (Sample)",
          educationalBackground: "HUMSS Strand",
          graduationYear: "2026",
          submittedDate: offsetDate(-1),
          status: "Pending",
          isDemoRecord: true,
          remarks: "Sample Demo Record: Submitted online application; queued for initial screening."
        },
        {
          id: "app_demo_14",
          referenceNumber: "BU-ADM-2026-10618",
          username: "a.vergara",
          fullName: "Adrian Kyle Vergara (Sample Demo Record)",
          dateOfBirth: "2007-08-05",
          email: "adrian.vergara.demo@bantug.edu.example",
          contactNumber: "+63 917 555 0914",
          address: "142 Jacinto St., Brgy. San Nicolas (Sample Applicant Address)",
          applicantType: "Senior High School Graduate / Freshman",
          yearLevel: "Year 1",
          desiredProgram: "Bachelor of Science in Information Technology (BSIT)",
          secondChoiceProgram: "Bachelor of Science in Computer Science (BSCS)",
          previousSchool: "San Nicolas Science High School (Sample)",
          educationalBackground: "STEM Strand",
          graduationYear: "2026",
          submittedDate: offsetDate(-6),
          status: "Under Review",
          isDemoRecord: true,
          remarks: "Sample Demo Record: Academic records verified; awaiting final department sign-off."
        },
        {
          id: "app_demo_15",
          referenceNumber: "BU-ADM-2026-10629",
          username: "f.lopez",
          fullName: "Francine Mae Lopez (Sample Demo Record)",
          dateOfBirth: "2007-11-16",
          email: "francine.lopez.demo@bantug.edu.example",
          contactNumber: "+63 917 555 0915",
          address: "309 Plaridel St., Central District (Sample Applicant Address)",
          applicantType: "Senior High School Graduate / Freshman",
          yearLevel: "Year 1",
          desiredProgram: "Bachelor of Science in Information Technology (BSIT)",
          secondChoiceProgram: "Bachelor of Science in Information Systems (BSIS)",
          previousSchool: "Bantug National High School - Senior High Dept. (Sample)",
          educationalBackground: "TVL-ICT Strand - With High Honors",
          graduationYear: "2026",
          submittedDate: offsetDate(-9),
          status: "Approved",
          isDemoRecord: true,
          remarks: "Sample Demo Record: Approved for admission into BSIT program (AY 2026–2027)."
        }
      ],

      // 14. Custom University Schedule Offerings Added via Faculty Schedule Manager (Persisted in MySQL)
      customUniversitySubjects: [],

      // 15. Portal Settings
      settings: {
        theme: "light",
        sidebarCollapsed: false,
        deadlineReminders: true,
        unreadBadges: true,
        defaultScheduleView: "weekly",
        targetGradeGoal: 90,
        customLogoDataUrl: ""
      }
    };
  }

  /**
   * Normalize tasks so any task without a submission ("Pending") whose deadline is before today
   * is marked "Overdue", while "Submitted" and "Completed" tasks retain their status.
   */
  function normalizeTasks(tasks, primaryStudentNo = "2025-BSIT-0202") {
    if (!Array.isArray(tasks)) return [];
    const todayStr = formatLocalDate(new Date());
    return tasks.map((task) => {
      const updated = {
        ...task,
        submissions: task.submissions && typeof task.submissions === "object" ? task.submissions : {}
      };

      // Sync student submission status if recorded in submissions[primaryStudentNo]
      const studentSub = updated.submissions[primaryStudentNo];
      if (studentSub && (studentSub.status === "Submitted" || studentSub.status === "Completed")) {
        updated.status = studentSub.status;
      }

      // Normalize legacy "In Progress" to "Pending"
      if (!["Pending", "Submitted", "Completed", "Overdue"].includes(updated.status)) {
        updated.status = "Pending";
      }

      if (updated.status !== "Completed" && updated.status !== "Submitted") {
        if (updated.deadline && updated.deadline < todayStr) {
          updated.status = "Overdue";
        } else if (updated.status === "Overdue" && updated.deadline >= todayStr) {
          updated.status = "Pending";
        }
      }
      return updated;
    });
  }

  /**
   * Ensure the 9 BSIT 2-2 subjects always carry their official Monday-to-Friday timetable sessions
   * and no invented schedules exist.
   */
  function ensureOfficialTimetableOnSubjects(subjectsList) {
    const officialSubjects = getInitialSubjects();
    const officialMap = {};
    officialSubjects.forEach((s) => {
      officialMap[s.subjectCode] = s;
    });

    if (!Array.isArray(subjectsList) || subjectsList.length === 0) {
      return officialSubjects;
    }

    return officialSubjects.map((official) => {
      const existing = subjectsList.find((item) => item.subjectCode === official.subjectCode);
      if (!existing) {
        return { ...official };
      }
      return {
        ...existing,
        id: official.id,
        subjectCode: official.subjectCode,
        courseCode: official.courseCode,
        subjectName: official.subjectName,
        fullSubjectName: official.fullSubjectName || `${official.courseCode} – ${official.subjectName}`,
        instructor: official.instructor,
        course: official.course || "Bachelor of Science in Information Technology",
        yearLevel: official.yearLevel || "Year 2",
        section: "BSIT 2-2",
        units: official.units,
        day: official.day,
        startTime: official.startTime,
        endTime: official.endTime,
        room: official.room,
        scheduleSummary: official.scheduleSummary,
        sessions: official.sessions.map((sess) => ({ ...sess }))
      };
    });
  }

  /**
   * Validate and repair loaded data object, upgrading older schemas to Revision 3 schema
   */
  function ensureValidSchema(raw) {
    const defaults = getDefaultData();
    if (!raw || typeof raw !== "object" || raw.schemaVersion !== SCHEMA_VERSION) {
      if (raw && typeof raw === "object") {
        // Preserve user's theme/logo preferences when migrating to Revision 3 schema
        if (raw.settings && typeof raw.settings === "object") {
          defaults.settings = { ...defaults.settings, ...raw.settings };
        }
      }
      return defaults;
    }

    const syncedSchedules = ensureOfficialTimetableOnSubjects(raw.schedules);
    const syncedGrades = ensureOfficialTimetableOnSubjects(raw.grades);

    const mergedProfile =
      raw.profile && typeof raw.profile === "object"
        ? { ...defaults.profile, ...raw.profile }
        : defaults.profile;
    mergedProfile.yearLevel = normalizeYearLevel(mergedProfile.yearLevel, "Year 2");

    const mergedFacultyProfile =
      raw.facultyProfile && typeof raw.facultyProfile === "object"
        ? { ...defaults.facultyProfile, ...raw.facultyProfile }
        : defaults.facultyProfile;
    if (
      !mergedFacultyProfile.activeInstructorFilter ||
      mergedFacultyProfile.activeInstructorFilter === "All BSIT 2-2 Faculty"
    ) {
      mergedFacultyProfile.activeInstructorFilter =
        mergedFacultyProfile.fullName || "Somera, Fabian";
    }

    const normalizedRoster = (
      Array.isArray(raw.sectionRoster) ? raw.sectionRoster : defaults.sectionRoster
    ).map((st) => ({
      ...st,
      yearLevel: normalizeYearLevel(st.yearLevel, "Year 2")
    }));

    const normalizedApps = (Array.isArray(raw.applications) ? raw.applications : []).map((app) => ({
      ...app,
      yearLevel: normalizeYearLevel(app.yearLevel, "Year 1")
    }));

    const normalizedDemoApps = (
      Array.isArray(raw.demoApplicantRecords) && raw.demoApplicantRecords.length > 0
        ? raw.demoApplicantRecords
        : defaults.demoApplicantRecords
    ).map((app) => ({
      ...app,
      isDemoRecord: true,
      yearLevel: normalizeYearLevel(app.yearLevel, "Year 1")
    }));

    return {
      schemaVersion: SCHEMA_VERSION,
      profile: mergedProfile,
      facultyProfile: mergedFacultyProfile,
      facultyDirectory: Array.isArray(raw.facultyDirectory)
        ? raw.facultyDirectory
        : defaults.facultyDirectory,
      sectionRoster: normalizedRoster,
      facultyGrades:
        raw.facultyGrades && typeof raw.facultyGrades === "object"
          ? raw.facultyGrades
          : defaults.facultyGrades,
      facultyAttendanceLogs: Array.isArray(raw.facultyAttendanceLogs)
        ? raw.facultyAttendanceLogs
        : defaults.facultyAttendanceLogs,
      gradingWeights:
        raw.gradingWeights && typeof raw.gradingWeights === "object"
          ? { ...defaults.gradingWeights, ...raw.gradingWeights }
          : defaults.gradingWeights,
      schedules: syncedSchedules,
      customUniversitySubjects: Array.isArray(raw.customUniversitySubjects)
        ? raw.customUniversitySubjects
        : [],
      grades: syncedGrades,
      attendance: Array.isArray(raw.attendance) ? raw.attendance : defaults.attendance,
      tasks: Array.isArray(raw.tasks)
        ? normalizeTasks(raw.tasks, mergedProfile.studentNumber || "2025-BSIT-0202")
        : normalizeTasks(defaults.tasks),
      announcements: Array.isArray(raw.announcements)
        ? raw.announcements.map((a) => ({
          ...a,
          published: a.published !== false
        }))
        : defaults.announcements,
      resources: Array.isArray(raw.resources) ? raw.resources : defaults.resources,
      applications: normalizedApps,
      demoApplicantProfile:
        raw.demoApplicantProfile && typeof raw.demoApplicantProfile === "object"
          ? {
            ...defaults.demoApplicantProfile,
            ...raw.demoApplicantProfile,
            yearLevel: normalizeYearLevel(raw.demoApplicantProfile.yearLevel, "Year 1")
          }
          : defaults.demoApplicantProfile,
      demoApplicantRecords: normalizedDemoApps,
      settings:
        raw.settings && typeof raw.settings === "object"
          ? { ...defaults.settings, ...raw.settings }
          : defaults.settings
    };
  }

  /**
   * Load entire portal state from localStorage
   */
  function loadState() {
    try {
      const serialized = localStorage.getItem(STORAGE_KEY);
      if (!serialized) {
        const initial = ensureValidSchema(getDefaultData());
        localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
        return initial;
      }
      const parsed = JSON.parse(serialized);
      const validated = ensureValidSchema(parsed);
      if (!parsed || parsed.schemaVersion !== SCHEMA_VERSION) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(validated));
      }
      return validated;
    } catch (err) {
      console.warn(
        "StudentHubStorage: Recovering localStorage with default BANTUG UNIVERSITY dataset.",
        err
      );
      const fallback = ensureValidSchema(getDefaultData());
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(fallback));
      } catch (_) { }
      return fallback;
    }
  }

  /**
   * Role-Based Permission Matrix & Validation
   */
  const PERMISSION_MATRIX = {
    student: {
      viewDashboard: true,
      editOwnProfile: true,
      viewSubjects: true,
      manageSubjects: false,
      viewClassSchedule: true,
      manageGrades: false,
      viewGrades: true,
      manageAttendance: false,
      viewAttendance: true,
      createAnnouncements: false,
      viewAnnouncements: true,
      createAssignments: false,
      editAssignments: false,
      submitAssignments: true,
      markTasksCompleted: true,
      viewLearningResources: true,
      manageApplications: false
    },
    faculty: {
      viewDashboard: true,
      editOwnProfile: true,
      viewSubjects: true,
      manageSubjects: true,
      viewClassSchedule: true,
      manageGrades: true,
      viewGrades: true,
      manageAttendance: true,
      viewAttendance: true,
      createAnnouncements: true,
      viewAnnouncements: true,
      createAssignments: true,
      editAssignments: true,
      submitAssignments: false,
      markTasksCompleted: false,
      viewLearningResources: true,
      manageApplications: true
    },
    applicant: {
      viewDashboard: false,
      editOwnProfile: false,
      viewSubjects: false,
      manageSubjects: false,
      viewClassSchedule: false,
      manageGrades: false,
      viewGrades: false,
      manageAttendance: false,
      viewAttendance: false,
      createAnnouncements: false,
      viewAnnouncements: false,
      createAssignments: false,
      editAssignments: false,
      submitAssignments: false,
      markTasksCompleted: false,
      viewLearningResources: false,
      manageApplications: false
    }
  };

  function getActiveRole() {
    const session = getSession();
    return session && session.role ? session.role : "student";
  }

  function hasPermission(permissionKey, roleOverride = null) {
    const role = roleOverride || getActiveRole();
    const rolePerms = PERMISSION_MATRIX[role] || PERMISSION_MATRIX.student;
    return Boolean(rolePerms[permissionKey]);
  }

  /**
   * Save entire portal state to localStorage with role-based data protection
   * Prevents a logged-in student from altering grades, attendance, schedule, faculty announcements, or applicant records
   */
  function saveState(state, options = {}) {
    try {
      const current = loadState();
      const activeRole = getActiveRole();

      if (activeRole === "student" && !options.systemReset) {
        // Students have strictly READ-ONLY access to grades, attendance, schedules, and cannot modify applications
        state.grades = current.grades;
        state.facultyGrades = current.facultyGrades;
        state.gradingWeights = current.gradingWeights;
        state.attendance = current.attendance;
        state.facultyAttendanceLogs = current.facultyAttendanceLogs;
        state.schedules = current.schedules;
        state.applications = current.applications;
        state.demoApplicantRecords = current.demoApplicantRecords;

        // Students can only mark announcements as read/unread, not create/edit/delete/publish
        const readMap = {};
        if (Array.isArray(state.announcements)) {
          state.announcements.forEach((a) => {
            if (a && a.id) readMap[a.id] = Boolean(a.read);
          });
        }
        state.announcements = current.announcements.map((orig) => ({
          ...orig,
          read: orig.id in readMap ? readMap[orig.id] : orig.read
        }));

        // Students can only update submission/completion status on existing faculty tasks
        const incomingTasksMap = {};
        if (Array.isArray(state.tasks)) {
          state.tasks.forEach((t) => {
            if (t && t.id) incomingTasksMap[t.id] = t;
          });
        }
        state.tasks = current.tasks.map((origTask) => {
          const inc = incomingTasksMap[origTask.id];
          if (!inc) return origTask;
          return {
            ...origTask,
            status: inc.status || origTask.status,
            submissions: inc.submissions || origTask.submissions || {}
          };
        });
      }

      if (state && state.profile) {
        state.profile.yearLevel = normalizeYearLevel(
          state.profile.yearLevel,
          current.profile?.yearLevel || "Year 2"
        );
      }

      if (state && Array.isArray(state.sectionRoster)) {
        state.sectionRoster = state.sectionRoster.map((st) => ({
          ...st,
          yearLevel: normalizeYearLevel(st.yearLevel, "Year 2")
        }));
      }

      if (state && Array.isArray(state.applications)) {
        state.applications = state.applications.map((app) => ({
          ...app,
          status: app.status || "Pending",
          yearLevel: normalizeYearLevel(app.yearLevel, "Year 1")
        }));
      }

      if (state && Array.isArray(state.demoApplicantRecords)) {
        state.demoApplicantRecords = state.demoApplicantRecords.map((app) => ({
          ...app,
          isDemoRecord: true,
          status: app.status === "Submitted" ? "Pending" : app.status || "Pending",
          yearLevel: normalizeYearLevel(app.yearLevel, "Year 1")
        }));
      }

      if (state && Array.isArray(state.tasks)) {
        state.tasks = normalizeTasks(
          state.tasks,
          state.profile?.studentNumber || "2025-BSIT-0202"
        );
      }

      state.schemaVersion = SCHEMA_VERSION;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      if (!options.skipNetworkSync) {
        syncToXamppDatabase(state);
      }
      return true;
    } catch (err) {
      console.error("StudentHubStorage: Failed to save state.", err);
      return false;
    }
  }

  /**
   * MySQL Database Synchronization (Node.js + MySQL primary backend at /api/*)
   */
  const XAMPP_API_CANDIDATES = [
    "/api/portal",
    "http://localhost:3000/api/portal"
  ];
  let activeXamppApiUrl = null;

  function canUseFetch() {
    return typeof window !== "undefined" && typeof fetch === "function";
  }

  function getCandidateApiUrls() {
    if (activeXamppApiUrl) {
      return [activeXamppApiUrl];
    }
    const isFileProtocol =
      typeof window !== "undefined" && window.location && window.location.protocol === "file:";
    return isFileProtocol
      ? XAMPP_API_CANDIDATES.filter((url) => url.startsWith("http"))
      : XAMPP_API_CANDIDATES;
  }

  function getApiBaseOrigin() {
    if (activeXamppApiUrl && activeXamppApiUrl.startsWith("http")) {
      return activeXamppApiUrl.replace(/\/api\/portal.*$/, "");
    }
    if (typeof window !== "undefined" && window.location && window.location.protocol.startsWith("http")) {
      return "";
    }
    return "http://localhost:3000";
  }

  /**
   * Build authentication & role-identification headers from the active session
   * so the Node.js + MySQL backend can verify session tokens and enforce RBAC.
   */
  function getAuthHeaders() {
    const sess = getSession();
    if (!sess) return {};
    const headers = {
      "X-Portal-Role": String(sess.role || ""),
      "X-Portal-User": String(sess.displayName || sess.identifier || ""),
      "X-Portal-Actor-Id": String(sess.actorId || sess.identifier || "")
    };
    if (sess.sessionToken) {
      headers["Authorization"] = `Bearer ${sess.sessionToken}`;
      headers["X-Portal-Token"] = String(sess.sessionToken);
    }
    return headers;
  }

  /**
   * Call a Node.js backend REST endpoint and wait for MySQL confirmation.
   */
  async function requestBackendJson(pathOrUrl, options = {}) {
    if (!canUseFetch()) {
      return { ok: false, error: "Browser fetch API is unavailable." };
    }
    const baseOrigin = getApiBaseOrigin();
    const rawCandidates = pathOrUrl.startsWith("http")
      ? [pathOrUrl]
      : [
          ...(baseOrigin ? [`${baseOrigin}${pathOrUrl}`] : []),
          ...(typeof window !== "undefined" &&
          window.location &&
          window.location.protocol.startsWith("http")
            ? [pathOrUrl]
            : []),
          `http://localhost:3000${pathOrUrl}`,
          `http://127.0.0.1:3000${pathOrUrl}`
        ];
    const candidateUrls = [...new Set(rawCandidates)];

    let lastError = "Could not connect to the Node.js + MySQL server at http://localhost:3000.";

    for (const url of candidateUrls) {
      try {
        const res = await fetch(url, {
          method: options.method || "GET",
          headers: {
            "Content-Type": "application/json",
            ...getAuthHeaders(),
            ...(options.headers || {})
          },
          body: options.body ? JSON.stringify(options.body) : undefined
        });

        const ct = res.headers.get("content-type") || "";
        if (!ct.includes("application/json")) {
          // If served by static Apache/Live Server (non-JSON 404/405), try the next candidate URL
          lastError = `Endpoint ${url} did not return JSON (HTTP ${res.status}).`;
          continue;
        }
        const data = await res.json();

        if (!res.ok || !data || !data.ok) {
          return {
            ok: false,
            status: res.status,
            error: (data && data.message) || `Database request failed (HTTP ${res.status}).`,
            fieldErrors: (data && data.fieldErrors) || null,
            duplicate: Boolean(data && data.duplicate),
            data
          };
        }

        return { ok: true, status: res.status, data };
      } catch (err) {
        lastError = err.message || lastError;
      }
    }

    return { ok: false, error: lastError };
  }

  /**
   * Authenticate credentials against MySQL `users` table (`POST /api/auth/login`)
   * and receive a server-side session token.
   */
  async function loginWithDatabase(credentials) {
    return await requestBackendJson("/api/auth/login", {
      method: "POST",
      body: credentials
    });
  }

  /**
   * Invalidate the active server-side session token (`POST /api/auth/logout`).
   */
  async function logoutFromDatabase() {
    const sess = getSession();
    return await requestBackendJson("/api/auth/logout", {
      method: "POST",
      body: {
        sessionToken: sess?.sessionToken || null,
        role: sess?.role || null,
        actorName: sess?.displayName || sess?.identifier || null
      }
    });
  }

  /**
   * Fetch recent system audit logs from MySQL (`GET /api/audit-logs`).
   * Restricted to Faculty / Administrator roles.
   */
  async function fetchAuditLogsFromDatabase(limit = 80) {
    const res = await requestBackendJson(`/api/audit-logs?limit=${encodeURIComponent(limit)}`);
    if (res.ok && res.data && Array.isArray(res.data.auditLogs)) {
      const state = loadState();
      state.auditLogs = res.data.auditLogs;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      return { ok: true, auditLogs: res.data.auditLogs };
    }
    return { ok: false, error: res.error || "Could not load audit trail.", auditLogs: [] };
  }

  function syncToXamppDatabase(state) {
    if (!canUseFetch()) return;
    const payload = JSON.stringify({ state });
    const urls = getCandidateApiUrls();

    urls.forEach((baseUrl) => {
      try {
        fetch(`${baseUrl}?action=save`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...getAuthHeaders()
          },
          body: payload
        })
          .then((res) => {
            if (!res || !res.ok) return null;
            const ct = res.headers.get("content-type") || "";
            return ct.includes("application/json") ? res.json() : null;
          })
          .then((data) => {
            if (data && data.ok) {
              activeXamppApiUrl = baseUrl;
            }
          })
          .catch(() => {});
      } catch (_) {}
    });
  }

  /**
   * Load authoritative state, applications, and announcements from MySQL
   */
  async function loadFromXamppDatabase() {
    if (!canUseFetch()) return null;
    const urls = getCandidateApiUrls();

    for (const baseUrl of urls) {
      try {
        const res = await fetch(`${baseUrl}?action=load`, {
          headers: {
            ...getAuthHeaders()
          }
        });
        if (!res || !res.ok) continue;
        const ct = res.headers.get("content-type") || "";
        if (!ct.includes("application/json")) continue;
        const data = await res.json();
        if (!data || !data.ok) continue;

        activeXamppApiUrl = baseUrl;

        const localCurrent = loadState();
        const activeSession = getSession();
        const baseState =
          data.state && typeof data.state === "object" && data.schemaVersion === SCHEMA_VERSION
            ? ensureValidSchema(data.state)
            : localCurrent;

        // Preserve the currently logged-in student or faculty profile so background DB loads
        // never clobber an active user session.
        if (activeSession && activeSession.role === "student" && localCurrent.profile) {
          baseState.profile = localCurrent.profile;
        }
        if (activeSession && activeSession.role === "faculty" && localCurrent.facultyProfile) {
          baseState.facultyProfile = localCurrent.facultyProfile;
        }

        if (Array.isArray(data.applications) && data.applications.length > 0) {
          mergeApplicationsFromDatabase(baseState, data.applications);
        }
        if (Array.isArray(data.announcements) && data.announcements.length > 0) {
          mergeAnnouncementsFromDatabase(baseState, data.announcements);
        }
        if (Array.isArray(data.schedules) && data.schedules.length > 0) {
          mergeSchedulesFromDatabase(baseState, data.schedules);
        }
        if (Array.isArray(data.auditLogs)) {
          baseState.auditLogs = data.auditLogs;
        }

        localStorage.setItem(STORAGE_KEY, JSON.stringify(baseState));

        if (!data.state || data.schemaVersion !== SCHEMA_VERSION) {
          syncToXamppDatabase(baseState);
        }

        if (window.StudentHubApp && typeof window.StudentHubApp.refreshAll === "function") {
          window.StudentHubApp.refreshAll();
        }
        return baseState;
      } catch (_) {}
    }
    return null;
  }

  /**
   * Merge application records retrieved from MySQL `applications` table into portal state
   */
  function mergeApplicationsFromDatabase(stateObj, dbApps) {
    if (!stateObj || !Array.isArray(dbApps)) return;
    const demoRefs = new Set((stateObj.demoApplicantRecords || []).map((r) => r.referenceNumber));
    const updatedDemo = (stateObj.demoApplicantRecords || []).map((demoRec) => {
      const dbMatch = dbApps.find((d) => d.referenceNumber === demoRec.referenceNumber);
      if (!dbMatch) return demoRec;
      return {
        ...demoRec,
        status: dbMatch.status === "Submitted" ? "Pending" : dbMatch.status || demoRec.status,
        remarks: dbMatch.remarks || demoRec.remarks,
        updatedBy: dbMatch.updatedBy || demoRec.updatedBy || null,
        statusUpdatedAt: dbMatch.statusUpdatedAt || demoRec.statusUpdatedAt || null
      };
    });
    stateObj.demoApplicantRecords = updatedDemo;

    const publicApps = dbApps
      .filter((dbApp) => dbApp && dbApp.referenceNumber && !demoRefs.has(dbApp.referenceNumber) && !dbApp.isDemoRecord)
      .map((dbApp) => ({
        ...dbApp,
        isDemoRecord: false,
        status: dbApp.status === "Submitted" ? "Pending" : dbApp.status || "Pending",
        updatedBy: dbApp.updatedBy || null,
        statusUpdatedAt: dbApp.statusUpdatedAt || null
      }));

    stateObj.applications = publicApps;
  }

  /**
   * Merge announcement records retrieved from MySQL `announcements` table into portal state
   */
  function mergeAnnouncementsFromDatabase(stateObj, dbAnns) {
    if (!stateObj || !Array.isArray(dbAnns)) return;
    stateObj.announcements = dbAnns.map((a) => ({
      id: a.id || a.announcementId,
      announcementId: a.announcementId || a.id,
      title: a.title || "",
      category: a.category || "Academic",
      date: a.date || formatLocalDate(new Date()),
      author: a.author || "BANTUG UNIVERSITY Faculty",
      facultyId: a.facultyId || "FAC-BU-04",
      targetAudience: a.targetAudience || "All BSIT Students",
      description: a.description || "",
      published: a.published !== false,
      read: Boolean(a.read),
      createdAt: a.createdAt || null
    }));
  }

  /**
   * Submit a new public student application directly to MySQL (`POST /api/applications`).
   * Resolves with `{ ok: true, application }` ONLY after MySQL confirms insertion.
   */
  async function submitApplicationToDatabase(appPayload) {
    const response = await requestBackendJson("/api/applications", {
      method: "POST",
      body: appPayload
    });

    if (!response.ok || !response.data || !response.data.application) {
      return {
        ok: false,
        error: response.error || "Failed to save application to MySQL database.",
        fieldErrors: response.fieldErrors || null,
        duplicate: Boolean(response.duplicate)
      };
    }

    const savedApp = response.data.application;
    const state = loadState();
    if (!Array.isArray(state.applications)) {
      state.applications = [];
    }
    state.applications = [
      savedApp,
      ...state.applications.filter((a) => a.referenceNumber !== savedApp.referenceNumber)
    ];
    saveState(state, { systemReset: true, skipNetworkSync: true });

    return {
      ok: true,
      application: savedApp,
      message: response.data.message
    };
  }

  /**
   * Return all submitted applications (15 preloaded records + any new Applicant Portal submissions)
   * for the Faculty Portal -> Student Applications module.
   */
  function getAllApplicationsForFaculty(customState = null) {
    const state = customState || loadState();
    const userApps = (state.applications || []).map((app) => ({
      ...app,
      status: app.status === "Submitted" ? "Pending" : app.status || "Pending",
      isDemoRecord: Boolean(app.isDemoRecord)
    }));
    const demoApps = (state.demoApplicantRecords || []).map((app) => ({
      ...app,
      status: app.status === "Submitted" ? "Pending" : app.status || "Pending",
      isDemoRecord: true
    }));

    const seenRefs = new Set();
    const combined = [];

    userApps.forEach((a) => {
      if (a && a.referenceNumber && !seenRefs.has(a.referenceNumber)) {
        seenRefs.add(a.referenceNumber);
        combined.push(a);
      }
    });

    demoApps.forEach((a) => {
      if (a && a.referenceNumber && !seenRefs.has(a.referenceNumber)) {
        seenRefs.add(a.referenceNumber);
        combined.push(a);
      }
    });

    return combined.sort((a, b) => {
      if (a.isDemoRecord !== b.isDemoRecord) {
        return a.isDemoRecord ? 1 : -1;
      }
      return (b.submittedDate || "").localeCompare(a.submittedDate || "");
    });
  }

  /**
   * Update an application's status ("Pending" | "Under Review" | "Approved" | "Rejected")
   * Authorized for Faculty accounts only; awaits MySQL confirmation before resolving.
   */
  async function updateApplicationStatusInDatabase(referenceNumber, newStatus, facultyRemarks = null) {
    if (getActiveRole() !== "faculty") {
      return { ok: false, error: "Only authorized faculty members can update application statuses." };
    }
    const normalizedStatus =
      newStatus === "Submitted"
        ? "Pending"
        : VALID_APPLICATION_STATUSES.includes(newStatus)
          ? newStatus
          : "Pending";

    const state = loadState();
    const response = await requestBackendJson(
      `/api/applications/${encodeURIComponent(referenceNumber)}/status`,
      {
        method: "PUT",
        body: {
          referenceNumber,
          status: normalizedStatus,
          remarks: facultyRemarks,
          updatedBy: state.facultyProfile?.fullName || "Faculty"
        }
      }
    );

    if (!response.ok || !response.data) {
      return {
        ok: false,
        error: response.error || "Failed to update application status in MySQL."
      };
    }

    const confirmedApp = response.data.application;
    let updatedRecord = confirmedApp || null;

    state.applications = (state.applications || []).map((app) => {
      if (app.referenceNumber === referenceNumber) {
        updatedRecord = {
          ...app,
          ...(confirmedApp || {}),
          status: normalizedStatus,
          remarks:
            facultyRemarks !== null && facultyRemarks !== undefined && String(facultyRemarks).trim() !== ""
              ? String(facultyRemarks).trim()
              : confirmedApp?.remarks || app.remarks
        };
        return updatedRecord;
      }
      return app;
    });

    state.demoApplicantRecords = (state.demoApplicantRecords || []).map((app) => {
      if (app.referenceNumber === referenceNumber) {
        updatedRecord = {
          ...app,
          ...(confirmedApp || {}),
          isDemoRecord: true,
          status: normalizedStatus,
          remarks:
            facultyRemarks !== null && facultyRemarks !== undefined && String(facultyRemarks).trim() !== ""
              ? String(facultyRemarks).trim()
              : confirmedApp?.remarks || app.remarks
        };
        return updatedRecord;
      }
      return app;
    });

    saveState(state, { systemReset: true, skipNetworkSync: true });

    return {
      ok: true,
      record: updatedRecord,
      message: response.data.message
    };
  }

  /**
   * Synchronous/Promise wrapper kept for backward compatibility; triggers `updateApplicationStatusInDatabase`
   */
  function updateApplicationStatusByFaculty(referenceNumber, newStatus, facultyRemarks = null) {
    return updateApplicationStatusInDatabase(referenceNumber, newStatus, facultyRemarks);
  }

  /**
   * Create a new faculty announcement in MySQL (`POST /api/announcements`).
   * Resolves with `{ ok: true, announcement }` ONLY after MySQL confirms insertion.
   */
  async function createAnnouncementInDatabase(annPayload) {
    if (getActiveRole() !== "faculty") {
      return { ok: false, error: "Only authorized faculty members can create announcements." };
    }

    const state = loadState();
    const payload = {
      id: annPayload.id || uid("ann"),
      title: annPayload.title,
      category: annPayload.category || "Academic",
      date: annPayload.date || formatLocalDate(new Date()),
      author: annPayload.author || `${state.facultyProfile?.fullName || "Faculty"} • ${state.facultyProfile?.department || "IT Department"}`,
      facultyId: annPayload.facultyId || state.facultyProfile?.facultyId || "FAC-BU-04",
      targetAudience: annPayload.targetAudience || "All BSIT Students",
      description: annPayload.description,
      published: annPayload.published !== false,
      read: false
    };

    const response = await requestBackendJson("/api/announcements", {
      method: "POST",
      body: payload
    });

    if (!response.ok || !response.data || !response.data.announcement) {
      return {
        ok: false,
        error: response.error || "Failed to save announcement to MySQL database.",
        fieldErrors: response.fieldErrors || null
      };
    }

    const savedAnn = response.data.announcement;
    state.announcements = [
      savedAnn,
      ...(state.announcements || []).filter((a) => a.id !== savedAnn.id)
    ];
    saveState(state, { systemReset: true, skipNetworkSync: true });

    return {
      ok: true,
      announcement: savedAnn,
      message: response.data.message
    };
  }

  /**
   * Update an existing announcement in MySQL (`PUT /api/announcements/:id`).
   * Supports full edits by faculty, publish/unpublish toggles by faculty, and read/unread toggles by students.
   */
  async function updateAnnouncementInDatabase(annId, updates) {
    const response = await requestBackendJson(`/api/announcements/${encodeURIComponent(annId)}`, {
      method: "PUT",
      body: { id: annId, ...updates }
    });

    if (!response.ok || !response.data || !response.data.announcement) {
      return {
        ok: false,
        error: response.error || "Failed to update announcement in MySQL database."
      };
    }

    const updatedAnn = response.data.announcement;
    const state = loadState();
    state.announcements = (state.announcements || []).map((a) =>
      a.id === annId ? { ...a, ...updatedAnn } : a
    );
    saveState(state, { systemReset: true, skipNetworkSync: true });

    return {
      ok: true,
      announcement: updatedAnn,
      message: response.data.message
    };
  }

  /**
   * Delete an announcement from MySQL (`DELETE /api/announcements/:id`).
   */
  async function deleteAnnouncementInDatabase(annId) {
    if (getActiveRole() !== "faculty") {
      return { ok: false, error: "Only authorized faculty members can delete announcements." };
    }

    const response = await requestBackendJson(`/api/announcements/${encodeURIComponent(annId)}`, {
      method: "DELETE"
    });

    if (!response.ok) {
      return {
        ok: false,
        error: response.error || "Failed to delete announcement from MySQL database."
      };
    }

    const state = loadState();
    state.announcements = (state.announcements || []).filter((a) => a.id !== annId);
    saveState(state, { systemReset: true, skipNetworkSync: true });

    return {
      ok: true,
      deletedId: annId,
      message: response.data?.message || "Announcement deleted from MySQL."
    };
  }

  /**
   * Mark all published announcements as read in MySQL (`POST /api/portal?action=mark_all_announcements_read`).
   */
  async function markAllAnnouncementsReadInDatabase() {
    const response = await requestBackendJson("/api/portal?action=mark_all_announcements_read", {
      method: "POST",
      body: {}
    });

    if (!response.ok) {
      return {
        ok: false,
        error: response.error || "Failed to mark announcements as read in MySQL."
      };
    }

    const state = loadState();
    if (Array.isArray(response.data?.announcements)) {
      mergeAnnouncementsFromDatabase(state, response.data.announcements);
    } else {
      state.announcements = (state.announcements || []).map((a) => ({ ...a, read: true }));
    }
    saveState(state, { systemReset: true, skipNetworkSync: true });

    return { ok: true };
  }

  /**
   * Check whether a subject grade record has numeric component grades entered
   */
  function hasRecordedGrade(gradeRecord) {
    if (!gradeRecord) return false;
    const fields = ["quizzes", "assignments", "activities", "projects", "examinations"];
    return fields.some(
      (f) => gradeRecord[f] !== null && gradeRecord[f] !== undefined && gradeRecord[f] !== ""
    );
  }

  /**
   * Check whether a schedule record has sessions or day/time assigned
   */
  function hasScheduleProvided(schedRecord) {
    if (!schedRecord) return false;
    if (Array.isArray(schedRecord.sessions) && schedRecord.sessions.length > 0) {
      return true;
    }
    return Boolean(
      schedRecord.day &&
      schedRecord.day.trim() !== "" &&
      schedRecord.startTime &&
      schedRecord.endTime
    );
  }

  /**
   * Merge university schedule records retrieved from MySQL `subject_schedules` & `subjects`
   * into `stateObj.customUniversitySubjects` without altering the 9 official BSIT 2-2 subjects.
   */
  function mergeSchedulesFromDatabase(stateObj, dbSchedules) {
    if (!stateObj || !Array.isArray(dbSchedules)) return;

    const officialCodes = new Set(getInitialSubjects().map((s) => s.subjectCode));
    const defaultExtCodes = new Set(getExtendedCatalogSubjects().map((s) => s.subjectCode));
    const defaultExtSessionKeys = new Set();
    getExtendedCatalogSubjects().forEach((sub) => {
      (sub.sessions || []).forEach((sess) => {
        defaultExtSessionKeys.add(`${sub.subjectCode}|${sub.section}|${sess.day}|${sess.startTime}|${sess.endTime}`);
      });
    });

    const officialSessionKeys = new Set();
    getInitialSubjects().forEach((sub) => {
      (sub.sessions || []).forEach((sess) => {
        officialSessionKeys.add(`${sub.subjectCode}|${sub.section}|${sess.day}|${sess.startTime}|${sess.endTime}`);
      });
    });

    const groupedCustom = new Map();

    dbSchedules.forEach((row) => {
      if (!row || !row.subjectCode || !row.day || !row.startTime || !row.endTime) return;
      const section = row.section || "BSIT 2-2";
      const sessKey = `${row.subjectCode}|${section}|${row.day}|${row.startTime}|${row.endTime}`;

      // Skip official BSIT 2-2 default sessions and built-in extended catalog default sessions
      if (officialSessionKeys.has(sessKey) || defaultExtSessionKeys.has(sessKey)) {
        return;
      }

      const groupKey = `${row.subjectCode}__${section}__${row.instructor || ""}`;
      if (!groupedCustom.has(groupKey)) {
        groupedCustom.set(groupKey, {
          id: `sub_custom_${String(row.subjectCode).toLowerCase()}_${String(section).replace(/\s+/g, "").toLowerCase()}`,
          subjectCode: row.subjectCode,
          courseCode: row.courseCode || row.subjectCode,
          subjectName: row.subjectName || row.subjectCode,
          fullSubjectName: `${row.courseCode || row.subjectCode} – ${row.subjectName || row.subjectCode}`,
          instructor: row.instructor || "Not specified",
          facultyId: row.facultyId || null,
          course: "Bachelor of Science in Information Technology",
          yearLevel: normalizeYearLevel(row.yearLevel, "Year 2"),
          section,
          units: Number(row.units) || 3,
          isSampleData: row.isSampleData !== false,
          isCustomDbSchedule: true,
          day: row.day,
          startTime: row.startTime,
          endTime: row.endTime,
          room: row.room || "Room 1",
          scheduleSummary: `${row.day.slice(0, 3)} ${row.timeLabel || formatTimeRangeLabel(row.startTime, row.endTime)} (${row.room || "Room 1"})`,
          sessions: []
        });
      }

      const targetSub = groupedCustom.get(groupKey);
      targetSub.sessions.push({
        scheduleId: row.scheduleId || row.id || null,
        day: row.day,
        startTime: row.startTime,
        endTime: row.endTime,
        timeLabel: row.timeLabel || formatTimeRangeLabel(row.startTime, row.endTime),
        room: row.room || "Room 1",
        classType: row.classType || getClassTypeForSession(targetSub, row),
        isCustomDbSchedule: true
      });
      targetSub.scheduleSummary = targetSub.sessions
        .map((s) => `${s.day.slice(0, 3)} ${s.timeLabel} (${s.room})`)
        .join(" • ");
    });

    stateObj.customUniversitySubjects = Array.from(groupedCustom.values());
  }

  /**
   * Return all subjects across the university (9 official BSIT 2-2 subjects + 24 extended catalog subjects + any custom DB subjects)
   */
  function getAllUniversitySubjects(customState = null) {
    const state = customState || loadState();
    const baseSchedules = (state.schedules || getInitialSubjects()).map((s) => ({
      ...s,
      isSampleData: false
    }));
    const extended = getExtendedCatalogSubjects().map((s) => ({
      ...s,
      isSampleData: true
    }));
    const customList = Array.isArray(state.customUniversitySubjects)
      ? state.customUniversitySubjects.map((s) => ({ ...s, isSampleData: true, isCustomDbSchedule: true }))
      : [];

    return [...baseSchedules, ...extended, ...customList];
  }

  /**
   * Return all individual timetable sessions across the provided subjects (defaults to the 9 BSIT 2-2 subjects),
   * sorted chronologically by startTime within each weekday.
   */
  function getAllScheduleSessions(customSchedules = null) {
    const state = loadState();
    const schedules = customSchedules || state.schedules || [];
    const dir = state.facultyDirectory || [];
    const sessionsList = [];

    schedules.forEach((sub) => {
      const subSessions =
        Array.isArray(sub.sessions) && sub.sessions.length > 0
          ? sub.sessions
          : sub.day && sub.startTime && sub.endTime
            ? [
              {
                day: sub.day,
                startTime: sub.startTime,
                endTime: sub.endTime,
                timeLabel: `${sub.startTime}–${sub.endTime}`,
                room: sub.room || "Not specified"
              }
            ]
            : [];

      const matchedFac = dir.find(
        (f) =>
          (sub.facultyId && f.facultyId === sub.facultyId) ||
          (sub.instructor && f.name.toLowerCase() === String(sub.instructor).trim().toLowerCase())
      );

      subSessions.forEach((sess, idx) => {
        const rawRoom = sess.room || sub.room || "Not specified";
        const canonicalRoom = normalizeRoomName(rawRoom);
        const classType = getClassTypeForSession(sub, sess);
        sessionsList.push({
          sessionId: sess.scheduleId ? `db_${sess.scheduleId}` : `${sub.id}_${sess.day}_${idx}`,
          scheduleId: sess.scheduleId || null,
          subjectId: sub.id,
          subjectCode: sub.subjectCode,
          courseCode: sub.courseCode,
          subjectName: sub.subjectName,
          displaySubject: `${sub.courseCode} – ${sub.subjectName}`,
          instructor: sub.instructor || "Not specified",
          facultyId: sub.facultyId || (matchedFac ? matchedFac.facultyId : null),
          section: sub.section || "BSIT 2-2",
          yearLevel: normalizeYearLevel(sub.yearLevel, "Year 2"),
          units: sub.units || 3,
          day: sess.day,
          startTime: sess.startTime,
          endTime: sess.endTime,
          timeLabel: sess.timeLabel || formatTimeRangeLabel(sess.startTime, sess.endTime),
          room: rawRoom,
          canonicalRoom,
          classType,
          isSampleData: Boolean(sub.isSampleData),
          isCustomDbSchedule: Boolean(sess.isCustomDbSchedule || sub.isCustomDbSchedule),
          academicTerm: "2nd Semester, AY 2026–2027"
        });
      });
    });

    const dayOrder = { Monday: 1, Tuesday: 2, Wednesday: 3, Thursday: 4, Friday: 5 };
    return sessionsList.sort((a, b) => {
      const dDiff = (dayOrder[a.day] || 99) - (dayOrder[b.day] || 99);
      if (dDiff !== 0) return dDiff;
      return (a.startTime || "").localeCompare(b.startTime || "");
    });
  }

  /**
   * Return all individual timetable sessions across the ENTIRE university
   * (all 15 professors, all 8 BSIT sections, and all 14 campus rooms & facilities).
   */
  function getAllUniversityScheduleSessions(customState = null) {
    const allSubjects = getAllUniversitySubjects(customState);
    return getAllScheduleSessions(allSubjects);
  }

  /**
   * Return timetable sessions for a specific weekday ("Monday" .. "Friday")
   */
  function getSessionsByDay(dayName, customSchedules = null) {
    return getAllScheduleSessions(customSchedules).filter((s) => s.day === dayName);
  }

  /**
   * Check whether a student profile matches the configured BSIT 2-2 curriculum load
   * (Course: BSIT / Bachelor of Science in Information Technology, Year Level: Year 2, Section: BSIT 2-2)
   */
  function isBsit22StudentProfile(profile) {
    if (!profile || typeof profile !== "object") return false;
    const section = String(profile.section || "").trim().toUpperCase().replace(/\s+/g, " ");
    const yearLevel = normalizeYearLevel(profile.yearLevel, "Year 2");
    const course = String(profile.course || "").trim().toLowerCase();
    const isBsitCourse =
      course.includes("information technology") ||
      course.includes("bsit") ||
      course.includes("b.s. in information technology");
    return section === "BSIT 2-2" && yearLevel === "Year 2" && isBsitCourse;
  }

  /**
   * Return the subjects assigned to a student based on their course, year level, and section.
   * For BSIT 2-2 students, returns the 9 official BSIT 2-2 subjects.
   * For the preloaded Year 1 / Year 2 / Year 3 / Year 4 BSIT demo sections,
   * returns their section's configured BSIT subjects.
   * Does NOT automatically show BSIT 2-2 subjects to students from other sections.
   */
  function getStudentEnrolledSubjects(profileOverride = null, customSchedules = null) {
    const state = loadState();
    const profile = profileOverride || state.profile;
    const baseSubjects = customSchedules || state.schedules || [];
    const allSubjects = [
      ...baseSubjects,
      ...getExtendedCatalogSubjects(),
      ...(Array.isArray(state.customUniversitySubjects) ? state.customUniversitySubjects : [])
    ];
    if (!profile || typeof profile !== "object") return [];

    const studentSection = String(profile.section || "").trim().toUpperCase().replace(/\s+/g, " ");
    const studentYear = normalizeYearLevel(profile.yearLevel, "Year 2");
    const studentCourse = String(profile.course || "").trim().toLowerCase();

    if (!studentSection) return [];

    return allSubjects.filter((sub) => {
      const subSection = String(sub.section || "BSIT 2-2").trim().toUpperCase().replace(/\s+/g, " ");
      const subYear = normalizeYearLevel(sub.yearLevel || "Year 2", "Year 2");
      const subCourse = String(
        sub.course || "Bachelor of Science in Information Technology"
      ).trim().toLowerCase();

      const sectionMatches = subSection === studentSection;
      const yearMatches = subYear === studentYear;
      const courseMatches =
        subCourse === studentCourse ||
        (studentCourse.includes("information technology") &&
          subCourse.includes("information technology")) ||
        (studentCourse.includes("bsit") && subCourse.includes("information technology"));

      return sectionMatches && yearMatches && courseMatches;
    });
  }

  /**
   * Return ONLY the subjects assigned to a single faculty instructor.
   * Never combines multiple professors' schedules or falls back to another professor's subjects.
   */
  function getFacultyAssignedSubjects(instructorName, customSchedules = null) {
    const state = loadState();
    const combinedCatalog = customSchedules
      ? [...customSchedules]
      : getAllUniversitySubjects(state);

    const rawTarget = String(instructorName || "").trim().toLowerCase();
    if (!rawTarget || rawTarget === "not specified") {
      return [];
    }

    const aliasMap = {
      "fabian somera": "somera, fabian",
      "francis van salvador": "salvador, francis van",
      "samantha dominique itliong": "itliong, samantha dominique",
      "bush duque": "duque, bush",
      "joan albano": "albano, joan",
      "joseph quevedo": "quevedo, joseph",
      "edward panganiban": "panganiban, edward",
      "gorgonio vallestero iii": "vallestero iii, gorgonio",
      "lee-mher binay-an": "binay-an, lee-mher",
      "wendell castillo": "castillo, wendell",
      "elena santos": "santos, elena (visiting faculty - simulated demo)",
      "santos, elena": "santos, elena (visiting faculty - simulated demo)",
      "arturo delos reyes": "delos reyes, arturo (demo faculty)",
      "delos reyes, arturo": "delos reyes, arturo (demo faculty)",
      "clarissa macapagal": "macapagal, clarissa (demo faculty)",
      "macapagal, clarissa": "macapagal, clarissa (demo faculty)",
      "renato villamor": "villamor, renato (demo faculty)",
      "villamor, renato": "villamor, renato (demo faculty)",
      "maricel ocampo": "ocampo, maricel (demo faculty)",
      "ocampo, maricel": "ocampo, maricel (demo faculty)"
    };
    const normalizedTarget = aliasMap[rawTarget] || rawTarget;

    const dirMatch = (state.facultyDirectory || []).find(
      (f) =>
        f.name.toLowerCase() === normalizedTarget ||
        f.facultyId.toLowerCase() === normalizedTarget ||
        (f.username && f.username.toLowerCase() === normalizedTarget)
    );
    const targetNameLower = dirMatch ? dirMatch.name.toLowerCase() : normalizedTarget;
    const targetFacultyId = dirMatch ? dirMatch.facultyId : null;

    return combinedCatalog.filter((s) => {
      if (!s) return false;
      const sInstr = String(s.instructor || "").trim().toLowerCase();
      if (sInstr === targetNameLower) return true;
      if (targetFacultyId && s.facultyId && s.facultyId === targetFacultyId) return true;
      return false;
    });
  }

  /**
   * Return subjects available for Grade / Attendance encoding by a professor.
   * Includes their personal assigned subjects AND preserves BSIT 2-2 co-instructor grade sheet access
   * for Somera, Fabian (`T148`) and Salvador, Francis Van (`T150`) so BSIT 2-2 student grade encoding
   * continues to work without creating duplicate timetable sessions.
   */
  function getFacultyGradeableSubjects(instructorName, customSchedules = null) {
    const state = loadState();
    const personalSubjects = getFacultyAssignedSubjects(instructorName, customSchedules);
    const rawTarget = String(instructorName || "").trim().toLowerCase();
    const baseBsit22 = state.schedules || getInitialSubjects();

    if (rawTarget === "somera, fabian" || rawTarget === "fabian somera" || rawTarget === "fac-bu-04") {
      const t148 = baseBsit22.find((s) => s.subjectCode === "T148");
      if (t148 && !personalSubjects.some((s) => s.subjectCode === "T148")) {
        return [{ ...t148, instructor: "Somera, Fabian" }, ...personalSubjects];
      }
    }
    if (
      rawTarget === "salvador, francis van" ||
      rawTarget === "francis van salvador" ||
      rawTarget === "fac-bu-07"
    ) {
      const t150 = baseBsit22.find((s) => s.subjectCode === "T150");
      if (t150 && !personalSubjects.some((s) => s.subjectCode === "T150")) {
        return [{ ...t150, instructor: "Salvador, Francis Van" }, ...personalSubjects];
      }
    }
    return personalSubjects;
  }

  /**
   * Check if any two sessions in a schedule list overlap on the same day.
   * Back-to-back classes (e.g. ending at 10:00 and starting at 10:00) do NOT overlap (`startA < endB && endA > startB`).
   */
  function hasScheduleOverlap(sessionsList) {
    if (!Array.isArray(sessionsList) || sessionsList.length < 2) return false;
    for (let i = 0; i < sessionsList.length; i++) {
      for (let j = i + 1; j < sessionsList.length; j++) {
        const a = sessionsList[i];
        const b = sessionsList[j];
        if (a.day && b.day && a.day === b.day && a.startTime && a.endTime && b.startTime && b.endTime) {
          if (a.startTime < b.endTime && a.endTime > b.startTime) {
            return true;
          }
        }
      }
    }
    return false;
  }

  /**
   * Validate a candidate schedule entry against existing university schedule sessions.
   * Prevents all 5 conflict types:
   * 1. One professor teaching two classes at overlapping times
   * 2. One classroom/facility assigned to two classes at overlapping times
   * 3. One section having two classes at overlapping times
   * 4. Invalid start and end times (`startTime >= endTime`)
   * 5. Duplicate schedule entries
   * Back-to-back classes (`endTime === startTime`, e.g., 10:00 AM end and 10:00 AM start) are allowed.
   */
  function validateScheduleEntry(candidate, existingSessions = null) {
    const errors = [];
    const conflicts = [];

    if (!candidate || typeof candidate !== "object") {
      return { valid: false, errors: ["Invalid schedule payload."], conflicts: [] };
    }

    const day = String(candidate.day || "").trim();
    const startTime = String(candidate.startTime || "").trim();
    const endTime = String(candidate.endTime || "").trim();
    const instructor = String(candidate.instructor || "").trim();
    const section = String(candidate.section || "").trim();
    const rawRoom = String(candidate.room || "").trim();
    const canonicalRoom = normalizeRoomName(rawRoom);
    const subjectCode = String(candidate.subjectCode || "").trim();

    if (!WEEKDAYS.includes(day)) {
      errors.push("Please select a valid weekday (Monday to Friday).");
    }
    if (!/^\d{2}:\d{2}$/.test(startTime) || !/^\d{2}:\d{2}$/.test(endTime)) {
      errors.push("Start time and end time must use valid 24-hour HH:MM format.");
    } else if (startTime >= endTime) {
      errors.push(`Invalid time range (${startTime}–${endTime}): Start time must be earlier than end time.`);
      conflicts.push({
        type: "INVALID_TIME_RANGE",
        message: `Invalid start and end time (${formatTimeRangeLabel(startTime, endTime)}). Start time must be strictly before end time.`
      });
    }
    if (!instructor) {
      errors.push("Professor / Instructor is required.");
    }
    if (!section) {
      errors.push("Section is required.");
    }
    if (!rawRoom) {
      errors.push("Classroom or laboratory facility is required.");
    }
    if (!subjectCode) {
      errors.push("Subject code is required.");
    }

    if (errors.length > 0) {
      return { valid: false, errors, conflicts };
    }

    const allSessions = Array.isArray(existingSessions)
      ? existingSessions
      : getAllUniversityScheduleSessions();

    allSessions.forEach((existing) => {
      if (candidate.sessionId && existing.sessionId === candidate.sessionId) return;
      if (candidate.scheduleId && existing.scheduleId && String(existing.scheduleId) === String(candidate.scheduleId)) return;
      if (existing.day !== day) return;

      const exStart = String(existing.startTime || "").trim();
      const exEnd = String(existing.endTime || "").trim();
      if (!exStart || !exEnd) return;

      // Exact duplicate check
      const sameSubject = existing.subjectCode && existing.subjectCode.toLowerCase() === subjectCode.toLowerCase();
      const sameSection = existing.section && existing.section.toLowerCase() === section.toLowerCase();
      const sameTime = exStart === startTime && exEnd === endTime;
      if (sameSubject && sameSection && sameTime) {
        const msg = `Duplicate schedule entry: ${subjectCode} for ${section} is already scheduled on ${day} at ${formatTimeRangeLabel(startTime, endTime)}.`;
        conflicts.push({ type: "DUPLICATE_ENTRY", message: msg, conflictingSession: existing });
        errors.push(msg);
        return;
      }

      // Overlap check (strictly `startTime < exEnd && endTime > exStart`; back-to-back `end == start` is allowed)
      const overlaps = startTime < exEnd && endTime > exStart;
      if (!overlaps) return;

      // 1. Professor overlap check
      const exInstructor = String(existing.instructor || "").trim().toLowerCase();
      if (
        exInstructor &&
        exInstructor !== "not specified" &&
        instructor.toLowerCase() !== "not specified" &&
        exInstructor === instructor.toLowerCase()
      ) {
        const msg = `Professor Conflict: ${instructor} is already teaching ${existing.subjectCode} (${existing.section}) on ${day} at ${existing.timeLabel || formatTimeRangeLabel(exStart, exEnd)} in ${existing.room}.`;
        conflicts.push({ type: "PROFESSOR_CONFLICT", message: msg, conflictingSession: existing });
        errors.push(msg);
      }

      // 2. Classroom / Facility overlap check
      const exCanonicalRoom = normalizeRoomName(existing.canonicalRoom || existing.room);
      if (
        canonicalRoom !== "Not specified" &&
        exCanonicalRoom !== "Not specified" &&
        canonicalRoom.toLowerCase() === exCanonicalRoom.toLowerCase()
      ) {
        const msg = `Room Conflict: ${canonicalRoom} is already occupied by ${existing.subjectCode} (${existing.section} – ${existing.instructor}) on ${day} at ${existing.timeLabel || formatTimeRangeLabel(exStart, exEnd)}.`;
        conflicts.push({ type: "ROOM_CONFLICT", message: msg, conflictingSession: existing });
        errors.push(msg);
      }

      // 3. Section overlap check
      if (
        existing.section &&
        existing.section.trim().toLowerCase() === section.toLowerCase()
      ) {
        const msg = `Section Conflict: Section ${section} already has ${existing.subjectCode} (${existing.instructor}) on ${day} at ${existing.timeLabel || formatTimeRangeLabel(exStart, exEnd)} in ${existing.room}.`;
        conflicts.push({ type: "SECTION_CONFLICT", message: msg, conflictingSession: existing });
        errors.push(msg);
      }
    });

    return {
      valid: errors.length === 0 && conflicts.length === 0,
      errors,
      conflicts
    };
  }

  /**
   * Inspect a list of schedule sessions (defaults to the entire university master schedule)
   * and return all detected Professor, Room, Section, Time, or Duplicate conflicts.
   */
  function detectAllScheduleConflicts(sessionsList = null) {
    const list = Array.isArray(sessionsList) ? sessionsList : getAllUniversityScheduleSessions();
    const detected = [];

    for (let i = 0; i < list.length; i++) {
      const a = list[i];
      if (a.startTime && a.endTime && a.startTime >= a.endTime) {
        detected.push({
          type: "INVALID_TIME_RANGE",
          day: a.day,
          message: `Invalid time range on ${a.subjectCode} (${a.section}): ${a.startTime}–${a.endTime}`,
          sessionA: a,
          sessionB: null
        });
      }
      for (let j = i + 1; j < list.length; j++) {
        const b = list[j];
        if (!a.day || !b.day || a.day !== b.day) continue;
        if (!a.startTime || !a.endTime || !b.startTime || !b.endTime) continue;

        // Back-to-back (`a.endTime === b.startTime` or `b.endTime === a.startTime`) is allowed
        const overlaps = a.startTime < b.endTime && a.endTime > b.startTime;
        if (!overlaps) continue;

        const instrA = String(a.instructor || "").trim().toLowerCase();
        const instrB = String(b.instructor || "").trim().toLowerCase();
        if (instrA && instrB && instrA !== "not specified" && instrA === instrB) {
          detected.push({
            type: "PROFESSOR_CONFLICT",
            day: a.day,
            message: `Professor Conflict on ${a.day}: ${a.instructor} is assigned to both ${a.subjectCode} (${a.section}, ${a.timeLabel}) and ${b.subjectCode} (${b.section}, ${b.timeLabel}).`,
            sessionA: a,
            sessionB: b
          });
        }

        const roomA = normalizeRoomName(a.canonicalRoom || a.room);
        const roomB = normalizeRoomName(b.canonicalRoom || b.room);
        if (roomA !== "Not specified" && roomB !== "Not specified" && roomA.toLowerCase() === roomB.toLowerCase()) {
          detected.push({
            type: "ROOM_CONFLICT",
            day: a.day,
            message: `Room Conflict on ${a.day} in ${roomA}: ${a.subjectCode} (${a.section}, ${a.timeLabel}) overlaps with ${b.subjectCode} (${b.section}, ${b.timeLabel}).`,
            sessionA: a,
            sessionB: b
          });
        }

        const secA = String(a.section || "").trim().toLowerCase();
        const secB = String(b.section || "").trim().toLowerCase();
        if (secA && secB && secA === secB) {
          detected.push({
            type: "SECTION_CONFLICT",
            day: a.day,
            message: `Section Conflict on ${a.day} for ${a.section}: ${a.subjectCode} (${a.timeLabel}) overlaps with ${b.subjectCode} (${b.timeLabel}).`,
            sessionA: a,
            sessionB: b
          });
        }
      }
    }

    return detected;
  }

  /**
   * Return non-overlapping timetable sessions strictly for one specific professor,
   * organized chronologically by weekday and start time.
   */
  function getFacultyScheduleSessions(instructorName, customSchedules = null) {
    const assignedSubjects = getFacultyAssignedSubjects(instructorName, customSchedules);
    const rawSessions = getAllScheduleSessions(assignedSubjects);
    const nonOverlapping = [];

    rawSessions.forEach((sess) => {
      const conflict = nonOverlapping.some(
        (existing) =>
          existing.day === sess.day &&
          sess.startTime < existing.endTime &&
          sess.endTime > existing.startTime
      );
      if (!conflict) {
        nonOverlapping.push(sess);
      }
    });

    return nonOverlapping;
  }

  /**
   * Create and persist a new faculty schedule session in MySQL (`POST /api/schedules`)
   * after running full Professor / Room / Section / Time conflict validation.
   */
  async function createScheduleSessionInDatabase(schedulePayload) {
    if (getActiveRole() !== "faculty") {
      return { ok: false, error: "Only authorized faculty members can add schedule entries." };
    }

    const validation = validateScheduleEntry(schedulePayload);
    if (!validation.valid) {
      return {
        ok: false,
        error: validation.errors[0] || "Schedule conflict detected.",
        errors: validation.errors,
        conflicts: validation.conflicts
      };
    }

    const response = await requestBackendJson("/api/schedules", {
      method: "POST",
      body: schedulePayload
    });

    if (!response.ok || !response.data || !response.data.schedule) {
      return {
        ok: false,
        error: response.error || "Failed to save schedule session to MySQL database.",
        conflicts: response.data?.conflicts || []
      };
    }

    const state = loadState();
    if (Array.isArray(response.data.schedules)) {
      mergeSchedulesFromDatabase(state, response.data.schedules);
    }
    saveState(state, { systemReset: true, skipNetworkSync: true });

    return {
      ok: true,
      schedule: response.data.schedule,
      message: response.data.message || "Schedule session saved to MySQL database."
    };
  }

  /**
   * Delete a custom schedule session from MySQL (`DELETE /api/schedules/:id`)
   */
  async function deleteScheduleSessionInDatabase(scheduleId) {
    if (getActiveRole() !== "faculty") {
      return { ok: false, error: "Only authorized faculty members can remove schedule entries." };
    }

    const response = await requestBackendJson(`/api/schedules/${encodeURIComponent(scheduleId)}`, {
      method: "DELETE"
    });

    if (!response.ok) {
      return {
        ok: false,
        error: response.error || "Failed to delete schedule entry from MySQL."
      };
    }

    const state = loadState();
    if (Array.isArray(response.data?.schedules)) {
      mergeSchedulesFromDatabase(state, response.data.schedules);
    }
    saveState(state, { systemReset: true, skipNetworkSync: true });

    return {
      ok: true,
      deletedId: scheduleId,
      message: response.data?.message || "Schedule entry removed from MySQL."
    };
  }

  /**
   * Set active student profile in state based on login identifier, username, email, or student number
   */
  function setActiveStudentByIdentifier(identifierOrName) {
    const state = loadState();
    const rawQ = String(identifierOrName || "").trim().toLowerCase();
    const roster = state.sectionRoster || [];

    let match = roster.find(
      (s) =>
        (s.studentNumber && s.studentNumber.toLowerCase() === rawQ) ||
        (s.username && s.username.toLowerCase() === rawQ) ||
        (s.email && s.email.toLowerCase() === rawQ) ||
        (s.fullName && s.fullName.toLowerCase() === rawQ)
    );

    if (
      !match &&
      (rawQ === "student.demo@bantug.edu.example" ||
        rawQ === "r.valiente.demo@bantug.edu.example" ||
        rawQ === "racel valiente" ||
        rawQ === "valiente, racel" ||
        rawQ === "student")
    ) {
      match = roster.find((s) => s.studentNumber === "2025-BSIT-0202") || roster[0];
    }

    if (match) {
      state.profile = {
        ...state.profile,
        studentNumber: match.studentNumber,
        fullName: match.fullName,
        course: match.course || "Bachelor of Science in Information Technology",
        yearLevel: normalizeYearLevel(match.yearLevel, "Year 2"),
        section: match.section || "BSIT 2-2",
        email: match.email,
        contactNumber: match.contactNumber || state.profile.contactNumber
      };
      saveState(state, { systemReset: true });
    }
    return state.profile;
  }

  /**
   * Set active faculty profile in state based on login identifier or instructor name
   */
  function setActiveFacultyByIdentifier(identifierOrName) {
    const state = loadState();
    const rawQ = String(identifierOrName || "").trim().toLowerCase();
    const aliasMap = {
      "fabian somera": "somera, fabian",
      "francis van salvador": "salvador, francis van"
    };
    const q = aliasMap[rawQ] || rawQ;
    const dir = state.facultyDirectory || [];

    let match = dir.find(
      (f) =>
        f.name.toLowerCase() === q ||
        f.facultyId.toLowerCase() === q ||
        f.email.toLowerCase() === q ||
        (f.username && f.username.toLowerCase() === q)
    );

    if (!match && (q === "faculty.demo@bantug.edu.example" || q === "fac-bu-2026-04" || q === "faculty")) {
      match = dir.find((f) => f.facultyId === "FAC-BU-04") || dir[0];
    }

    if (match) {
      state.facultyProfile = {
        ...state.facultyProfile,
        facultyId: match.facultyId,
        fullName: match.name,
        department: match.department,
        designation: match.designation || "Instructor",
        email: match.email,
        contactNumber: match.contactNumber || state.facultyProfile.contactNumber,
        advisorySection: match.advisorySection || "BSIT 2-2",
        activeInstructorFilter: match.name
      };
      saveState(state, { systemReset: true });
    }
    return state.facultyProfile;
  }

  /**
   * Check whether the current session is the dedicated Applicant Demo Account
   * (as opposed to a normal prospective applicant filling out an application)
   */
  function isApplicantDemoSession() {
    const sess = getSession();
    return Boolean(sess && sess.role === "applicant" && sess.isApplicantDemoAccount === true);
  }

  /**
   * Compute weighted grade for a single subject record using current gradingWeights.
   * Returns null if no grade is recorded yet.
   */
  function computeSubjectAverage(gradeRecord, weights) {
    if (!hasRecordedGrade(gradeRecord)) {
      return null;
    }
    const w = weights || loadState().gradingWeights;
    const q = Number(gradeRecord.quizzes) || 0;
    const a = Number(gradeRecord.assignments) || 0;
    const act = Number(gradeRecord.activities) || 0;
    const p = Number(gradeRecord.projects) || 0;
    const ex = Number(gradeRecord.examinations) || 0;

    const totalWeight =
      (Number(w.quizzes) || 0) +
      (Number(w.assignments) || 0) +
      (Number(w.activities) || 0) +
      (Number(w.projects) || 0) +
      (Number(w.examinations) || 0);

    if (totalWeight <= 0) return null;

    const weightedSum =
      q * (Number(w.quizzes) || 0) +
      a * (Number(w.assignments) || 0) +
      act * (Number(w.activities) || 0) +
      p * (Number(w.projects) || 0) +
      ex * (Number(w.examinations) || 0);

    return Number((weightedSum / totalWeight).toFixed(2));
  }

  /**
   * Compute overall weighted average across graded subjects ONLY.
   * Returns null if no subjects have recorded grades yet.
   */
  function computeOverallAverage() {
    const state = loadState();
    const { grades, gradingWeights } = state;
    if (!grades || grades.length === 0) return null;

    let totalUnits = 0;
    let weightedTotal = 0;
    let gradedCount = 0;

    grades.forEach((g) => {
      const avg = computeSubjectAverage(g, gradingWeights);
      if (avg !== null) {
        const units = Number(g.units) || 3;
        totalUnits += units;
        weightedTotal += avg * units;
        gradedCount++;
      }
    });

    if (gradedCount === 0 || totalUnits === 0) return null;
    return Number((weightedTotal / totalUnits).toFixed(2));
  }

  /**
   * Compute attendance statistics across all student attendance records
   */
  function computeAttendanceStats() {
    const records = loadState().attendance || [];
    const total = records.length;
    const present = records.filter((r) => r.status === "Present").length;
    const late = records.filter((r) => r.status === "Late").length;
    const absent = records.filter((r) => r.status === "Absent").length;

    const attendedCount = present + late;
    const percentage = total > 0 ? Number(((attendedCount / total) * 100).toFixed(1)) : 100;

    return {
      total,
      present,
      late,
      absent,
      attendedCount,
      percentage
    };
  }

  /**
   * Compute per-subject attendance summary for the student
   */
  function computeAttendanceBySubject() {
    const state = loadState();
    const records = state.attendance || [];
    const subjects = state.schedules || [];

    return subjects.map((sub) => {
      const fullLabel = `${sub.subjectCode} - ${sub.courseCode} - ${sub.subjectName}`;
      const subRecords = records.filter(
        (r) =>
          r.subjectCode === sub.subjectCode ||
          (r.subject && r.subject.startsWith(sub.subjectCode))
      );
      const total = subRecords.length;
      const present = subRecords.filter((r) => r.status === "Present").length;
      const late = subRecords.filter((r) => r.status === "Late").length;
      const absent = subRecords.filter((r) => r.status === "Absent").length;
      const attended = present + late;
      const percentage = total > 0 ? Number(((attended / total) * 100).toFixed(1)) : null;

      return {
        subjectCode: sub.subjectCode,
        courseCode: sub.courseCode,
        subjectName: sub.subjectName,
        instructor: sub.instructor,
        fullLabel,
        total,
        present,
        late,
        absent,
        percentage
      };
    });
  }

  /**
   * Return published announcements for students
   */
  function getPublishedAnnouncements() {
    const state = loadState();
    return (state.announcements || []).filter((a) => a.published !== false);
  }

  /**
   * Return formatted BSIT 2-2 subject strings for dropdown selectors
   * e.g. "T148 - IT 211 - Data Structures and Algorithms"
   */
  function getSubjectList() {
    const state = loadState();
    const set = new Set();

    state.schedules.forEach((s) => {
      if (s.subjectCode && s.subjectName) {
        const coursePart = s.courseCode ? ` - ${s.courseCode}` : "";
        set.add(`${s.subjectCode}${coursePart} - ${s.subjectName}`);
      }
    });

    if (set.size === 0) {
      getInitialSubjects().forEach((s) => {
        set.add(`${s.subjectCode} - ${s.courseCode} - ${s.subjectName}`);
      });
    }

    return Array.from(set);
  }

  /**
   * Session Management (Role-Based Access)
   */
  function getSession() {
    try {
      const localRaw = localStorage.getItem(SESSION_KEY) || sessionStorage.getItem(SESSION_KEY);
      if (!localRaw) return null;
      const parsed = JSON.parse(localRaw);
      if (parsed && ["student", "faculty", "applicant"].includes(parsed.role)) {
        return parsed;
      }
      return null;
    } catch (_) {
      return null;
    }
  }

  function saveSession(sessionObj, remember = true) {
    try {
      const payload = JSON.stringify({
        ...sessionObj,
        loginTime: new Date().toISOString()
      });
      if (remember) {
        localStorage.setItem(SESSION_KEY, payload);
      } else {
        sessionStorage.setItem(SESSION_KEY, payload);
        localStorage.removeItem(SESSION_KEY);
      }
    } catch (_) { }
  }

  function clearSession() {
    try {
      localStorage.removeItem(SESSION_KEY);
      sessionStorage.removeItem(SESSION_KEY);
    } catch (_) { }
  }

  /**
   * Return active logo source
   */
  function getLogoSrc() {
    const state = loadState();
    if (state.settings && state.settings.customLogoDataUrl) {
      return state.settings.customLogoDataUrl;
    }
    return LOGO_PATH;
  }

  function getState() {
    return loadState();
  }

  function updateSection(sectionKey, newValue) {
    const state = loadState();
    state[sectionKey] = newValue;
    return saveState(state);
  }

  function resetToSampleData() {
    const defaults = ensureValidSchema(getDefaultData());
    saveState(defaults, { systemReset: true });
    if (canUseFetch()) {
      getCandidateApiUrls().forEach((baseUrl) => {
        try {
          fetch(`${baseUrl}?action=reset`, { method: "POST" }).catch(() => {});
        } catch (_) {}
      });
    }
    return defaults;
  }

  function clearAllDemoRecords() {
    const state = loadState();
    const cleanSubjects = getInitialSubjects().map((s) => ({
      ...s,
      quizzes: null,
      assignments: null,
      activities: null,
      projects: null,
      examinations: null
    }));
    state.schedules = cleanSubjects.map((s) => ({ ...s }));
    state.grades = cleanSubjects.map((s) => ({ ...s }));
    state.facultyGrades = {};
    state.facultyAttendanceLogs = [];
    state.attendance = [];
    state.tasks = [];
    state.announcements = [];
    state.resources = [];
    state.applications = [];
    saveState(state, { systemReset: true });
    return state;
  }

  return {
    STORAGE_KEY,
    SESSION_KEY,
    SCHEMA_VERSION,
    LOGO_PATH,
    WEEKDAYS,
    VALID_YEAR_LEVELS,
    UNIVERSITY_SECTIONS,
    CAMPUS_ROOMS_AND_FACILITIES,
    VALID_APPLICATION_STATUSES,
    PERMISSION_MATRIX,
    uid,
    generateAppRef,
    formatLocalDate,
    offsetDate,
    isValidYearLevel,
    normalizeYearLevel,
    normalizeRoomName,
    getClassTypeForSession,
    formatTimeRangeLabel,
    getInitialSubjects,
    getExtendedCatalogSubjects,
    getHistoricalSept15To17Schedule,
    getAllUniversitySubjects,
    getAllUniversityScheduleSessions,
    getState,
    saveState,
    updateSection,
    resetToSampleData,
    clearAllDemoRecords,
    hasRecordedGrade,
    hasScheduleProvided,
    isBsit22StudentProfile,
    getStudentEnrolledSubjects,
    getAllScheduleSessions,
    getSessionsByDay,
    getFacultyAssignedSubjects,
    getFacultyGradeableSubjects,
    getFacultyScheduleSessions,
    hasScheduleOverlap,
    validateScheduleEntry,
    detectAllScheduleConflicts,
    setActiveStudentByIdentifier,
    setActiveFacultyByIdentifier,
    getAllApplicationsForFaculty,
    updateApplicationStatusByFaculty,
    computeSubjectAverage,
    computeOverallAverage,
    computeAttendanceStats,
    computeAttendanceBySubject,
    getPublishedAnnouncements,
    getSubjectList,
    getSession,
    saveSession,
    clearSession,
    getActiveRole,
    isApplicantDemoSession,
    hasPermission,
    getLogoSrc,
    getAuthHeaders,
    loginWithDatabase,
    logoutFromDatabase,
    fetchAuditLogsFromDatabase,
    syncToXamppDatabase,
    loadFromXamppDatabase,
    submitApplicationToDatabase,
    updateApplicationStatusInDatabase,
    createAnnouncementInDatabase,
    updateAnnouncementInDatabase,
    deleteAnnouncementInDatabase,
    markAllAnnouncementsReadInDatabase,
    createScheduleSessionInDatabase,
    deleteScheduleSessionInDatabase,
    mergeApplicationsFromDatabase,
    mergeAnnouncementsFromDatabase,
    mergeSchedulesFromDatabase
  };
}) ();

if (typeof window !== "undefined" && typeof document !== "undefined") {
  document.addEventListener("DOMContentLoaded", () => {
    if (window.StudentHubStorage && typeof window.StudentHubStorage.loadFromXamppDatabase === "function") {
      window.StudentHubStorage.loadFromXamppDatabase();
    }
  });
}
