# BANTUG UNIVERSITY – Student, Faculty & Applicant Portal System (Revision 7)

A full-stack academic and admissions portal for **BANTUG UNIVERSITY** featuring role-based **Student**, **Faculty**, and **Applicant** portals backed by **MySQL (`bantug_university_db`)** with both **Node.js (`server.js` / `database/seed.js`)** and **XAMPP (`api/portal_api.php`)** support.

---

## Key Features in Revision 7

1. **Faculty Portal – Student Application Management (`Student Applications`)**
   - Accessible exclusively to authorized Faculty accounts via the **Student Applications** sidebar menu item or the **Review Student Applications** button on the Faculty Dashboard.
   - Displays all preloaded and newly submitted student applications from MySQL:
     - Applicant Full Name, Application Number, Email Address, Selected Course, Application Date, and Application Status (`Pending`, `Under Review`, `Approved`, `Rejected`).
   - Search applications by **Applicant Name**, **Application Number**, or **Email**.
   - Filter applications by **Status** (`Pending`, `Under Review`, `Approved`, `Rejected`) and **Selected Course**.
   - Click **View Details** on any application to inspect full applicant information and update its status and remarks directly in MySQL.
   - Private applicant information is strictly hidden from Student accounts, and public application submissions remain separate from the **Applicant Demo Account** status tracker.

2. **Preloaded Sample Data – 15 Records Per Category (45 Hashed Accounts)**
   - **15 Student Accounts** (`BSIT` across `Year 1`, `Year 2`, `Year 3`, and `Year 4`, including 7 `BSIT 2-2` students) with enrolled subjects, class schedules, grades, attendance records, and assignments.
   - **15 Faculty Accounts** (`FAC-BU-01` through `FAC-BU-15`) with individual assigned subjects and non-overlapping class schedules.
   - **15 Applicant Records** (`BU-ADM-2026-0101` through `BU-ADM-2026-0115`) distributed across `Pending` (4), `Under Review` (4), `Approved` (4), and `Rejected` (3).
   - All 45 user passwords are stored as secure password hashes in the MySQL `users` table (never plain text).

---

## Quick Start & Automatic Database Seeding

### Option A: Automatic Node.js Seed (`database/seed.js`) + Server
1. Start **MySQL** in the **XAMPP Control Panel** (port `3306`).
2. Run the non-destructive seed script from the project root:
   ```bash
   node database/seed.js
   ```
3. Start the Node.js server (which also auto-runs `database/seed.js` on startup):
   ```bash
   node server.js
   ```
   Open `http://localhost:3000`.

### Option B: XAMPP Apache + MySQL (`api/portal_api.php`)
1. Start **Apache** and **MySQL** in the **XAMPP Control Panel**.
2. Open `http://localhost/StudentHub/` (or run `setup_xampp.bat` to link the folder into `C:\xampp\htdocs\StudentHub`).
3. On first load, `api/config.php` automatically creates `bantug_university_db` and seeds all 15 Students, 15 Faculty, and 15 Applicants without deleting any existing user records.

---

## Primary Highlighted Demo Accounts

See [`DEMO_ACCOUNTS.md`](./DEMO_ACCOUNTS.md) for the complete reference documentation.

| Portal Role | Full Name | ID / Reference No. | Username | Email | Plain-Text Password |
|---|---|---|---|---|---|
| **Student Demo (Primary)** | **Racel Valiente (Demo Student)** | `2025-BSIT-0202` | `racel.valiente` | `student.demo@bantug.edu.example` | `student123` |
| **Faculty Demo 1 (Primary)** | **Somera, Fabian** | `FAC-BU-01` | `fabian.somera` | `f.somera.demo@bantug.edu.example` | `faculty123` |
| **Faculty Demo 2** | **Salvador, Francis Van** | `FAC-BU-02` | `francis.salvador` | `f.salvador.demo@bantug.edu.example` | `faculty123` |
| **Applicant Demo (Primary)** | **Ceasar Villanueva** | `BU-ADM-2026-0101` | `ceasar.villanueva` | `applicant.demo@bantug.edu.example` | `applicant123` |

---

## Complete Preloaded Credentials (45 Accounts)

### A. 15 Student Accounts (`Password: student123`)

| # | Student Number | Full Name | Username | Email | Password | Course & Section |
|---|---|---|---|---|---|---|
| 1 | `2025-BSIT-0202` | **Racel Valiente (Demo Student)** | `racel.valiente` | `student.demo@bantug.edu.example` | `student123` | BSIT 2-2 (Year 2) |
| 2 | `2025-BSIT-0205` | Dela Cruz, Mateo L. | `mateo.delacruz` | `m.delacruz@bantug.edu.example` | `student123` | BSIT 2-2 (Year 2) |
| 3 | `2025-BSIT-0209` | Reyes, Hannah Sofia M. | `hannah.reyes` | `h.reyes@bantug.edu.example` | `student123` | BSIT 2-2 (Year 2) |
| 4 | `2025-BSIT-0214` | Gomez, Christian Paul D. | `christian.gomez` | `c.gomez@bantug.edu.example` | `student123` | BSIT 2-2 (Year 2) |
| 5 | `2025-BSIT-0218` | Villanueva, Beatrice Anne T. | `beatrice.villanueva` | `b.villanueva@bantug.edu.example` | `student123` | BSIT 2-2 (Year 2) |
| 6 | `2025-BSIT-0221` | Mendoza, Karl Vincent R. | `karl.mendoza` | `k.mendoza@bantug.edu.example` | `student123` | BSIT 2-2 (Year 2) |
| 7 | `2025-BSIT-0226` | Bautista, Clarisse Joy P. | `clarisse.bautista` | `c.bautista@bantug.edu.example` | `student123` | BSIT 2-2 (Year 2) |
| 8 | `2026-BSIT-0101` | Aquino, Janelle Mae S. | `janelle.aquino` | `j.aquino@bantug.edu.example` | `student123` | BSIT 1-1 (Year 1) |
| 9 | `2026-BSIT-0104` | Navarro, Liam Gabriel C. | `liam.navarro` | `l.navarro@bantug.edu.example` | `student123` | BSIT 1-1 (Year 1) |
| 10 | `2026-BSIT-0112` | Soriano, Patricia Nicole V. | `patricia.soriano` | `p.soriano@bantug.edu.example` | `student123` | BSIT 1-2 (Year 1) |
| 11 | `2024-BSIT-0302` | Tolentino, Marcus Andrei F. | `marcus.tolentino` | `m.tolentino@bantug.edu.example` | `student123` | BSIT 3-1 (Year 3) |
| 12 | `2024-BSIT-0308` | Pascual, Denise Claire B. | `denise.pascual` | `d.pascual@bantug.edu.example` | `student123` | BSIT 3-1 (Year 3) |
| 13 | `2024-BSIT-0315` | Mercado, Joshua Miguel G. | `joshua.mercado` | `j.mercado@bantug.edu.example` | `student123` | BSIT 3-2 (Year 3) |
| 14 | `2023-BSIT-0401` | Salazar, Erica Therese D. | `erica.salazar` | `e.salazar@bantug.edu.example` | `student123` | BSIT 4-1 (Year 4) |
| 15 | `2023-BSIT-0407` | Ocampo, Rafael Lorenzo M. | `rafael.ocampo` | `r.ocampo@bantug.edu.example` | `student123` | BSIT 4-1 (Year 4) |

### B. 15 Faculty Accounts (`Password: faculty123`)

| # | Faculty Number | Full Name | Username | Email | Password | Assigned Subjects |
|---|---|---|---|---|---|---|
| 1 | `FAC-BU-01` | **Somera, Fabian** *(Demo 1)* | `fabian.somera` | `f.somera.demo@bantug.edu.example` | `faculty123` | `T148`, `T150` |
| 2 | `FAC-BU-02` | **Salvador, Francis Van** *(Demo 2)* | `francis.salvador` | `f.salvador.demo@bantug.edu.example` | `faculty123` | `T146`, `T153` |
| 3 | `FAC-BU-03` | Binay-an, Lee-mher | `leemher.binayan` | `l.binayan@bantug.edu.example` | `faculty123` | `T148` |
| 4 | `FAC-BU-04` | Castillo, Wendell | `wendell.castillo` | `w.castillo@bantug.edu.example` | `faculty123` | `T150` |
| 5 | `FAC-BU-05` | Panganiban, Edward | `edward.panganiban` | `e.panganiban@bantug.edu.example` | `faculty123` | `T151` |
| 6 | `FAC-BU-06` | Duque, Bush | `bush.duque` | `b.duque@bantug.edu.example` | `faculty123` | `T146` |
| 7 | `FAC-BU-07` | Itliong, Samantha Dominique | `samantha.itliong` | `s.itliong@bantug.edu.example` | `faculty123` | `T147` |
| 8 | `FAC-BU-08` | Albano, Joan | `joan.albano` | `j.albano@bantug.edu.example` | `faculty123` | `T153` |
| 9 | `FAC-BU-09` | Quevedo, Joseph | `joseph.quevedo` | `j.quevedo@bantug.edu.example` | `faculty123` | `T152` |
| 10 | `FAC-BU-10` | Vallestero III, Gorgonio | `gorgonio.vallestero` | `g.vallestero@bantug.edu.example` | `faculty123` | `T003` |
| 11 | `FAC-BU-11` | Manalo, Clarissa Mae *(Demo)* | `clarissa.manalo` | `c.manalo.demo@bantug.edu.example` | `faculty123` | `T149` |
| 12 | `FAC-BU-12` | Dizon, Roberto Carlos *(Demo)* | `roberto.dizon` | `r.dizon.demo@bantug.edu.example` | `faculty123` | `T101`, `T102` |
| 13 | `FAC-BU-13` | Valdez, Maricar Joy *(Demo)* | `maricar.valdez` | `m.valdez.demo@bantug.edu.example` | `faculty123` | `T301`, `T302` |
| 14 | `FAC-BU-14` | Ramos, Gregorio Luis *(Demo)* | `gregorio.ramos` | `g.ramos.demo@bantug.edu.example` | `faculty123` | `T303`, `T401` |
| 15 | `FAC-BU-15` | Alcaraz, Katrina Faith *(Demo)* | `katrina.alcaraz` | `k.alcaraz.demo@bantug.edu.example` | `faculty123` | `T402`, `T103` |

### C. 15 Applicant Accounts & Preloaded Applications (`Password: applicant123`)

| # | Application No. | Full Name | Username | Email | Password | Selected Course | Status |
|---|---|---|---|---|---|---|---|
| 1 | `BU-ADM-2026-0101` | **Ceasar Villanueva** *(Demo)* | `ceasar.villanueva` | `applicant.demo@bantug.edu.example` | `applicant123` | BS Information Technology | `Under Review` |
| 2 | `BU-ADM-2026-0102` | Ceasar Villanueva | `ceasar.villanueva.ba` | `applicant.demo@bantug.edu.example` | `applicant123` | BS Business Administration | `Approved` |
| 3 | `BU-ADM-2026-0103` | Ceasar Villanueva | `ceasar.villanueva.crim` | `applicant.demo@bantug.edu.example` | `applicant123` | BS Criminology | `Pending` |
| 4 | `BU-ADM-2026-0104` | Ramos, Kyla Francine T. | `kyla.ramos` | `kyla.ramos.demo@bantug.edu.example` | `applicant123` | BS Information Technology | `Rejected` |
| 5 | `BU-ADM-2026-0105` | Fernandez, Adrian Kyle P. | `adrian.fernandez` | `a.fernandez.app@bantug.edu.example` | `applicant123` | BS Information Technology | `Pending` |
| 6 | `BU-ADM-2026-0106` | De Guzman, Sophia Marie L. | `sophia.deguzman` | `s.deguzman.app@bantug.edu.example` | `applicant123` | BS Information Technology | `Under Review` |
| 7 | `BU-ADM-2026-0107` | Castillo, Mark Jayson R. | `mark.castillo` | `m.castillo.app@bantug.edu.example` | `applicant123` | BS Information Technology | `Approved` |
| 8 | `BU-ADM-2026-0108` | Morales, Alyssa Jean C. | `alyssa.morales` | `a.morales.app@bantug.edu.example` | `applicant123` | Bachelor of Secondary Education | `Pending` |
| 9 | `BU-ADM-2026-0109` | Aguilar, Vince Patrick D. | `vince.aguilar` | `v.aguilar.app@bantug.edu.example` | `applicant123` | BS Information Technology | `Under Review` |
| 10 | `BU-ADM-2026-0110` | Santiago, Camille Rose B. | `camille.santiago` | `c.santiago.app@bantug.edu.example` | `applicant123` | BS Business Administration | `Approved` |
| 11 | `BU-ADM-2026-0111` | Rivera, John Benedict M. | `john.rivera` | `j.rivera.app@bantug.edu.example` | `applicant123` | BS Criminology | `Rejected` |
| 12 | `BU-ADM-2026-0112` | Flores, Jasmine Claire S. | `jasmine.flores` | `j.flores.app@bantug.edu.example` | `applicant123` | BS Information Technology | `Pending` |
| 13 | `BU-ADM-2026-0113` | Perez, Daniel Elijah G. | `daniel.perez` | `d.perez.app@bantug.edu.example` | `applicant123` | BS Information Technology | `Under Review` |
| 14 | `BU-ADM-2026-0114` | Cruz, Angelica Faith V. | `angelica.cruz` | `a.cruz.app@bantug.edu.example` | `applicant123` | BS Hospitality Management | `Approved` |
| 15 | `BU-ADM-2026-0115` | Gonzales, Paolo Miguel N. | `paolo.gonzales` | `p.gonzales.app@bantug.edu.example` | `applicant123` | BS Information Technology | `Rejected` |
