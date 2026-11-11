# BANTUG UNIVERSITY – Preloaded Demo Accounts & Credentials (Revision 7)

This reference file lists all **45 preloaded sample accounts** (**15 Student Accounts**, **15 Faculty Accounts**, and **15 Applicant Accounts**) seeded into the MySQL database (`bantug_university_db`).

> **Password Security Note:** All passwords in the MySQL `users` table are stored as **secure bcrypt hashes** (`$2y$10$...`). Plain-text passwords are provided here **for demonstration and testing login only**.

---

## Primary Highlighted Demo Accounts

| Portal Role | Full Name | ID / Reference No. | Username | Email | Plain-Text Password (for Login) |
|---|---|---|---|---|---|
| **Student Demo (Primary)** | **Racel Valiente (Demo Student)** | `2025-BSIT-0202` | `racel.valiente` | `student.demo@bantug.edu.example` | `student123` |
| **Faculty Demo 1 (Primary)** | **Somera, Fabian** | `FAC-BU-01` | `fabian.somera` | `f.somera.demo@bantug.edu.example` | `faculty123` |
| **Faculty Demo 2** | **Salvador, Francis Van** | `FAC-BU-02` | `francis.salvador` | `f.salvador.demo@bantug.edu.example` | `faculty123` |
| **Applicant Demo (Primary)** | **Ceasar Villanueva** | `BU-ADM-2026-0101` | `ceasar.villanueva` | `applicant.demo@bantug.edu.example` | `applicant123` |

---

## 1. 15 Preloaded Student Accounts (BSIT – Year 1 to Year 4)

All 15 student accounts belong to **BANTUG UNIVERSITY** under the **Bachelor of Science in Information Technology (BSIT)** program and include preloaded enrolled subjects, class schedules, grades, attendance records, and assignments.

| # | Student Number | Full Name | Username | Email | Password | Course | Year Level | Section |
|---|---|---|---|---|---|---|---|---|
| **1** | **`2025-BSIT-0202`** | **Racel Valiente (Demo Student)** *(Primary Demo)* | `racel.valiente` | `student.demo@bantug.edu.example` | `student123` | BSIT | Year 2 | **BSIT 2-2** |
| 2 | `2025-BSIT-0205` | Dela Cruz, Mateo L. | `mateo.delacruz` | `m.delacruz@bantug.edu.example` | `student123` | BSIT | Year 2 | **BSIT 2-2** |
| 3 | `2025-BSIT-0209` | Reyes, Hannah Sofia M. | `hannah.reyes` | `h.reyes@bantug.edu.example` | `student123` | BSIT | Year 2 | **BSIT 2-2** |
| 4 | `2025-BSIT-0214` | Gomez, Christian Paul D. | `christian.gomez` | `c.gomez@bantug.edu.example` | `student123` | BSIT | Year 2 | **BSIT 2-2** |
| 5 | `2025-BSIT-0218` | Villanueva, Beatrice Anne T. | `beatrice.villanueva` | `b.villanueva@bantug.edu.example` | `student123` | BSIT | Year 2 | **BSIT 2-2** |
| 6 | `2025-BSIT-0221` | Mendoza, Karl Vincent R. | `karl.mendoza` | `k.mendoza@bantug.edu.example` | `student123` | BSIT | Year 2 | **BSIT 2-2** |
| 7 | `2025-BSIT-0226` | Bautista, Clarisse Joy P. | `clarisse.bautista` | `c.bautista@bantug.edu.example` | `student123` | BSIT | Year 2 | **BSIT 2-2** |
| 8 | `2026-BSIT-0101` | Aquino, Janelle Mae S. | `janelle.aquino` | `j.aquino@bantug.edu.example` | `student123` | BSIT | Year 1 | BSIT 1-1 |
| 9 | `2026-BSIT-0104` | Navarro, Liam Gabriel C. | `liam.navarro` | `l.navarro@bantug.edu.example` | `student123` | BSIT | Year 1 | BSIT 1-1 |
| 10 | `2026-BSIT-0112` | Soriano, Patricia Nicole V. | `patricia.soriano` | `p.soriano@bantug.edu.example` | `student123` | BSIT | Year 1 | BSIT 1-2 |
| 11 | `2024-BSIT-0302` | Tolentino, Marcus Andrei F. | `marcus.tolentino` | `m.tolentino@bantug.edu.example` | `student123` | BSIT | Year 3 | BSIT 3-1 |
| 12 | `2024-BSIT-0308` | Pascual, Denise Claire B. | `denise.pascual` | `d.pascual@bantug.edu.example` | `student123` | BSIT | Year 3 | BSIT 3-1 |
| 13 | `2024-BSIT-0315` | Mercado, Joshua Miguel G. | `joshua.mercado` | `j.mercado@bantug.edu.example` | `student123` | BSIT | Year 3 | BSIT 3-2 |
| 14 | `2023-BSIT-0401` | Salazar, Erica Therese D. | `erica.salazar` | `e.salazar@bantug.edu.example` | `student123` | BSIT | Year 4 | BSIT 4-1 |
| 15 | `2023-BSIT-0407` | Ocampo, Rafael Lorenzo M. | `rafael.ocampo` | `r.ocampo@bantug.edu.example` | `student123` | BSIT | Year 4 | BSIT 4-1 |

---

## 2. 15 Preloaded Faculty Accounts

Each faculty account displays **only that professor's own assigned subjects and individual non-overlapping class schedule** when logged in, and grants access to **Faculty Portal -> Student Applications** to review and update application statuses in MySQL.

| # | Faculty Number | Full Name | Username | Email | Password | Department | Assigned Subjects |
|---|---|---|---|---|---|---|---|
| **1** | **`FAC-BU-01`** | **Somera, Fabian** *(Primary Faculty Demo 1)* | `fabian.somera` | `f.somera.demo@bantug.edu.example` | `faculty123` | College of Information Technology & Computing | `T148` (IT 211), `T150` (IT ELEC 2) |
| **2** | **`FAC-BU-02`** | **Salvador, Francis Van** *(Faculty Demo 2)* | `francis.salvador` | `f.salvador.demo@bantug.edu.example` | `faculty123` | Department of General Education & Humanities | `T146` (GEC 6), `T153` (GEC 8) |
| 3 | `FAC-BU-03` | Binay-an, Lee-mher | `leemher.binayan` | `l.binayan@bantug.edu.example` | `faculty123` | College of Information Technology & Computing | `T148` (IT 211 – Data Structures and Algorithms) |
| 4 | `FAC-BU-04` | Castillo, Wendell | `wendell.castillo` | `w.castillo@bantug.edu.example` | `faculty123` | College of Information Technology & Computing | `T150` (IT ELEC 2 – Object-Oriented Programming) |
| 5 | `FAC-BU-05` | Panganiban, Edward | `edward.panganiban` | `e.panganiban@bantug.edu.example` | `faculty123` | College of Information Technology & Computing | `T151` (IT Elec 1 – Platform Technologies) |
| 6 | `FAC-BU-06` | Duque, Bush | `bush.duque` | `b.duque@bantug.edu.example` | `faculty123` | Department of General Education & Humanities | `T146` (GEC 6 – Science, Technology and Society) |
| 7 | `FAC-BU-07` | Itliong, Samantha Dominique | `samantha.itliong` | `s.itliong@bantug.edu.example` | `faculty123` | Department of Foreign Languages & Communication | `T147` (GE ELEC IT 3 – Foreign Language 2) |
| 8 | `FAC-BU-08` | Albano, Joan | `joan.albano` | `j.albano@bantug.edu.example` | `faculty123` | Department of General Education & Social Sciences | `T153` (GEC 8 – The Contemporary World) |
| 9 | `FAC-BU-09` | Quevedo, Joseph | `joseph.quevedo` | `j.quevedo@bantug.edu.example` | `faculty123` | College of Information Technology & Business Process | `T152` (IT BPO 1 – Business Communication) |
| 10 | `FAC-BU-10` | Vallestero III, Gorgonio | `gorgonio.vallestero` | `g.vallestero@bantug.edu.example` | `faculty123` | Department of Institutional & Critical Studies | `T003` (IT INST 2 – Creative and Critical Thinking) |
| 11 | `FAC-BU-11` | Manalo, Clarissa Mae *(Demo Faculty)* | `clarissa.manalo` | `c.manalo.demo@bantug.edu.example` | `faculty123` | Department of Physical Education & Sports | `T149` (PE 3 – Physical Activity III) |
| 12 | `FAC-BU-12` | Dizon, Roberto Carlos *(Demo Faculty)* | `roberto.dizon` | `r.dizon.demo@bantug.edu.example` | `faculty123` | College of Information Technology & Computing | `T101` (CC 101 – Intro to Computing), `T102` (CC 102 – Programming 1) |
| 13 | `FAC-BU-13` | Valdez, Maricar Joy *(Demo Faculty)* | `maricar.valdez` | `m.valdez.demo@bantug.edu.example` | `faculty123` | College of Information Technology & Computing | `T301` (IT 311 – Web Systems), `T302` (IT 312 – Info Assurance) |
| 14 | `FAC-BU-14` | Ramos, Gregorio Luis *(Demo Faculty)* | `gregorio.ramos` | `g.ramos.demo@bantug.edu.example` | `faculty123` | College of Information Technology & Computing | `T303` (IT 313 – Networking 2), `T401` (IT 411 – Capstone Project 2) |
| 15 | `FAC-BU-15` | Alcaraz, Katrina Faith *(Demo Faculty)* | `katrina.alcaraz` | `k.alcaraz.demo@bantug.edu.example` | `faculty123` | College of Information Technology & Computing | `T402` (IT 412 – Systems Integration), `T103` (GEC 1 – Understanding the Self) |

---

## 3. 15 Preloaded Applicant Accounts & Application Records

All 15 applicant records are stored in the MySQL `applications` table and appear in **Faculty Portal -> Student Applications**, distributed across `Pending`, `Under Review`, `Approved`, and `Rejected`.

| # | Application Number | Full Name | Username | Email | Password | Selected Course | Application Date | Status |
|---|---|---|---|---|---|---|---|---|
| **1** | **`BU-ADM-2026-0101`** | **Ceasar Villanueva** *(Primary Applicant Demo)* | `ceasar.villanueva` | `applicant.demo@bantug.edu.example` | `applicant123` | Bachelor of Science in Information Technology | `2026-10-18` | **Under Review** |
| 2 | `BU-ADM-2026-0102` | Ceasar Villanueva | `ceasar.villanueva.ba` | `applicant.demo@bantug.edu.example` | `applicant123` | Bachelor of Science in Business Administration | `2026-09-25` | **Approved** |
| 3 | `BU-ADM-2026-0103` | Ceasar Villanueva | `ceasar.villanueva.crim` | `applicant.demo@bantug.edu.example` | `applicant123` | Bachelor of Science in Criminology | `2026-10-29` | **Pending** |
| 4 | `BU-ADM-2026-0104` | Ramos, Kyla Francine T. | `kyla.ramos` | `kyla.ramos.demo@bantug.edu.example` | `applicant123` | Bachelor of Science in Information Technology | `2026-09-12` | **Rejected** |
| 5 | `BU-ADM-2026-0105` | Fernandez, Adrian Kyle P. | `adrian.fernandez` | `a.fernandez.app@bantug.edu.example` | `applicant123` | Bachelor of Science in Information Technology | `2026-11-01` | **Pending** |
| 6 | `BU-ADM-2026-0106` | De Guzman, Sophia Marie L. | `sophia.deguzman` | `s.deguzman.app@bantug.edu.example` | `applicant123` | Bachelor of Science in Information Technology | `2026-11-02` | **Under Review** |
| 7 | `BU-ADM-2026-0107` | Castillo, Mark Jayson R. | `mark.castillo` | `m.castillo.app@bantug.edu.example` | `applicant123` | Bachelor of Science in Information Technology | `2026-10-20` | **Approved** |
| 8 | `BU-ADM-2026-0108` | Morales, Alyssa Jean C. | `alyssa.morales` | `a.morales.app@bantug.edu.example` | `applicant123` | Bachelor of Secondary Education | `2026-11-03` | **Pending** |
| 9 | `BU-ADM-2026-0109` | Aguilar, Vince Patrick D. | `vince.aguilar` | `v.aguilar.app@bantug.edu.example` | `applicant123` | Bachelor of Science in Information Technology | `2026-10-28` | **Under Review** |
| 10 | `BU-ADM-2026-0110` | Santiago, Camille Rose B. | `camille.santiago` | `c.santiago.app@bantug.edu.example` | `applicant123` | Bachelor of Science in Business Administration | `2026-10-14` | **Approved** |
| 11 | `BU-ADM-2026-0111` | Rivera, John Benedict M. | `john.rivera` | `j.rivera.app@bantug.edu.example` | `applicant123` | Bachelor of Science in Criminology | `2026-09-30` | **Rejected** |
| 12 | `BU-ADM-2026-0112` | Flores, Jasmine Claire S. | `jasmine.flores` | `j.flores.app@bantug.edu.example` | `applicant123` | Bachelor of Science in Information Technology | `2026-11-05` | **Pending** |
| 13 | `BU-ADM-2026-0113` | Perez, Daniel Elijah G. | `daniel.perez` | `d.perez.app@bantug.edu.example` | `applicant123` | Bachelor of Science in Information Technology | `2026-11-04` | **Under Review** |
| 14 | `BU-ADM-2026-0114` | Cruz, Angelica Faith V. | `angelica.cruz` | `a.cruz.app@bantug.edu.example` | `applicant123` | Bachelor of Science in Hospitality Management | `2026-10-11` | **Approved** |
| 15 | `BU-ADM-2026-0115` | Gonzales, Paolo Miguel N. | `paolo.gonzales` | `p.gonzales.app@bantug.edu.example` | `applicant123` | Bachelor of Science in Information Technology | `2026-09-19` | **Rejected** |

