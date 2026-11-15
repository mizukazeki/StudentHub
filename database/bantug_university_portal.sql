-- Database schema definition and seed data for Bantug University portal.
-- ============================================================================
-- BANTUG UNIVERSITY - STUDENT PORTAL SYSTEM (REVISION 7)
-- Complete MySQL / MariaDB Database Schema & Preloaded Demonstration Data
-- Compatible with Node.js + MySQL (`database/seed.js`) & XAMPP (phpMyAdmin)
-- ============================================================================
-- Preloaded Records:
--   - 45 User Accounts (`users` table with securely hashed passwords)
--   - 15 Student Accounts (`students` table across Year 1, Year 2, Year 3, Year 4)
--   - 15 Faculty Accounts (`faculty` table with individual assigned subjects)
--   - 15 Applicant Records (`applications` table: Pending, Under Review, Approved, Rejected)
--   - 16 Subjects & 29 Class Schedule Sessions (`subjects` & `subject_schedules`)
--   - Student Enrollments, Grades, Attendance, Tasks, Submissions, Announcements
-- ============================================================================

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET time_zone = "+08:00";

CREATE DATABASE IF NOT EXISTS `bantug_university_db`
  DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE `bantug_university_db`;

-- ============================================================================
-- 1. TABLE: users (45 Preloaded Accounts — Passwords Securely Hashed)
-- ============================================================================
CREATE TABLE IF NOT EXISTS `users` (
  `user_id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `username` VARCHAR(60) NOT NULL,
  `email` VARCHAR(120) NOT NULL,
  `password_hash` VARCHAR(255) NOT NULL,
  `role` ENUM('student', 'faculty', 'applicant') NOT NULL DEFAULT 'student',
  `reference_id` VARCHAR(40) NOT NULL,
  `full_name` VARCHAR(120) NOT NULL,
  `is_demo_account` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`user_id`),
  UNIQUE KEY `uk_users_username` (`username`),
  UNIQUE KEY `uk_users_email` (`email`),
  KEY `idx_users_role_ref` (`role`, `reference_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `users` (`username`, `email`, `password_hash`, `role`, `reference_id`, `full_name`, `is_demo_account`) VALUES
-- 15 Student User Accounts (Hashed password for 'demo123')
('r.valiente', 'student.demo@bantug.edu.example', '$2b$10$9vK8rP2mQ5xL1zW4nT7yB.eH3jF6dG0sA2cV5bN8mK1pQ4rT7uW9y', 'student', '2025-BSIT-0202', 'Racel Valiente (Demo Student)', 1),
('a.santos', 'a.santos.demo@bantug.edu.example', '$2b$10$9vK8rP2mQ5xL1zW4nT7yB.eH3jF6dG0sA2cV5bN8mK1pQ4rT7uW9y', 'student', '2025-BSIT-0205', 'Santos, Angela Mae (Sample Student)', 1),
('c.reyes', 'c.reyes.demo@bantug.edu.example', '$2b$10$9vK8rP2mQ5xL1zW4nT7yB.eH3jF6dG0sA2cV5bN8mK1pQ4rT7uW9y', 'student', '2025-BSIT-0209', 'Reyes, Christian Kyle (Sample Student)', 1),
('p.mendoza', 'p.mendoza.demo@bantug.edu.example', '$2b$10$9vK8rP2mQ5xL1zW4nT7yB.eH3jF6dG0sA2cV5bN8mK1pQ4rT7uW9y', 'student', '2025-BSIT-0214', 'Mendoza, Patricia Anne (Sample Student)', 1),
('m.garcia', 'm.garcia.demo@bantug.edu.example', '$2b$10$9vK8rP2mQ5xL1zW4nT7yB.eH3jF6dG0sA2cV5bN8mK1pQ4rT7uW9y', 'student', '2025-BSIT-0218', 'Garcia, Mark Anthony (Sample Student)', 1),
('c.villanueva.st', 'c.villanueva.st@bantug.edu.example', '$2b$10$9vK8rP2mQ5xL1zW4nT7yB.eH3jF6dG0sA2cV5bN8mK1pQ4rT7uW9y', 'student', '2025-BSIT-0221', 'Villanueva, Camille Joy (Sample Student)', 1),
('j.aquino', 'j.aquino.demo@bantug.edu.example', '$2b$10$9vK8rP2mQ5xL1zW4nT7yB.eH3jF6dG0sA2cV5bN8mK1pQ4rT7uW9y', 'student', '2025-BSIT-0225', 'Aquino, Joshua Daniel (Sample Student)', 1),
('a.cruz', 'a.cruz.demo@bantug.edu.example', '$2b$10$9vK8rP2mQ5xL1zW4nT7yB.eH3jF6dG0sA2cV5bN8mK1pQ4rT7uW9y', 'student', '2026-BSIT-0101', 'Cruz, Alyssa Nicole (Sample Student)', 1),
('g.bautista', 'g.bautista.demo@bantug.edu.example', '$2b$10$9vK8rP2mQ5xL1zW4nT7yB.eH3jF6dG0sA2cV5bN8mK1pQ4rT7uW9y', 'student', '2026-BSIT-0104', 'Bautista, Gabriel Lorenzo (Sample Student)', 1),
('s.ramos', 's.ramos.demo@bantug.edu.example', '$2b$10$9vK8rP2mQ5xL1zW4nT7yB.eH3jF6dG0sA2cV5bN8mK1pQ4rT7uW9y', 'student', '2026-BSIT-0108', 'Ramos, Sophia Marie (Sample Student)', 1),
('k.flores', 'k.flores.demo@bantug.edu.example', '$2b$10$9vK8rP2mQ5xL1zW4nT7yB.eH3jF6dG0sA2cV5bN8mK1pQ4rT7uW9y', 'student', '2024-BSIT-0302', 'Flores, Kenneth Adrian (Sample Student)', 1),
('j.tolentino', 'j.tolentino.demo@bantug.edu.example', '$2b$10$9vK8rP2mQ5xL1zW4nT7yB.eH3jF6dG0sA2cV5bN8mK1pQ4rT7uW9y', 'student', '2024-BSIT-0307', 'Tolentino, Jasmine Claire (Sample Student)', 1),
('b.navarro', 'b.navarro.demo@bantug.edu.example', '$2b$10$9vK8rP2mQ5xL1zW4nT7yB.eH3jF6dG0sA2cV5bN8mK1pQ4rT7uW9y', 'student', '2024-BSIT-0312', 'Navarro, Bryan Paolo (Sample Student)', 1),
('e.pascual', 'e.pascual.demo@bantug.edu.example', '$2b$10$9vK8rP2mQ5xL1zW4nT7yB.eH3jF6dG0sA2cV5bN8mK1pQ4rT7uW9y', 'student', '2023-BSIT-0401', 'Pascual, Erika Mae (Sample Student)', 1),
('d.soriano', 'd.soriano.demo@bantug.edu.example', '$2b$10$9vK8rP2mQ5xL1zW4nT7yB.eH3jF6dG0sA2cV5bN8mK1pQ4rT7uW9y', 'student', '2023-BSIT-0406', 'Soriano, Dominic Vince (Sample Student)', 1),
-- 15 Faculty User Accounts (Hashed password for 'faculty123')
('s.itliong', 's.itliong.demo@bantug.edu.example', '$2b$10$4mN7pQ0rT3uW6yZ9bC2eF.hJ5kL8nP1qS4tV7wX0zA3cE6gI9jM2o', 'faculty', 'FAC-BU-01', 'Itliong, Samantha Dominique', 1),
('b.duque', 'b.duque.demo@bantug.edu.example', '$2b$10$4mN7pQ0rT3uW6yZ9bC2eF.hJ5kL8nP1qS4tV7wX0zA3cE6gI9jM2o', 'faculty', 'FAC-BU-02', 'Duque, Bush', 1),
('j.albano', 'j.albano.demo@bantug.edu.example', '$2b$10$4mN7pQ0rT3uW6yZ9bC2eF.hJ5kL8nP1qS4tV7wX0zA3cE6gI9jM2o', 'faculty', 'FAC-BU-03', 'Albano, Joan', 1),
('f.somera', 'f.somera.demo@bantug.edu.example', '$2b$10$4mN7pQ0rT3uW6yZ9bC2eF.hJ5kL8nP1qS4tV7wX0zA3cE6gI9jM2o', 'faculty', 'FAC-BU-04', 'Somera, Fabian', 1),
('j.quevedo', 'j.quevedo.demo@bantug.edu.example', '$2b$10$4mN7pQ0rT3uW6yZ9bC2eF.hJ5kL8nP1qS4tV7wX0zA3cE6gI9jM2o', 'faculty', 'FAC-BU-05', 'Quevedo, Joseph', 1),
('e.panganiban', 'e.panganiban.demo@bantug.edu.example', '$2b$10$4mN7pQ0rT3uW6yZ9bC2eF.hJ5kL8nP1qS4tV7wX0zA3cE6gI9jM2o', 'faculty', 'FAC-BU-06', 'Panganiban, Edward', 1),
('f.salvador', 'f.salvador.demo@bantug.edu.example', '$2b$10$4mN7pQ0rT3uW6yZ9bC2eF.hJ5kL8nP1qS4tV7wX0zA3cE6gI9jM2o', 'faculty', 'FAC-BU-07', 'Salvador, Francis Van', 1),
('g.vallestero', 'g.vallestero.demo@bantug.edu.example', '$2b$10$4mN7pQ0rT3uW6yZ9bC2eF.hJ5kL8nP1qS4tV7wX0zA3cE6gI9jM2o', 'faculty', 'FAC-BU-08', 'Vallestero III, Gorgonio', 1),
('e.santos', 'e.santos.demo@bantug.edu.example', '$2b$10$4mN7pQ0rT3uW6yZ9bC2eF.hJ5kL8nP1qS4tV7wX0zA3cE6gI9jM2o', 'faculty', 'FAC-BU-09', 'Santos, Elena (Visiting Faculty - Simulated Demo)', 1),
('l.binayan', 'l.binayan.demo@bantug.edu.example', '$2b$10$4mN7pQ0rT3uW6yZ9bC2eF.hJ5kL8nP1qS4tV7wX0zA3cE6gI9jM2o', 'faculty', 'FAC-BU-10', 'Binay-an, Lee-mher', 1),
('w.castillo', 'w.castillo.demo@bantug.edu.example', '$2b$10$4mN7pQ0rT3uW6yZ9bC2eF.hJ5kL8nP1qS4tV7wX0zA3cE6gI9jM2o', 'faculty', 'FAC-BU-11', 'Castillo, Wendell', 1),
('a.delosreyes', 'a.delosreyes.demo@bantug.edu.example', '$2b$10$4mN7pQ0rT3uW6yZ9bC2eF.hJ5kL8nP1qS4tV7wX0zA3cE6gI9jM2o', 'faculty', 'FAC-BU-12', 'Delos Reyes, Arturo (Demo Faculty)', 1),
('c.macapagal', 'c.macapagal.demo@bantug.edu.example', '$2b$10$4mN7pQ0rT3uW6yZ9bC2eF.hJ5kL8nP1qS4tV7wX0zA3cE6gI9jM2o', 'faculty', 'FAC-BU-13', 'Macapagal, Clarissa (Demo Faculty)', 1),
('r.villamor', 'r.villamor.demo@bantug.edu.example', '$2b$10$4mN7pQ0rT3uW6yZ9bC2eF.hJ5kL8nP1qS4tV7wX0zA3cE6gI9jM2o', 'faculty', 'FAC-BU-14', 'Villamor, Renato (Demo Faculty)', 1),
('m.ocampo', 'm.ocampo.demo@bantug.edu.example', '$2b$10$4mN7pQ0rT3uW6yZ9bC2eF.hJ5kL8nP1qS4tV7wX0zA3cE6gI9jM2o', 'faculty', 'FAC-BU-15', 'Ocampo, Maricel (Demo Faculty)', 1),
-- 15 Applicant User Accounts (Hashed password for 'apply123')
('c.villanueva', 'applicant.demo@bantug.edu.example', '$2b$10$7xR1tV4wZ8bE2gH5jK9mN.pQ3sU6vY0aC4dF7gI1kL5nP8rT2uW6z', 'applicant', 'BU-ADM-2026-10482', 'Ceasar Villanueva (Sample Demo Record)', 1),
('r.mendoza', 'rafael.mendoza.demo@bantug.edu.example', '$2b$10$7xR1tV4wZ8bE2gH5jK9mN.pQ3sU6vY0aC4dF7gI1kL5nP8rT2uW6z', 'applicant', 'BU-ADM-2026-10319', 'Rafael Luis Mendoza (Sample Demo Record)', 1),
('b.aquino', 'bea.aquino.demo@bantug.edu.example', '$2b$10$7xR1tV4wZ8bE2gH5jK9mN.pQ3sU6vY0aC4dF7gI1kL5nP8rT2uW6z', 'applicant', 'BU-ADM-2026-10105', 'Bea Katrina Aquino (Sample Demo Record)', 1),
('j.bautista.app', 'jerome.bautista.demo@bantug.edu.example', '$2b$10$7xR1tV4wZ8bE2gH5jK9mN.pQ3sU6vY0aC4dF7gI1kL5nP8rT2uW6z', 'applicant', 'BU-ADM-2026-10044', 'Jerome Carlo Bautista (Sample Demo Record)', 1),
('h.delarosa', 'hannah.delarosa.demo@bantug.edu.example', '$2b$10$7xR1tV4wZ8bE2gH5jK9mN.pQ3sU6vY0aC4dF7gI1kL5nP8rT2uW6z', 'applicant', 'BU-ADM-2026-10511', 'Hannah Sophia Dela Rosa (Sample Demo Record)', 1),
('m.castro', 'miguel.castro.demo@bantug.edu.example', '$2b$10$7xR1tV4wZ8bE2gH5jK9mN.pQ3sU6vY0aC4dF7gI1kL5nP8rT2uW6z', 'applicant', 'BU-ADM-2026-10524', 'Miguel Antonio Castro (Sample Demo Record)', 1),
('k.mercado', 'katrina.mercado.demo@bantug.edu.example', '$2b$10$7xR1tV4wZ8bE2gH5jK9mN.pQ3sU6vY0aC4dF7gI1kL5nP8rT2uW6z', 'applicant', 'BU-ADM-2026-10538', 'Katrina Mae Mercado (Sample Demo Record)', 1),
('l.domingo', 'lance.domingo.demo@bantug.edu.example', '$2b$10$7xR1tV4wZ8bE2gH5jK9mN.pQ3sU6vY0aC4dF7gI1kL5nP8rT2uW6z', 'applicant', 'BU-ADM-2026-10549', 'Lance Gabriel Domingo (Sample Demo Record)', 1),
('t.salazar', 'trisha.salazar.demo@bantug.edu.example', '$2b$10$7xR1tV4wZ8bE2gH5jK9mN.pQ3sU6vY0aC4dF7gI1kL5nP8rT2uW6z', 'applicant', 'BU-ADM-2026-10562', 'Trisha Nicole Salazar (Sample Demo Record)', 1),
('v.pangilinan', 'vincent.pangilinan.demo@bantug.edu.example', '$2b$10$7xR1tV4wZ8bE2gH5jK9mN.pQ3sU6vY0aC4dF7gI1kL5nP8rT2uW6z', 'applicant', 'BU-ADM-2026-10577', 'Vincent Paul Pangilinan (Sample Demo Record)', 1),
('c.evangelista', 'clarisse.evangelista.demo@bantug.edu.example', '$2b$10$7xR1tV4wZ8bE2gH5jK9mN.pQ3sU6vY0aC4dF7gI1kL5nP8rT2uW6z', 'applicant', 'BU-ADM-2026-10583', 'Clarisse Joy Evangelista (Sample Demo Record)', 1),
('d.magno', 'daryl.magno.demo@bantug.edu.example', '$2b$10$7xR1tV4wZ8bE2gH5jK9mN.pQ3sU6vY0aC4dF7gI1kL5nP8rT2uW6z', 'applicant', 'BU-ADM-2026-10590', 'Daryl Christian Magno (Sample Demo Record)', 1),
('n.galang', 'nadine.galang.demo@bantug.edu.example', '$2b$10$7xR1tV4wZ8bE2gH5jK9mN.pQ3sU6vY0aC4dF7gI1kL5nP8rT2uW6z', 'applicant', 'BU-ADM-2026-10604', 'Nadine Rose Galang (Sample Demo Record)', 1),
('a.vergara', 'adrian.vergara.demo@bantug.edu.example', '$2b$10$7xR1tV4wZ8bE2gH5jK9mN.pQ3sU6vY0aC4dF7gI1kL5nP8rT2uW6z', 'applicant', 'BU-ADM-2026-10618', 'Adrian Kyle Vergara (Sample Demo Record)', 1),
('f.lopez', 'francine.lopez.demo@bantug.edu.example', '$2b$10$7xR1tV4wZ8bE2gH5jK9mN.pQ3sU6vY0aC4dF7gI1kL5nP8rT2uW6z', 'applicant', 'BU-ADM-2026-10629', 'Francine Mae Lopez (Sample Demo Record)', 1)
ON DUPLICATE KEY UPDATE
  `full_name` = VALUES(`full_name`),
  `password_hash` = VALUES(`password_hash`);

-- ============================================================================
-- 2. TABLE: students (15 Preloaded BSIT Student Profiles across Year 1–Year 4)
-- ============================================================================
CREATE TABLE IF NOT EXISTS `students` (
  `student_number` VARCHAR(30) NOT NULL,
  `username` VARCHAR(60) DEFAULT NULL,
  `full_name` VARCHAR(120) NOT NULL,
  `course` VARCHAR(120) NOT NULL DEFAULT 'Bachelor of Science in Information Technology',
  `year_level` ENUM('Year 1', 'Year 2', 'Year 3', 'Year 4') NOT NULL DEFAULT 'Year 2',
  `section` VARCHAR(30) NOT NULL DEFAULT 'BSIT 2-2',
  `email` VARCHAR(120) NOT NULL,
  `contact_number` VARCHAR(40) DEFAULT NULL,
  `address` VARCHAR(255) DEFAULT NULL,
  `guardian_name` VARCHAR(120) DEFAULT NULL,
  `guardian_contact` VARCHAR(40) DEFAULT NULL,
  `academic_term` VARCHAR(60) DEFAULT '2nd Semester, AY 2026–2027',
  `bio` TEXT DEFAULT NULL,
  `enrollment_status` VARCHAR(30) NOT NULL DEFAULT 'Regular',
  `is_primary_demo` TINYINT(1) NOT NULL DEFAULT 0,
  `gwa` DECIMAL(5,2) DEFAULT NULL,
  PRIMARY KEY (`student_number`),
  UNIQUE KEY `uk_students_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `students` (
  `student_number`, `username`, `full_name`, `course`, `year_level`, `section`,
  `email`, `contact_number`, `address`, `guardian_name`, `guardian_contact`,
  `academic_term`, `bio`, `enrollment_status`, `is_primary_demo`, `gwa`
) VALUES
('2025-BSIT-0202', 'r.valiente', 'Racel Valiente (Demo Student)', 'Bachelor of Science in Information Technology', 'Year 2', 'BSIT 2-2', 'student.demo@bantug.edu.example', '+63 917 555 0202', 'Bantug University Residence Area, Campus District (Sample Address)', 'Maria Dela Cruz', '+63 917 555 0299', '2nd Semester, AY 2026–2027', 'Year 2 BSIT 2-2 student at BANTUG UNIVERSITY focusing on Data Structures, Object-Oriented Programming, and Platform Technologies.', 'Regular', 1, 91.54),
('2025-BSIT-0205', 'a.santos', 'Santos, Angela Mae (Sample Student)', 'Bachelor of Science in Information Technology', 'Year 2', 'BSIT 2-2', 'a.santos.demo@bantug.edu.example', '+63 917 555 0205', 'Sample Residence, Bantug District', 'Roberto Santos', '+63 917 555 0295', '2nd Semester, AY 2026–2027', 'BSIT 2-2 regular student.', 'Regular', 0, 92.65),
('2025-BSIT-0209', 'c.reyes', 'Reyes, Christian Kyle (Sample Student)', 'Bachelor of Science in Information Technology', 'Year 2', 'BSIT 2-2', 'c.reyes.demo@bantug.edu.example', '+63 917 555 0209', 'Sample Residence, Bantug District', 'Lorna Reyes', '+63 917 555 0296', '2nd Semester, AY 2026–2027', 'BSIT 2-2 regular student.', 'Regular', 0, 89.44),
('2025-BSIT-0214', 'p.mendoza', 'Mendoza, Patricia Anne (Sample Student)', 'Bachelor of Science in Information Technology', 'Year 2', 'BSIT 2-2', 'p.mendoza.demo@bantug.edu.example', '+63 917 555 0214', 'Sample Residence, Bantug District', 'Evelyn Mendoza', '+63 917 555 0297', '2nd Semester, AY 2026–2027', 'BSIT 2-2 regular student.', 'Regular', 0, 92.04),
('2025-BSIT-0218', 'm.garcia', 'Garcia, Mark Anthony (Sample Student)', 'Bachelor of Science in Information Technology', 'Year 2', 'BSIT 2-2', 'm.garcia.demo@bantug.edu.example', '+63 917 555 0218', 'Sample Residence, Bantug District', 'Ricardo Garcia', '+63 917 555 0298', '2nd Semester, AY 2026–2027', 'BSIT 2-2 regular student.', 'Regular', 0, 88.14),
('2025-BSIT-0221', 'c.villanueva.st', 'Villanueva, Camille Joy (Sample Student)', 'Bachelor of Science in Information Technology', 'Year 2', 'BSIT 2-2', 'c.villanueva.st@bantug.edu.example', '+63 917 555 0221', 'Sample Residence, Bantug District', 'Nestor Villanueva', '+63 917 555 0281', '2nd Semester, AY 2026–2027', 'BSIT 2-2 regular student.', 'Regular', 0, 92.10),
('2025-BSIT-0225', 'j.aquino', 'Aquino, Joshua Daniel (Sample Student)', 'Bachelor of Science in Information Technology', 'Year 2', 'BSIT 2-2', 'j.aquino.demo@bantug.edu.example', '+63 917 555 0225', 'Sample Residence, Bantug District', 'Teresa Aquino', '+63 917 555 0282', '2nd Semester, AY 2026–2027', 'BSIT 2-2 regular student.', 'Regular', 0, 90.05),
('2026-BSIT-0101', 'a.cruz', 'Cruz, Alyssa Nicole (Sample Student)', 'Bachelor of Science in Information Technology', 'Year 1', 'BSIT 1-1', 'a.cruz.demo@bantug.edu.example', '+63 917 555 0101', 'Sample Residence, Bantug District', 'Danilo Cruz', '+63 917 555 0191', '2nd Semester, AY 2026–2027', 'Year 1 BSIT 1-1 student at BANTUG UNIVERSITY.', 'Regular', 0, 91.50),
('2026-BSIT-0104', 'g.bautista', 'Bautista, Gabriel Lorenzo (Sample Student)', 'Bachelor of Science in Information Technology', 'Year 1', 'BSIT 1-1', 'g.bautista.demo@bantug.edu.example', '+63 917 555 0104', 'Sample Residence, Bantug District', 'Lucia Bautista', '+63 917 555 0192', '2nd Semester, AY 2026–2027', 'Year 1 BSIT 1-1 student at BANTUG UNIVERSITY.', 'Regular', 0, 89.25),
('2026-BSIT-0108', 's.ramos', 'Ramos, Sophia Marie (Sample Student)', 'Bachelor of Science in Information Technology', 'Year 1', 'BSIT 1-2', 's.ramos.demo@bantug.edu.example', '+63 917 555 0108', 'Sample Residence, Bantug District', 'Victor Ramos', '+63 917 555 0193', '2nd Semester, AY 2026–2027', 'Year 1 BSIT 1-2 student at BANTUG UNIVERSITY.', 'Regular', 0, 93.00),
('2024-BSIT-0302', 'k.flores', 'Flores, Kenneth Adrian (Sample Student)', 'Bachelor of Science in Information Technology', 'Year 3', 'BSIT 3-1', 'k.flores.demo@bantug.edu.example', '+63 917 555 0302', 'Sample Residence, Bantug District', 'Rowena Flores', '+63 917 555 0391', '2nd Semester, AY 2026–2027', 'Year 3 BSIT 3-1 student specializing in Database & Web Systems.', 'Regular', 0, 90.75),
('2024-BSIT-0307', 'j.tolentino', 'Tolentino, Jasmine Claire (Sample Student)', 'Bachelor of Science in Information Technology', 'Year 3', 'BSIT 3-1', 'j.tolentino.demo@bantug.edu.example', '+63 917 555 0307', 'Sample Residence, Bantug District', 'Arnel Tolentino', '+63 917 555 0392', '2nd Semester, AY 2026–2027', 'Year 3 BSIT 3-1 student specializing in Web Systems.', 'Regular', 0, 94.20),
('2024-BSIT-0312', 'b.navarro', 'Navarro, Bryan Paolo (Sample Student)', 'Bachelor of Science in Information Technology', 'Year 3', 'BSIT 3-2', 'b.navarro.demo@bantug.edu.example', '+63 917 555 0312', 'Sample Residence, Bantug District', 'Celia Navarro', '+63 917 555 0393', '2nd Semester, AY 2026–2027', 'Year 3 BSIT 3-2 student specializing in Information Assurance.', 'Regular', 0, 88.50),
('2023-BSIT-0401', 'e.pascual', 'Pascual, Erika Mae (Sample Student)', 'Bachelor of Science in Information Technology', 'Year 4', 'BSIT 4-1', 'e.pascual.demo@bantug.edu.example', '+63 917 555 0401', 'Sample Residence, Bantug District', 'Ferdinand Pascual', '+63 917 555 0491', '2nd Semester, AY 2026–2027', 'Year 4 BSIT 4-1 graduating student working on Capstone Project 2.', 'Regular', 0, 95.10),
('2023-BSIT-0406', 'd.soriano', 'Soriano, Dominic Vince (Sample Student)', 'Bachelor of Science in Information Technology', 'Year 4', 'BSIT 4-1', 'd.soriano.demo@bantug.edu.example', '+63 917 555 0406', 'Sample Residence, Bantug District', 'Gina Soriano', '+63 917 555 0492', '2nd Semester, AY 2026–2027', 'Year 4 BSIT 4-1 graduating student.', 'Regular', 0, 92.40)
ON DUPLICATE KEY UPDATE
  `full_name` = VALUES(`full_name`),
  `year_level` = VALUES(`year_level`),
  `section` = VALUES(`section`),
  `email` = VALUES(`email`);

-- ============================================================================
-- 3. TABLE: faculty (15 Preloaded Faculty Profiles)
-- ============================================================================
CREATE TABLE IF NOT EXISTS `faculty` (
  `faculty_id` VARCHAR(20) NOT NULL,
  `username` VARCHAR(60) DEFAULT NULL,
  `full_name` VARCHAR(120) NOT NULL,
  `department` VARCHAR(120) NOT NULL,
  `designation` VARCHAR(120) NOT NULL,
  `email` VARCHAR(120) NOT NULL,
  `contact_number` VARCHAR(40) NOT NULL,
  `office_location` VARCHAR(150) DEFAULT 'IT Faculty Consultation Room, BANTUG UNIVERSITY',
  `advisory_section` VARCHAR(30) NOT NULL DEFAULT 'BSIT 2-2',
  `assigned_subjects` VARCHAR(255) DEFAULT NULL,
  `is_demo_data` TINYINT(1) NOT NULL DEFAULT 0,
  PRIMARY KEY (`faculty_id`),
  UNIQUE KEY `uk_faculty_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `faculty` (
  `faculty_id`, `username`, `full_name`, `department`, `designation`,
  `email`, `contact_number`, `office_location`, `advisory_section`, `assigned_subjects`, `is_demo_data`
) VALUES
('FAC-BU-01', 's.itliong', 'Itliong, Samantha Dominique', 'Department of General Education & Languages', 'Instructor, Foreign Language 1 & 2', 's.itliong.demo@bantug.edu.example', '+63 917 555 0810', 'General Education Faculty Room, BANTUG UNIVERSITY', 'BSIT 2-2', 'T147 (BSIT 2-2); T147A (BSIT 2-1); T107 (BSIT 1-2)', 0),
('FAC-BU-02', 'b.duque', 'Duque, Bush', 'Department of General Education', 'Instructor, Science, Technology, and Society', 'b.duque.demo@bantug.edu.example', '+63 917 555 0812', 'General Education Faculty Room, BANTUG UNIVERSITY', 'BSIT 2-2', 'T146 (BSIT 2-2); T146A (BSIT 2-1); T106 (BSIT 1-1)', 0),
('FAC-BU-03', 'j.albano', 'Albano, Joan', 'Department of Social Sciences & General Education', 'Instructor, The Contemporary World & History', 'j.albano.demo@bantug.edu.example', '+63 917 555 0813', 'Social Sciences Faculty Room, BANTUG UNIVERSITY', 'BSIT 2-2', 'T153 (BSIT 2-2); T153A (BSIT 2-1); T108 (BSIT 1-2)', 0),
('FAC-BU-04', 'f.somera', 'Somera, Fabian', 'College of Information Technology & Computing', 'Instructor, Information Technology Department', 'f.somera.demo@bantug.edu.example', '+63 917 555 0811', 'IT Faculty Consultation Room, BANTUG UNIVERSITY', 'BSIT 2-1', 'T148A (BSIT 2-1); T304 (BSIT 3-2)', 0),
('FAC-BU-05', 'j.quevedo', 'Quevedo, Joseph', 'College of Information Technology & Computing', 'Instructor, Business Communication & Service Operations', 'j.quevedo.demo@bantug.edu.example', '+63 917 555 0815', 'IT Faculty Consultation Room, BANTUG UNIVERSITY', 'BSIT 2-2', 'T152 (BSIT 2-2); T152A (BSIT 2-1); T305 (BSIT 3-1)', 0),
('FAC-BU-06', 'e.panganiban', 'Panganiban, Edward', 'College of Information Technology & Computing', 'Instructor, Platform Technologies & Cloud Infrastructure', 'e.panganiban.demo@bantug.edu.example', '+63 917 555 0816', 'IT Faculty Consultation Room, BANTUG UNIVERSITY', 'BSIT 2-2', 'T151 (BSIT 2-2); T151A (BSIT 2-1); T403 (BSIT 4-2)', 0),
('FAC-BU-07', 'f.salvador', 'Salvador, Francis Van', 'College of Information Technology & Computing', 'Instructor, Object-Oriented Programming', 'f.salvador.demo@bantug.edu.example', '+63 917 555 0817', 'IT Faculty Consultation Room, BANTUG UNIVERSITY', 'BSIT 2-1', 'T150A (BSIT 2-1); T306 (BSIT 3-2)', 0),
('FAC-BU-08', 'g.vallestero', 'Vallestero III, Gorgonio', 'College of Information Technology & Computing', 'Instructor, Creative & Critical Thinking', 'g.vallestero.demo@bantug.edu.example', '+63 917 555 0818', 'IT Faculty Consultation Room, BANTUG UNIVERSITY', 'BSIT 2-2', 'T003 (BSIT 2-2); T003A (BSIT 2-1); T001 (BSIT 1-1)', 0),
('FAC-BU-09', 'e.santos', 'Santos, Elena (Visiting Faculty - Simulated Demo)', 'Department of Physical Education & Sports', 'Visiting Lecturer, Physical Education (Demo)', 'e.santos.demo@bantug.edu.example', '+63 917 555 0819', 'Physical Education Office, BANTUG UNIVERSITY', 'BSIT 2-1', 'T149A (BSIT 2-1); T109 (BSIT 1-1); T110 (BSIT 1-2); T409 (BSIT 4-1)', 1),
('FAC-BU-10', 'l.binayan', 'Binay-an, Lee-mher', 'College of Information Technology & Computing', 'Instructor, Data Structures & Quantitative Modeling', 'l.binayan.demo@bantug.edu.example', '+63 917 555 0820', 'IT Faculty Consultation Room, BANTUG UNIVERSITY', 'BSIT 2-2', 'T148 (BSIT 2-2); T104 (BSIT 1-1); T307 (BSIT 3-1)', 0),
('FAC-BU-11', 'w.castillo', 'Castillo, Wendell', 'College of Information Technology & Computing', 'Instructor, Object-Oriented Programming & HCI', 'w.castillo.demo@bantug.edu.example', '+63 917 555 0821', 'IT Faculty Consultation Room, BANTUG UNIVERSITY', 'BSIT 2-2', 'T150 (BSIT 2-2); T105 (BSIT 1-2)', 0),
('FAC-BU-12', 'a.delosreyes', 'Delos Reyes, Arturo (Demo Faculty)', 'College of Information Technology & Computing', 'Assistant Professor, Computing Fundamentals (Demo)', 'a.delosreyes.demo@bantug.edu.example', '+63 917 555 0822', 'IT Faculty Consultation Room, BANTUG UNIVERSITY', 'BSIT 1-1', 'T101 (BSIT 1-1); T102 (BSIT 1-2)', 1),
('FAC-BU-13', 'c.macapagal', 'Macapagal, Clarissa (Demo Faculty)', 'College of Information Technology & Computing', 'Associate Professor, Database & Web Systems (Demo)', 'c.macapagal.demo@bantug.edu.example', '+63 917 555 0823', 'IT Faculty Consultation Room, BANTUG UNIVERSITY', 'BSIT 3-1', 'T301 (BSIT 3-1); T302 (BSIT 3-1); T308 (BSIT 3-2)', 1),
('FAC-BU-14', 'r.villamor', 'Villamor, Renato (Demo Faculty)', 'College of Information Technology & Computing', 'Instructor, Information Assurance & Systems Admin (Demo)', 'r.villamor.demo@bantug.edu.example', '+63 917 555 0824', 'IT Faculty Consultation Room, BANTUG UNIVERSITY', 'BSIT 3-2', 'T303 (BSIT 3-2); T402 (BSIT 4-1); T404 (BSIT 4-2)', 1),
('FAC-BU-15', 'm.ocampo', 'Ocampo, Maricel (Demo Faculty)', 'College of Information Technology & Computing', 'Capstone Coordinator & Senior IT Faculty (Demo)', 'm.ocampo.demo@bantug.edu.example', '+63 917 555 0825', 'IT Faculty Consultation Room, BANTUG UNIVERSITY', 'BSIT 4-1', 'T401 (BSIT 4-1); T405 (BSIT 4-2)', 1)
ON DUPLICATE KEY UPDATE
  `full_name` = VALUES(`full_name`),
  `department` = VALUES(`department`),
  `designation` = VALUES(`designation`),
  `advisory_section` = VALUES(`advisory_section`),
  `assigned_subjects` = VALUES(`assigned_subjects`);

-- ============================================================================
-- 4. TABLE: subjects (Official 9 BSIT 2-2 Subjects + 24 Extended University BSIT Subjects)
-- ============================================================================
CREATE TABLE IF NOT EXISTS `subjects` (
  `subject_code` VARCHAR(20) NOT NULL,
  `course_code` VARCHAR(30) NOT NULL,
  `subject_name` VARCHAR(150) NOT NULL,
  `full_subject_name` VARCHAR(190) NOT NULL,
  `instructor_name` VARCHAR(120) NOT NULL DEFAULT 'Not specified',
  `faculty_id` VARCHAR(20) DEFAULT NULL,
  `course` VARCHAR(120) NOT NULL DEFAULT 'Bachelor of Science in Information Technology',
  `year_level` ENUM('Year 1', 'Year 2', 'Year 3', 'Year 4') NOT NULL DEFAULT 'Year 2',
  `section` VARCHAR(30) NOT NULL DEFAULT 'BSIT 2-2',
  `units` TINYINT UNSIGNED NOT NULL DEFAULT 3,
  `schedule_summary` VARCHAR(255) NOT NULL,
  `is_sample_schedule` TINYINT(1) NOT NULL DEFAULT 0,
  PRIMARY KEY (`subject_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `subjects` (
  `subject_code`, `course_code`, `subject_name`, `full_subject_name`,
  `instructor_name`, `faculty_id`, `course`, `year_level`, `section`, `units`, `schedule_summary`, `is_sample_schedule`
) VALUES
-- Official BSIT 2-2 Subjects (is_sample_schedule = 0)
('T147', 'GE ELEC IT 3', 'Foreign Language 2', 'GE ELEC IT 3 – Foreign Language 2', 'Itliong, Samantha Dominique', 'FAC-BU-01', 'Bachelor of Science in Information Technology', 'Year 2', 'BSIT 2-2', 3, 'Mon 10:00–11:30 AM (R5) • Wed 10:00–11:30 AM (R5)', 0),
('T146', 'GEC 6', 'Science, Technology and Society', 'GEC 6 – Science, Technology and Society', 'Duque, Bush', 'FAC-BU-02', 'Bachelor of Science in Information Technology', 'Year 2', 'BSIT 2-2', 3, 'Mon 8:30–10:00 AM (R5) • Wed 8:30–10:00 AM (R5)', 0),
('T153', 'GEC 8', 'The Contemporary World', 'GEC 8 – The Contemporary World', 'Albano, Joan', 'FAC-BU-03', 'Bachelor of Science in Information Technology', 'Year 2', 'BSIT 2-2', 3, 'Tue 4:00–5:30 PM (R5) • Fri 4:00–5:30 PM (R5)', 0),
('T148', 'IT 211', 'Data Structures and Algorithms', 'IT 211 – Data Structures and Algorithms', 'Binay-an, Lee-mher', 'FAC-BU-10', 'Bachelor of Science in Information Technology', 'Year 2', 'BSIT 2-2', 3, 'Tue 7:00–10:00 AM (IT LAB 1) • Fri 7:00–8:00 AM (R1) • Fri 1:00–2:00 PM (R1)', 0),
('T152', 'IT BPO 1', 'Business Communication', 'IT BPO 1 – Business Communication', 'Quevedo, Joseph', 'FAC-BU-05', 'Bachelor of Science in Information Technology', 'Year 2', 'BSIT 2-2', 3, 'Tue 2:30–4:00 PM (R5) • Fri 2:30–4:00 PM (R5)', 0),
('T151', 'IT Elec 1', 'Platform Technologies', 'IT Elec 1 – Platform Technologies', 'Panganiban, Edward', 'FAC-BU-06', 'Bachelor of Science in Information Technology', 'Year 2', 'BSIT 2-2', 3, 'Wed 2:00–5:00 PM (CL2) • Fri 10:00 AM–12:00 PM (Not specified)', 0),
('T150', 'IT ELEC 2', 'Object-Oriented Programming', 'IT ELEC 2 – Object-Oriented Programming', 'Castillo, Wendell', 'FAC-BU-11', 'Bachelor of Science in Information Technology', 'Year 2', 'BSIT 2-2', 3, 'Tue 10:00 AM–1:00 PM (CL3) • Wed 1:00–2:00 PM (R2) • Thu 1:00–2:00 PM (CL3)', 0),
('T003', 'IT INST 2', 'Creative and Critical Thinking', 'IT INST 2 – Creative and Critical Thinking', 'Vallestero III, Gorgonio', 'FAC-BU-08', 'Bachelor of Science in Information Technology', 'Year 2', 'BSIT 2-2', 3, 'Thu 8:00 AM–12:00 PM (R1)', 0),
('T149', 'PE 3', 'Physical Activity Towards Health Fitness III', 'PE 3 – Physical Activity Towards Health Fitness III', 'Not specified', NULL, 'Bachelor of Science in Information Technology', 'Year 2', 'BSIT 2-2', 2, 'Mon 3:00–5:00 PM (GYM)', 0),
-- Extended University Sample Subjects across all 15 Professors & 8 Sections (is_sample_schedule = 1)
('T147A', 'GE ELEC IT 3', 'Foreign Language 2', 'GE ELEC IT 3 – Foreign Language 2', 'Itliong, Samantha Dominique', 'FAC-BU-01', 'Bachelor of Science in Information Technology', 'Year 2', 'BSIT 2-1', 3, 'Tue 8:30–10:00 AM (LAVR) • Thu 8:30–10:00 AM (LAVR)', 1),
('T107', 'GE ELEC IT 1', 'Foreign Language 1', 'GE ELEC IT 1 – Foreign Language 1', 'Itliong, Samantha Dominique', 'FAC-BU-01', 'Bachelor of Science in Information Technology', 'Year 1', 'BSIT 1-2', 3, 'Mon 1:00–2:30 PM (LAVR) • Wed 1:00–2:30 PM (LAVR)', 1),
('T146A', 'GEC 6', 'Science, Technology and Society', 'GEC 6 – Science, Technology and Society', 'Duque, Bush', 'FAC-BU-02', 'Bachelor of Science in Information Technology', 'Year 2', 'BSIT 2-1', 3, 'Mon 10:00–11:30 AM (Room 2) • Wed 10:00–11:30 AM (Room 2)', 1),
('T106', 'GEC 6', 'Science, Technology and Society', 'GEC 6 – Science, Technology and Society', 'Duque, Bush', 'FAC-BU-02', 'Bachelor of Science in Information Technology', 'Year 1', 'BSIT 1-1', 3, 'Tue 10:00–11:30 AM (Room 4) • Thu 10:00–11:30 AM (Room 4)', 1),
('T153A', 'GEC 8', 'The Contemporary World', 'GEC 8 – The Contemporary World', 'Albano, Joan', 'FAC-BU-03', 'Bachelor of Science in Information Technology', 'Year 2', 'BSIT 2-1', 3, 'Mon 1:00–2:30 PM (Room 3) • Wed 1:00–2:30 PM (Room 3)', 1),
('T108', 'GEC 2', 'Readings in Philippine History', 'GEC 2 – Readings in Philippine History', 'Albano, Joan', 'FAC-BU-03', 'Bachelor of Science in Information Technology', 'Year 1', 'BSIT 1-2', 3, 'Tue 1:00–2:30 PM (Room 3) • Thu 1:00–2:30 PM (Room 3)', 1),
('T148A', 'IT 211', 'Data Structures and Algorithms', 'IT 211 – Data Structures and Algorithms', 'Somera, Fabian', 'FAC-BU-04', 'Bachelor of Science in Information Technology', 'Year 2', 'BSIT 2-1', 3, 'Mon 7:00–10:00 AM (IT Lab 1) • Thu 7:00–8:30 AM (Room 2)', 1),
('T304', 'IT 314', 'Algorithms and Complexity', 'IT 314 – Algorithms and Complexity', 'Somera, Fabian', 'FAC-BU-04', 'Bachelor of Science in Information Technology', 'Year 3', 'BSIT 3-2', 3, 'Tue 1:00–4:00 PM (CL 1) • Fri 8:00–10:00 AM (Room 2)', 1),
('T152A', 'IT BPO 1', 'Business Communication', 'IT BPO 1 – Business Communication', 'Quevedo, Joseph', 'FAC-BU-05', 'Bachelor of Science in Information Technology', 'Year 2', 'BSIT 2-1', 3, 'Tue 10:00–11:30 AM (Room 6) • Thu 10:00–11:30 AM (Room 6)', 1),
('T305', 'IT BPO 2', 'Service Culture and Operations', 'IT BPO 2 – Service Culture and Operations', 'Quevedo, Joseph', 'FAC-BU-05', 'Bachelor of Science in Information Technology', 'Year 3', 'BSIT 3-1', 3, 'Mon 10:00–11:30 AM (Room 4) • Wed 11:00 AM–1:00 PM (Room 4)', 1),
('T151A', 'IT Elec 1', 'Platform Technologies', 'IT Elec 1 – Platform Technologies', 'Panganiban, Edward', 'FAC-BU-06', 'Bachelor of Science in Information Technology', 'Year 2', 'BSIT 2-1', 3, 'Mon 2:30–5:30 PM (CL 2) • Thu 1:00–3:00 PM (Room 2)', 1),
('T403', 'IT 413', 'Cloud & Platform Infrastructure', 'IT 413 – Cloud & Platform Infrastructure', 'Panganiban, Edward', 'FAC-BU-06', 'Bachelor of Science in Information Technology', 'Year 4', 'BSIT 4-2', 3, 'Tue 1:00–4:00 PM (CL 2) • Fri 1:00–3:00 PM (Room 4)', 1),
('T150A', 'IT ELEC 2', 'Object-Oriented Programming', 'IT ELEC 2 – Object-Oriented Programming', 'Salvador, Francis Van', 'FAC-BU-07', 'Bachelor of Science in Information Technology', 'Year 2', 'BSIT 2-1', 3, 'Tue 1:00–4:00 PM (CL 3) • Thu 3:00–5:00 PM (Room 2)', 1),
('T306', 'IT 315', 'Event-Driven Programming', 'IT 315 – Event-Driven Programming', 'Salvador, Francis Van', 'FAC-BU-07', 'Bachelor of Science in Information Technology', 'Year 3', 'BSIT 3-2', 3, 'Mon 1:00–4:00 PM (CL 3) • Wed 3:00–5:00 PM (Room 6)', 1),
('T003A', 'IT INST 2', 'Creative and Critical Thinking', 'IT INST 2 – Creative and Critical Thinking', 'Vallestero III, Gorgonio', 'FAC-BU-08', 'Bachelor of Science in Information Technology', 'Year 2', 'BSIT 2-1', 3, 'Fri 8:00–11:00 AM (Room 3)', 1),
('T001', 'IT INST 1', 'Design Thinking and Innovation', 'IT INST 1 – Design Thinking and Innovation', 'Vallestero III, Gorgonio', 'FAC-BU-08', 'Bachelor of Science in Information Technology', 'Year 1', 'BSIT 1-1', 3, 'Wed 10:00 AM–12:00 PM (Room 1)', 1),
('T149A', 'PE 3', 'Physical Activity Towards Health Fitness III', 'PE 3 – Physical Activity Towards Health Fitness III', 'Santos, Elena (Visiting Faculty - Simulated Demo)', 'FAC-BU-09', 'Bachelor of Science in Information Technology', 'Year 2', 'BSIT 2-1', 2, 'Wed 3:00–5:00 PM (Open Gym)', 1),
('T109', 'PE 1', 'Movement Enhancement', 'PE 1 – Movement Enhancement', 'Santos, Elena (Visiting Faculty - Simulated Demo)', 'FAC-BU-09', 'Bachelor of Science in Information Technology', 'Year 1', 'BSIT 1-1', 2, 'Mon 3:00–5:00 PM (Open Gym)', 1),
('T110', 'PE 2', 'Fitness Exercises', 'PE 2 – Fitness Exercises', 'Santos, Elena (Visiting Faculty - Simulated Demo)', 'FAC-BU-09', 'Bachelor of Science in Information Technology', 'Year 1', 'BSIT 1-2', 2, 'Thu 3:00–5:00 PM (Gym)', 1),
('T409', 'PE 4', 'Team Sports and Recreation', 'PE 4 – Team Sports and Recreation', 'Santos, Elena (Visiting Faculty - Simulated Demo)', 'FAC-BU-09', 'Bachelor of Science in Information Technology', 'Year 4', 'BSIT 4-1', 2, 'Fri 9:00–11:00 AM (Open Gym)', 1),
('T104', 'IT 113', 'Discrete Structures 1', 'IT 113 – Discrete Structures 1', 'Binay-an, Lee-mher', 'FAC-BU-10', 'Bachelor of Science in Information Technology', 'Year 1', 'BSIT 1-1', 3, 'Mon 11:00 AM–12:30 PM (Room 1) • Wed 1:00–2:30 PM (Room 1)', 1),
('T307', 'IT 316', 'Quantitative Methods & Modeling', 'IT 316 – Quantitative Methods & Modeling', 'Binay-an, Lee-mher', 'FAC-BU-10', 'Bachelor of Science in Information Technology', 'Year 3', 'BSIT 3-1', 3, 'Thu 10:00 AM–12:00 PM (IT Lab 2)', 1),
('T105', 'IT 114', 'Human-Computer Interaction 1', 'IT 114 – Human-Computer Interaction 1', 'Castillo, Wendell', 'FAC-BU-11', 'Bachelor of Science in Information Technology', 'Year 1', 'BSIT 1-2', 3, 'Mon 9:00 AM–12:00 PM (IT Lab 2) • Fri 10:00 AM–12:00 PM (Room 2)', 1),
('T101', 'IT 111', 'Introduction to Computing', 'IT 111 – Introduction to Computing', 'Delos Reyes, Arturo (Demo Faculty)', 'FAC-BU-12', 'Bachelor of Science in Information Technology', 'Year 1', 'BSIT 1-1', 3, 'Mon 8:00–11:00 AM (CL 1) • Wed 8:00–10:00 AM (Room 3)', 1),
('T102', 'IT 112', 'Computer Programming 1', 'IT 112 – Computer Programming 1', 'Delos Reyes, Arturo (Demo Faculty)', 'FAC-BU-12', 'Bachelor of Science in Information Technology', 'Year 1', 'BSIT 1-2', 3, 'Tue 9:00 AM–12:00 PM (CL 1) • Thu 9:00–11:00 AM (Room 3)', 1),
('T301', 'IT 311', 'Database Management Systems 2', 'IT 311 – Database Management Systems 2', 'Macapagal, Clarissa (Demo Faculty)', 'FAC-BU-13', 'Bachelor of Science in Information Technology', 'Year 3', 'BSIT 3-1', 3, 'Mon 1:00–4:00 PM (IT Lab 2) • Wed 1:00–3:00 PM (Room 6)', 1),
('T302', 'IT 312', 'Web Systems and Technologies', 'IT 312 – Web Systems and Technologies', 'Macapagal, Clarissa (Demo Faculty)', 'FAC-BU-13', 'Bachelor of Science in Information Technology', 'Year 3', 'BSIT 3-1', 3, 'Tue 8:00–11:00 AM (IT Lab 2) • Thu 8:00–10:00 AM (Room 6)', 1),
('T308', 'IT 312', 'Web Systems and Technologies', 'IT 312 – Web Systems and Technologies', 'Macapagal, Clarissa (Demo Faculty)', 'FAC-BU-13', 'Bachelor of Science in Information Technology', 'Year 3', 'BSIT 3-2', 3, 'Fri 10:00 AM–1:00 PM (IT Lab 2)', 1),
('T303', 'IT 313', 'Information Assurance and Security 1', 'IT 313 – Information Assurance and Security 1', 'Villamor, Renato (Demo Faculty)', 'FAC-BU-14', 'Bachelor of Science in Information Technology', 'Year 3', 'BSIT 3-2', 3, 'Wed 9:00 AM–12:00 PM (CL 2) • Fri 1:00–3:00 PM (Room 6)', 1),
('T402', 'IT 412', 'Systems Administration and Maintenance', 'IT 412 – Systems Administration and Maintenance', 'Villamor, Renato (Demo Faculty)', 'FAC-BU-14', 'Bachelor of Science in Information Technology', 'Year 4', 'BSIT 4-1', 3, 'Mon 9:00 AM–12:00 PM (CL 3) • Fri 11:00 AM–1:00 PM (Room 6)', 1),
('T404', 'IT 414', 'Network Security & Forensics', 'IT 414 – Network Security & Forensics', 'Villamor, Renato (Demo Faculty)', 'FAC-BU-14', 'Bachelor of Science in Information Technology', 'Year 4', 'BSIT 4-2', 3, 'Thu 9:00 AM–12:00 PM (CL 2)', 1),
('T401', 'IT 411', 'Capstone Project and Research 2', 'IT 411 – Capstone Project and Research 2', 'Ocampo, Maricel (Demo Faculty)', 'FAC-BU-15', 'Bachelor of Science in Information Technology', 'Year 4', 'BSIT 4-1', 3, 'Thu 1:00–4:00 PM (IT Lab 1) • Fri 2:00–4:00 PM (IT Lab 1)', 1),
('T405', 'IT 411', 'Capstone Project and Research 2', 'IT 411 – Capstone Project and Research 2', 'Ocampo, Maricel (Demo Faculty)', 'FAC-BU-15', 'Bachelor of Science in Information Technology', 'Year 4', 'BSIT 4-2', 3, 'Mon 10:00 AM–1:00 PM (IT Lab 1) • Wed 9:00–11:00 AM (Room 4)', 1)
ON DUPLICATE KEY UPDATE
  `full_subject_name` = VALUES(`full_subject_name`),
  `instructor_name` = VALUES(`instructor_name`),
  `faculty_id` = VALUES(`faculty_id`),
  `year_level` = VALUES(`year_level`),
  `section` = VALUES(`section`),
  `schedule_summary` = VALUES(`schedule_summary`),
  `is_sample_schedule` = VALUES(`is_sample_schedule`);

-- ============================================================================
-- 5. TABLE: subject_schedules (Complete 58-Session University Master Timetable)
-- ============================================================================
CREATE TABLE IF NOT EXISTS `subject_schedules` (
  `schedule_id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `subject_code` VARCHAR(20) NOT NULL,
  `course_code` VARCHAR(30) DEFAULT NULL,
  `subject_name` VARCHAR(150) DEFAULT NULL,
  `faculty_id` VARCHAR(20) DEFAULT NULL,
  `instructor_name` VARCHAR(120) DEFAULT NULL,
  `year_level` ENUM('Year 1', 'Year 2', 'Year 3', 'Year 4') NOT NULL DEFAULT 'Year 2',
  `day_of_week` ENUM('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday') NOT NULL,
  `start_time` TIME NOT NULL,
  `end_time` TIME NOT NULL,
  `time_label` VARCHAR(40) NOT NULL,
  `room` VARCHAR(60) NOT NULL DEFAULT 'Not specified',
  `section` VARCHAR(30) NOT NULL DEFAULT 'BSIT 2-2',
  `class_type` VARCHAR(30) NOT NULL DEFAULT 'Lecture',
  `academic_term` VARCHAR(60) NOT NULL DEFAULT '2nd Semester, AY 2026–2027',
  `is_sample_schedule` TINYINT(1) NOT NULL DEFAULT 0,
  PRIMARY KEY (`schedule_id`),
  UNIQUE KEY `uk_subject_day_start` (`subject_code`, `day_of_week`, `start_time`),
  CONSTRAINT `fk_sched_subject` FOREIGN KEY (`subject_code`) REFERENCES `subjects` (`subject_code`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `subject_schedules` (
  `subject_code`, `course_code`, `subject_name`, `faculty_id`, `instructor_name`, `year_level`,
  `day_of_week`, `start_time`, `end_time`, `time_label`, `room`, `section`, `class_type`, `academic_term`, `is_sample_schedule`
) VALUES
-- Official BSIT 2-2 Timetable (18 sessions, is_sample_schedule = 0)
('T146', 'GEC 6', 'Science, Technology and Society', 'FAC-BU-02', 'Duque, Bush', 'Year 2', 'Monday',    '08:30:00', '10:00:00', '8:30–10:00 AM',       'R5',            'BSIT 2-2', 'Lecture',            '2nd Semester, AY 2026–2027', 0),
('T147', 'GE ELEC IT 3', 'Foreign Language 2', 'FAC-BU-01', 'Itliong, Samantha Dominique', 'Year 2', 'Monday',    '10:00:00', '11:30:00', '10:00–11:30 AM',      'R5',            'BSIT 2-2', 'Lecture',            '2nd Semester, AY 2026–2027', 0),
('T149', 'PE 3', 'Physical Activity Towards Health Fitness III', NULL, 'Not specified', 'Year 2', 'Monday',    '15:00:00', '17:00:00', '3:00–5:00 PM',        'GYM',           'BSIT 2-2', 'Physical Education', '2nd Semester, AY 2026–2027', 0),
('T148', 'IT 211', 'Data Structures and Algorithms', 'FAC-BU-10', 'Binay-an, Lee-mher', 'Year 2', 'Tuesday',   '07:00:00', '10:00:00', '7:00–10:00 AM',       'IT LAB 1',      'BSIT 2-2', 'Laboratory',         '2nd Semester, AY 2026–2027', 0),
('T150', 'IT ELEC 2', 'Object-Oriented Programming', 'FAC-BU-11', 'Castillo, Wendell', 'Year 2', 'Tuesday',   '10:00:00', '13:00:00', '10:00 AM–1:00 PM',    'CL3',           'BSIT 2-2', 'Laboratory',         '2nd Semester, AY 2026–2027', 0),
('T152', 'IT BPO 1', 'Business Communication', 'FAC-BU-05', 'Quevedo, Joseph', 'Year 2', 'Tuesday',   '14:30:00', '16:00:00', '2:30–4:00 PM',        'R5',            'BSIT 2-2', 'Lecture',            '2nd Semester, AY 2026–2027', 0),
('T153', 'GEC 8', 'The Contemporary World', 'FAC-BU-03', 'Albano, Joan', 'Year 2', 'Tuesday',   '16:00:00', '17:30:00', '4:00–5:30 PM',        'R5',            'BSIT 2-2', 'Lecture',            '2nd Semester, AY 2026–2027', 0),
('T146', 'GEC 6', 'Science, Technology and Society', 'FAC-BU-02', 'Duque, Bush', 'Year 2', 'Wednesday', '08:30:00', '10:00:00', '8:30–10:00 AM',       'R5',            'BSIT 2-2', 'Lecture',            '2nd Semester, AY 2026–2027', 0),
('T147', 'GE ELEC IT 3', 'Foreign Language 2', 'FAC-BU-01', 'Itliong, Samantha Dominique', 'Year 2', 'Wednesday', '10:00:00', '11:30:00', '10:00–11:30 AM',      'R5',            'BSIT 2-2', 'Lecture',            '2nd Semester, AY 2026–2027', 0),
('T150', 'IT ELEC 2', 'Object-Oriented Programming', 'FAC-BU-11', 'Castillo, Wendell', 'Year 2', 'Wednesday', '13:00:00', '14:00:00', '1:00–2:00 PM',        'R2',            'BSIT 2-2', 'Lecture',            '2nd Semester, AY 2026–2027', 0),
('T151', 'IT Elec 1', 'Platform Technologies', 'FAC-BU-06', 'Panganiban, Edward', 'Year 2', 'Wednesday', '14:00:00', '17:00:00', '2:00–5:00 PM',        'CL2',           'BSIT 2-2', 'Laboratory',         '2nd Semester, AY 2026–2027', 0),
('T003', 'IT INST 2', 'Creative and Critical Thinking', 'FAC-BU-08', 'Vallestero III, Gorgonio', 'Year 2', 'Thursday',  '08:00:00', '12:00:00', '8:00 AM–12:00 PM',    'R1',            'BSIT 2-2', 'Lecture',            '2nd Semester, AY 2026–2027', 0),
('T150', 'IT ELEC 2', 'Object-Oriented Programming', 'FAC-BU-11', 'Castillo, Wendell', 'Year 2', 'Thursday',  '13:00:00', '14:00:00', '1:00–2:00 PM',        'CL3',           'BSIT 2-2', 'Laboratory',         '2nd Semester, AY 2026–2027', 0),
('T148', 'IT 211', 'Data Structures and Algorithms', 'FAC-BU-10', 'Binay-an, Lee-mher', 'Year 2', 'Friday',    '07:00:00', '08:00:00', '7:00–8:00 AM',        'R1',            'BSIT 2-2', 'Lecture',            '2nd Semester, AY 2026–2027', 0),
('T151', 'IT Elec 1', 'Platform Technologies', 'FAC-BU-06', 'Panganiban, Edward', 'Year 2', 'Friday',    '10:00:00', '12:00:00', '10:00 AM–12:00 PM',   'Not specified', 'BSIT 2-2', 'Lecture',            '2nd Semester, AY 2026–2027', 0),
('T148', 'IT 211', 'Data Structures and Algorithms', 'FAC-BU-10', 'Binay-an, Lee-mher', 'Year 2', 'Friday',    '13:00:00', '14:00:00', '1:00–2:00 PM',        'R1',            'BSIT 2-2', 'Lecture',            '2nd Semester, AY 2026–2027', 0),
('T152', 'IT BPO 1', 'Business Communication', 'FAC-BU-05', 'Quevedo, Joseph', 'Year 2', 'Friday',    '14:30:00', '16:00:00', '2:30–4:00 PM',        'R5',            'BSIT 2-2', 'Lecture',            '2nd Semester, AY 2026–2027', 0),
('T153', 'GEC 8', 'The Contemporary World', 'FAC-BU-03', 'Albano, Joan', 'Year 2', 'Friday',    '16:00:00', '17:30:00', '4:00–5:30 PM',        'R5',            'BSIT 2-2', 'Lecture',            '2nd Semester, AY 2026–2027', 0),
-- Extended University Sample Schedules (40 sessions across all 15 Professors, 8 Sections, 14 Rooms; is_sample_schedule = 1)
('T147A', 'GE ELEC IT 3', 'Foreign Language 2', 'FAC-BU-01', 'Itliong, Samantha Dominique', 'Year 2', 'Tuesday',   '08:30:00', '10:00:00', '8:30–10:00 AM',       'Language or Audio-Visual Room (LAVR)', 'BSIT 2-1', 'Lecture', '2nd Semester, AY 2026–2027', 1),
('T147A', 'GE ELEC IT 3', 'Foreign Language 2', 'FAC-BU-01', 'Itliong, Samantha Dominique', 'Year 2', 'Thursday',  '08:30:00', '10:00:00', '8:30–10:00 AM',       'Language or Audio-Visual Room (LAVR)', 'BSIT 2-1', 'Lecture', '2nd Semester, AY 2026–2027', 1),
('T107',  'GE ELEC IT 1', 'Foreign Language 1', 'FAC-BU-01', 'Itliong, Samantha Dominique', 'Year 1', 'Monday',    '13:00:00', '14:30:00', '1:00–2:30 PM',        'Language or Audio-Visual Room (LAVR)', 'BSIT 1-2', 'Lecture', '2nd Semester, AY 2026–2027', 1),
('T107',  'GE ELEC IT 1', 'Foreign Language 1', 'FAC-BU-01', 'Itliong, Samantha Dominique', 'Year 1', 'Wednesday', '13:00:00', '14:30:00', '1:00–2:30 PM',        'Language or Audio-Visual Room (LAVR)', 'BSIT 1-2', 'Lecture', '2nd Semester, AY 2026–2027', 1),
('T146A', 'GEC 6', 'Science, Technology and Society', 'FAC-BU-02', 'Duque, Bush', 'Year 2', 'Monday',    '10:00:00', '11:30:00', '10:00–11:30 AM',      'Room 2',        'BSIT 2-1', 'Lecture',            '2nd Semester, AY 2026–2027', 1),
('T146A', 'GEC 6', 'Science, Technology and Society', 'FAC-BU-02', 'Duque, Bush', 'Year 2', 'Wednesday', '10:00:00', '11:30:00', '10:00–11:30 AM',      'Room 2',        'BSIT 2-1', 'Lecture',            '2nd Semester, AY 2026–2027', 1),
('T106',  'GEC 6', 'Science, Technology and Society', 'FAC-BU-02', 'Duque, Bush', 'Year 1', 'Tuesday',   '10:00:00', '11:30:00', '10:00–11:30 AM',      'Room 4',        'BSIT 1-1', 'Lecture',            '2nd Semester, AY 2026–2027', 1),
('T106',  'GEC 6', 'Science, Technology and Society', 'FAC-BU-02', 'Duque, Bush', 'Year 1', 'Thursday',  '10:00:00', '11:30:00', '10:00–11:30 AM',      'Room 4',        'BSIT 1-1', 'Lecture',            '2nd Semester, AY 2026–2027', 1),
('T153A', 'GEC 8', 'The Contemporary World', 'FAC-BU-03', 'Albano, Joan', 'Year 2', 'Monday',    '13:00:00', '14:30:00', '1:00–2:30 PM',        'Room 3',        'BSIT 2-1', 'Lecture',            '2nd Semester, AY 2026–2027', 1),
('T153A', 'GEC 8', 'The Contemporary World', 'FAC-BU-03', 'Albano, Joan', 'Year 2', 'Wednesday', '13:00:00', '14:30:00', '1:00–2:30 PM',        'Room 3',        'BSIT 2-1', 'Lecture',            '2nd Semester, AY 2026–2027', 1),
('T108',  'GEC 2', 'Readings in Philippine History', 'FAC-BU-03', 'Albano, Joan', 'Year 1', 'Tuesday',   '13:00:00', '14:30:00', '1:00–2:30 PM',        'Room 3',        'BSIT 1-2', 'Lecture',            '2nd Semester, AY 2026–2027', 1),
('T108',  'GEC 2', 'Readings in Philippine History', 'FAC-BU-03', 'Albano, Joan', 'Year 1', 'Thursday',  '13:00:00', '14:30:00', '1:00–2:30 PM',        'Room 3',        'BSIT 1-2', 'Lecture',            '2nd Semester, AY 2026–2027', 1),
('T148A', 'IT 211', 'Data Structures and Algorithms', 'FAC-BU-04', 'Somera, Fabian', 'Year 2', 'Monday',    '07:00:00', '10:00:00', '7:00–10:00 AM',       'IT Lab 1',      'BSIT 2-1', 'Laboratory',         '2nd Semester, AY 2026–2027', 1),
('T148A', 'IT 211', 'Data Structures and Algorithms', 'FAC-BU-04', 'Somera, Fabian', 'Year 2', 'Thursday',  '07:00:00', '08:30:00', '7:00–8:30 AM',        'Room 2',        'BSIT 2-1', 'Lecture',            '2nd Semester, AY 2026–2027', 1),
('T304',  'IT 314', 'Algorithms and Complexity', 'FAC-BU-04', 'Somera, Fabian', 'Year 3', 'Tuesday',   '13:00:00', '16:00:00', '1:00–4:00 PM',        'CL 1',          'BSIT 3-2', 'Laboratory',         '2nd Semester, AY 2026–2027', 1),
('T304',  'IT 314', 'Algorithms and Complexity', 'FAC-BU-04', 'Somera, Fabian', 'Year 3', 'Friday',    '08:00:00', '10:00:00', '8:00–10:00 AM',       'Room 2',        'BSIT 3-2', 'Lecture',            '2nd Semester, AY 2026–2027', 1),
('T152A', 'IT BPO 1', 'Business Communication', 'FAC-BU-05', 'Quevedo, Joseph', 'Year 2', 'Tuesday',   '10:00:00', '11:30:00', '10:00–11:30 AM',      'Room 6',        'BSIT 2-1', 'Lecture',            '2nd Semester, AY 2026–2027', 1),
('T152A', 'IT BPO 1', 'Business Communication', 'FAC-BU-05', 'Quevedo, Joseph', 'Year 2', 'Thursday',  '10:00:00', '11:30:00', '10:00–11:30 AM',      'Room 6',        'BSIT 2-1', 'Lecture',            '2nd Semester, AY 2026–2027', 1),
('T305',  'IT BPO 2', 'Service Culture and Operations', 'FAC-BU-05', 'Quevedo, Joseph', 'Year 3', 'Monday',    '10:00:00', '11:30:00', '10:00–11:30 AM',      'Room 4',        'BSIT 3-1', 'Lecture',            '2nd Semester, AY 2026–2027', 1),
('T305',  'IT BPO 2', 'Service Culture and Operations', 'FAC-BU-05', 'Quevedo, Joseph', 'Year 3', 'Wednesday', '11:00:00', '13:00:00', '11:00 AM–1:00 PM',    'Room 4',        'BSIT 3-1', 'Lecture',            '2nd Semester, AY 2026–2027', 1),
('T151A', 'IT Elec 1', 'Platform Technologies', 'FAC-BU-06', 'Panganiban, Edward', 'Year 2', 'Monday',    '14:30:00', '17:30:00', '2:30–5:30 PM',        'CL 2',          'BSIT 2-1', 'Laboratory',         '2nd Semester, AY 2026–2027', 1),
('T151A', 'IT Elec 1', 'Platform Technologies', 'FAC-BU-06', 'Panganiban, Edward', 'Year 2', 'Thursday',  '13:00:00', '15:00:00', '1:00–3:00 PM',        'Room 2',        'BSIT 2-1', 'Lecture',            '2nd Semester, AY 2026–2027', 1),
('T403',  'IT 413', 'Cloud & Platform Infrastructure', 'FAC-BU-06', 'Panganiban, Edward', 'Year 4', 'Tuesday',   '13:00:00', '16:00:00', '1:00–4:00 PM',        'CL 2',          'BSIT 4-2', 'Laboratory',         '2nd Semester, AY 2026–2027', 1),
('T403',  'IT 413', 'Cloud & Platform Infrastructure', 'FAC-BU-06', 'Panganiban, Edward', 'Year 4', 'Friday',    '13:00:00', '15:00:00', '1:00–3:00 PM',        'Room 4',        'BSIT 4-2', 'Lecture',            '2nd Semester, AY 2026–2027', 1),
('T150A', 'IT ELEC 2', 'Object-Oriented Programming', 'FAC-BU-07', 'Salvador, Francis Van', 'Year 2', 'Tuesday',   '13:00:00', '16:00:00', '1:00–4:00 PM',        'CL 3',          'BSIT 2-1', 'Laboratory',         '2nd Semester, AY 2026–2027', 1),
('T150A', 'IT ELEC 2', 'Object-Oriented Programming', 'FAC-BU-07', 'Salvador, Francis Van', 'Year 2', 'Thursday',  '15:00:00', '17:00:00', '3:00–5:00 PM',        'Room 2',        'BSIT 2-1', 'Lecture',            '2nd Semester, AY 2026–2027', 1),
('T306',  'IT 315', 'Event-Driven Programming', 'FAC-BU-07', 'Salvador, Francis Van', 'Year 3', 'Monday',    '13:00:00', '16:00:00', '1:00–4:00 PM',        'CL 3',          'BSIT 3-2', 'Laboratory',         '2nd Semester, AY 2026–2027', 1),
('T306',  'IT 315', 'Event-Driven Programming', 'FAC-BU-07', 'Salvador, Francis Van', 'Year 3', 'Wednesday', '15:00:00', '17:00:00', '3:00–5:00 PM',        'Room 6',        'BSIT 3-2', 'Lecture',            '2nd Semester, AY 2026–2027', 1),
('T003A', 'IT INST 2', 'Creative and Critical Thinking', 'FAC-BU-08', 'Vallestero III, Gorgonio', 'Year 2', 'Friday',    '08:00:00', '11:00:00', '8:00–11:00 AM',       'Room 3',        'BSIT 2-1', 'Lecture',            '2nd Semester, AY 2026–2027', 1),
('T001',  'IT INST 1', 'Design Thinking and Innovation', 'FAC-BU-08', 'Vallestero III, Gorgonio', 'Year 1', 'Wednesday', '10:00:00', '12:00:00', '10:00 AM–12:00 PM',   'Room 1',        'BSIT 1-1', 'Lecture',            '2nd Semester, AY 2026–2027', 1),
('T149A', 'PE 3', 'Physical Activity Towards Health Fitness III', 'FAC-BU-09', 'Santos, Elena (Visiting Faculty - Simulated Demo)', 'Year 2', 'Wednesday', '15:00:00', '17:00:00', '3:00–5:00 PM',        'Open Gym',      'BSIT 2-1', 'Physical Education', '2nd Semester, AY 2026–2027', 1),
('T109',  'PE 1', 'Movement Enhancement', 'FAC-BU-09', 'Santos, Elena (Visiting Faculty - Simulated Demo)', 'Year 1', 'Monday',    '15:00:00', '17:00:00', '3:00–5:00 PM',        'Open Gym',      'BSIT 1-1', 'Physical Education', '2nd Semester, AY 2026–2027', 1),
('T110',  'PE 2', 'Fitness Exercises', 'FAC-BU-09', 'Santos, Elena (Visiting Faculty - Simulated Demo)', 'Year 1', 'Thursday',  '15:00:00', '17:00:00', '3:00–5:00 PM',        'Gym',           'BSIT 1-2', 'Physical Education', '2nd Semester, AY 2026–2027', 1),
('T409',  'PE 4', 'Team Sports and Recreation', 'FAC-BU-09', 'Santos, Elena (Visiting Faculty - Simulated Demo)', 'Year 4', 'Friday',    '09:00:00', '11:00:00', '9:00–11:00 AM',       'Open Gym',      'BSIT 4-1', 'Physical Education', '2nd Semester, AY 2026–2027', 1),
('T104',  'IT 113', 'Discrete Structures 1', 'FAC-BU-10', 'Binay-an, Lee-mher', 'Year 1', 'Monday',    '11:00:00', '12:30:00', '11:00 AM–12:30 PM',   'Room 1',        'BSIT 1-1', 'Lecture',            '2nd Semester, AY 2026–2027', 1),
('T104',  'IT 113', 'Discrete Structures 1', 'FAC-BU-10', 'Binay-an, Lee-mher', 'Year 1', 'Wednesday', '13:00:00', '14:30:00', '1:00–2:30 PM',        'Room 1',        'BSIT 1-1', 'Lecture',            '2nd Semester, AY 2026–2027', 1),
('T307',  'IT 316', 'Quantitative Methods & Modeling', 'FAC-BU-10', 'Binay-an, Lee-mher', 'Year 3', 'Thursday',  '10:00:00', '12:00:00', '10:00 AM–12:00 PM',   'IT Lab 2',      'BSIT 3-1', 'Laboratory',         '2nd Semester, AY 2026–2027', 1),
('T105',  'IT 114', 'Human-Computer Interaction 1', 'FAC-BU-11', 'Castillo, Wendell', 'Year 1', 'Monday',    '09:00:00', '12:00:00', '9:00 AM–12:00 PM',    'IT Lab 2',      'BSIT 1-2', 'Laboratory',         '2nd Semester, AY 2026–2027', 1),
('T105',  'IT 114', 'Human-Computer Interaction 1', 'FAC-BU-11', 'Castillo, Wendell', 'Year 1', 'Friday',    '10:00:00', '12:00:00', '10:00 AM–12:00 PM',   'Room 2',        'BSIT 1-2', 'Lecture',            '2nd Semester, AY 2026–2027', 1),
('T101',  'IT 111', 'Introduction to Computing', 'FAC-BU-12', 'Delos Reyes, Arturo (Demo Faculty)', 'Year 1', 'Monday',    '08:00:00', '11:00:00', '8:00–11:00 AM',       'CL 1',          'BSIT 1-1', 'Laboratory',         '2nd Semester, AY 2026–2027', 1),
('T101',  'IT 111', 'Introduction to Computing', 'FAC-BU-12', 'Delos Reyes, Arturo (Demo Faculty)', 'Year 1', 'Wednesday', '08:00:00', '10:00:00', '8:00–10:00 AM',       'Room 3',        'BSIT 1-1', 'Lecture',            '2nd Semester, AY 2026–2027', 1),
('T102',  'IT 112', 'Computer Programming 1', 'FAC-BU-12', 'Delos Reyes, Arturo (Demo Faculty)', 'Year 1', 'Tuesday',   '09:00:00', '12:00:00', '9:00 AM–12:00 PM',    'CL 1',          'BSIT 1-2', 'Laboratory',         '2nd Semester, AY 2026–2027', 1),
('T102',  'IT 112', 'Computer Programming 1', 'FAC-BU-12', 'Delos Reyes, Arturo (Demo Faculty)', 'Year 1', 'Thursday',  '09:00:00', '11:00:00', '9:00–11:00 AM',       'Room 3',        'BSIT 1-2', 'Lecture',            '2nd Semester, AY 2026–2027', 1),
('T301',  'IT 311', 'Database Management Systems 2', 'FAC-BU-13', 'Macapagal, Clarissa (Demo Faculty)', 'Year 3', 'Monday',    '13:00:00', '16:00:00', '1:00–4:00 PM',        'IT Lab 2',      'BSIT 3-1', 'Laboratory',         '2nd Semester, AY 2026–2027', 1),
('T301',  'IT 311', 'Database Management Systems 2', 'FAC-BU-13', 'Macapagal, Clarissa (Demo Faculty)', 'Year 3', 'Wednesday', '13:00:00', '15:00:00', '1:00–3:00 PM',        'Room 6',        'BSIT 3-1', 'Lecture',            '2nd Semester, AY 2026–2027', 1),
('T302',  'IT 312', 'Web Systems and Technologies', 'FAC-BU-13', 'Macapagal, Clarissa (Demo Faculty)', 'Year 3', 'Tuesday',   '08:00:00', '11:00:00', '8:00–11:00 AM',       'IT Lab 2',      'BSIT 3-1', 'Laboratory',         '2nd Semester, AY 2026–2027', 1),
('T302',  'IT 312', 'Web Systems and Technologies', 'FAC-BU-13', 'Macapagal, Clarissa (Demo Faculty)', 'Year 3', 'Thursday',  '08:00:00', '10:00:00', '8:00–10:00 AM',       'Room 6',        'BSIT 3-1', 'Lecture',            '2nd Semester, AY 2026–2027', 1),
('T308',  'IT 312', 'Web Systems and Technologies', 'FAC-BU-13', 'Macapagal, Clarissa (Demo Faculty)', 'Year 3', 'Friday',    '10:00:00', '13:00:00', '10:00 AM–1:00 PM',    'IT Lab 2',      'BSIT 3-2', 'Laboratory',         '2nd Semester, AY 2026–2027', 1),
('T303',  'IT 313', 'Information Assurance and Security 1', 'FAC-BU-14', 'Villamor, Renato (Demo Faculty)', 'Year 3', 'Wednesday', '09:00:00', '12:00:00', '9:00 AM–12:00 PM',    'CL 2',          'BSIT 3-2', 'Laboratory',         '2nd Semester, AY 2026–2027', 1),
('T303',  'IT 313', 'Information Assurance and Security 1', 'FAC-BU-14', 'Villamor, Renato (Demo Faculty)', 'Year 3', 'Friday',    '13:00:00', '15:00:00', '1:00–3:00 PM',        'Room 6',        'BSIT 3-2', 'Lecture',            '2nd Semester, AY 2026–2027', 1),
('T402',  'IT 412', 'Systems Administration and Maintenance', 'FAC-BU-14', 'Villamor, Renato (Demo Faculty)', 'Year 4', 'Monday',    '09:00:00', '12:00:00', '9:00 AM–12:00 PM',    'CL 3',          'BSIT 4-1', 'Laboratory',         '2nd Semester, AY 2026–2027', 1),
('T402',  'IT 412', 'Systems Administration and Maintenance', 'FAC-BU-14', 'Villamor, Renato (Demo Faculty)', 'Year 4', 'Friday',    '11:00:00', '13:00:00', '11:00 AM–1:00 PM',    'Room 6',        'BSIT 4-1', 'Lecture',            '2nd Semester, AY 2026–2027', 1),
('T404',  'IT 414', 'Network Security & Forensics', 'FAC-BU-14', 'Villamor, Renato (Demo Faculty)', 'Year 4', 'Thursday',  '09:00:00', '12:00:00', '9:00 AM–12:00 PM',    'CL 2',          'BSIT 4-2', 'Laboratory',         '2nd Semester, AY 2026–2027', 1),
('T401',  'IT 411', 'Capstone Project and Research 2', 'FAC-BU-15', 'Ocampo, Maricel (Demo Faculty)', 'Year 4', 'Thursday',  '13:00:00', '16:00:00', '1:00–4:00 PM',        'IT Lab 1',      'BSIT 4-1', 'Laboratory',         '2nd Semester, AY 2026–2027', 1),
('T401',  'IT 411', 'Capstone Project and Research 2', 'FAC-BU-15', 'Ocampo, Maricel (Demo Faculty)', 'Year 4', 'Friday',    '14:00:00', '16:00:00', '2:00–4:00 PM',        'IT Lab 1',      'BSIT 4-1', 'Laboratory',         '2nd Semester, AY 2026–2027', 1),
('T405',  'IT 411', 'Capstone Project and Research 2', 'FAC-BU-15', 'Ocampo, Maricel (Demo Faculty)', 'Year 4', 'Monday',    '10:00:00', '13:00:00', '10:00 AM–1:00 PM',    'IT Lab 1',      'BSIT 4-2', 'Laboratory',         '2nd Semester, AY 2026–2027', 1),
('T405',  'IT 411', 'Capstone Project and Research 2', 'FAC-BU-15', 'Ocampo, Maricel (Demo Faculty)', 'Year 4', 'Wednesday', '09:00:00', '11:00:00', '9:00–11:00 AM',       'Room 4',        'BSIT 4-2', 'Lecture',            '2nd Semester, AY 2026–2027', 1)
ON DUPLICATE KEY UPDATE
  `course_code` = VALUES(`course_code`),
  `subject_name` = VALUES(`subject_name`),
  `faculty_id` = VALUES(`faculty_id`),
  `instructor_name` = VALUES(`instructor_name`),
  `year_level` = VALUES(`year_level`),
  `end_time` = VALUES(`end_time`),
  `time_label` = VALUES(`time_label`),
  `room` = VALUES(`room`),
  `section` = VALUES(`section`),
  `class_type` = VALUES(`class_type`),
  `academic_term` = VALUES(`academic_term`),
  `is_sample_schedule` = VALUES(`is_sample_schedule`);

-- ============================================================================
-- 6. TABLE: student_enrollments (Relational Link: Students <-> Subjects)
-- ============================================================================
CREATE TABLE IF NOT EXISTS `student_enrollments` (
  `enrollment_id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `student_number` VARCHAR(30) NOT NULL,
  `subject_code` VARCHAR(20) NOT NULL,
  `academic_term` VARCHAR(60) NOT NULL DEFAULT '2nd Semester, AY 2026–2027',
  PRIMARY KEY (`enrollment_id`),
  UNIQUE KEY `uk_student_subject_enrollment` (`student_number`, `subject_code`),
  CONSTRAINT `fk_enroll_student` FOREIGN KEY (`student_number`) REFERENCES `students` (`student_number`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_enroll_subject` FOREIGN KEY (`subject_code`) REFERENCES `subjects` (`subject_code`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO `student_enrollments` (`student_number`, `subject_code`) VALUES
('2025-BSIT-0202', 'T147'), ('2025-BSIT-0202', 'T146'), ('2025-BSIT-0202', 'T153'),
('2025-BSIT-0202', 'T148'), ('2025-BSIT-0202', 'T152'), ('2025-BSIT-0202', 'T151'),
('2025-BSIT-0202', 'T150'), ('2025-BSIT-0202', 'T003'), ('2025-BSIT-0202', 'T149'),
('2025-BSIT-0205', 'T148'), ('2025-BSIT-0205', 'T150'), ('2025-BSIT-0205', 'T151'),
('2025-BSIT-0209', 'T148'), ('2025-BSIT-0209', 'T150'), ('2025-BSIT-0209', 'T151'),
('2025-BSIT-0214', 'T148'), ('2025-BSIT-0214', 'T150'), ('2025-BSIT-0214', 'T151'),
('2025-BSIT-0218', 'T148'), ('2025-BSIT-0218', 'T150'), ('2025-BSIT-0218', 'T151'),
('2025-BSIT-0221', 'T148'), ('2025-BSIT-0221', 'T150'),
('2025-BSIT-0225', 'T148'), ('2025-BSIT-0225', 'T150'),
('2026-BSIT-0101', 'T101'), ('2026-BSIT-0104', 'T101'), ('2026-BSIT-0108', 'T102'),
('2024-BSIT-0302', 'T301'), ('2024-BSIT-0302', 'T302'),
('2024-BSIT-0307', 'T301'), ('2024-BSIT-0307', 'T302'),
('2024-BSIT-0312', 'T303'),
('2023-BSIT-0401', 'T401'), ('2023-BSIT-0406', 'T401');

-- ============================================================================
-- 7. TABLE: grading_weights
-- ============================================================================
CREATE TABLE IF NOT EXISTS `grading_weights` (
  `weight_id` TINYINT UNSIGNED NOT NULL DEFAULT 1,
  `quizzes_pct` TINYINT UNSIGNED NOT NULL DEFAULT 20,
  `assignments_pct` TINYINT UNSIGNED NOT NULL DEFAULT 15,
  `activities_pct` TINYINT UNSIGNED NOT NULL DEFAULT 15,
  `projects_pct` TINYINT UNSIGNED NOT NULL DEFAULT 25,
  `examinations_pct` TINYINT UNSIGNED NOT NULL DEFAULT 25,
  PRIMARY KEY (`weight_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO `grading_weights` (`weight_id`, `quizzes_pct`, `assignments_pct`, `activities_pct`, `projects_pct`, `examinations_pct`)
VALUES (1, 20, 15, 15, 25, 25);

-- ============================================================================
-- 8. TABLE: student_grades
-- ============================================================================
CREATE TABLE IF NOT EXISTS `student_grades` (
  `grade_id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `student_number` VARCHAR(30) NOT NULL,
  `subject_code` VARCHAR(20) NOT NULL,
  `quizzes` DECIMAL(5,2) DEFAULT NULL,
  `assignments` DECIMAL(5,2) DEFAULT NULL,
  `activities` DECIMAL(5,2) DEFAULT NULL,
  `projects` DECIMAL(5,2) DEFAULT NULL,
  `examinations` DECIMAL(5,2) DEFAULT NULL,
  `final_average` DECIMAL(5,2) DEFAULT NULL,
  `remarks` VARCHAR(40) NOT NULL DEFAULT 'No grade recorded',
  `encoded_by_faculty` VARCHAR(120) DEFAULT NULL,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`grade_id`),
  UNIQUE KEY `uk_student_subject_grade` (`student_number`, `subject_code`),
  CONSTRAINT `fk_grade_subject` FOREIGN KEY (`subject_code`) REFERENCES `subjects` (`subject_code`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `student_grades` (
  `student_number`, `subject_code`, `quizzes`, `assignments`, `activities`, `projects`, `examinations`, `final_average`, `remarks`, `encoded_by_faculty`
) VALUES
('2025-BSIT-0202', 'T147', 94.00, 92.00, 95.00, 93.00, 92.00, 93.10, 'Passed', 'Itliong, Samantha Dominique'),
('2025-BSIT-0202', 'T146', 91.00, 93.00, 90.00, 92.00, 90.00, 91.15, 'Passed', 'Duque, Bush'),
('2025-BSIT-0202', 'T153', 90.00, 91.00, 89.00, 92.00, 90.00, 90.50, 'Passed', 'Albano, Joan'),
('2025-BSIT-0202', 'T148', 90.00, 92.00, 91.00, 94.00, 89.00, 91.20, 'Passed', 'Somera, Fabian'),
('2025-BSIT-0202', 'T152', 89.00, 90.00, 91.00, 90.00, 88.00, 89.45, 'Passed', 'Quevedo, Joseph'),
('2025-BSIT-0202', 'T151', 88.00, 90.00, 89.00, 91.00, 87.00, 88.95, 'Passed', 'Panganiban, Edward'),
('2025-BSIT-0202', 'T150', 92.00, 94.00, 93.00, 95.00, 91.00, 92.95, 'Passed', 'Salvador, Francis Van'),
('2025-BSIT-0202', 'T003', NULL,  NULL,  NULL,  NULL,  NULL,  NULL,  'No grade recorded', 'Vallestero III, Gorgonio'),
('2025-BSIT-0202', 'T149', 95.00, 95.00, 96.00, 95.00, 94.00, 94.90, 'Passed', 'Not specified'),
('2025-BSIT-0205', 'T148', 92.00, 93.00, 92.00, 94.00, 91.00, 92.40, 'Passed', 'Somera, Fabian'),
('2025-BSIT-0209', 'T148', 88.00, 89.00, 89.00, 90.00, 89.00, 89.10, 'Passed', 'Somera, Fabian'),
('2025-BSIT-0214', 'T148', 91.00, 92.00, 91.00, 93.00, 91.00, 91.70, 'Passed', 'Somera, Fabian'),
('2025-BSIT-0218', 'T148', 87.00, 88.00, 88.00, 89.00, 87.00, 87.80, 'Passed', 'Somera, Fabian'),
('2025-BSIT-0221', 'T148', 92.00, 92.00, 92.00, 92.00, 92.00, 92.00, 'Passed', 'Somera, Fabian'),
('2025-BSIT-0225', 'T148', 89.00, 90.00, 90.00, 90.00, 89.00, 89.70, 'Passed', 'Somera, Fabian'),
('2026-BSIT-0101', 'T101', 91.00, 92.00, 91.00, 92.00, 91.00, 91.50, 'Passed', 'Delos Reyes, Arturo (Demo Faculty)'),
('2026-BSIT-0104', 'T101', 89.00, 89.00, 90.00, 89.00, 89.00, 89.25, 'Passed', 'Delos Reyes, Arturo (Demo Faculty)'),
('2026-BSIT-0108', 'T102', 93.00, 93.00, 93.00, 93.00, 93.00, 93.00, 'Passed', 'Delos Reyes, Arturo (Demo Faculty)'),
('2024-BSIT-0302', 'T301', 90.00, 91.00, 91.00, 91.00, 91.00, 90.75, 'Passed', 'Macapagal, Clarissa (Demo Faculty)'),
('2024-BSIT-0307', 'T301', 94.00, 94.00, 95.00, 94.00, 94.00, 94.20, 'Passed', 'Macapagal, Clarissa (Demo Faculty)'),
('2024-BSIT-0312', 'T303', 88.00, 89.00, 89.00, 88.00, 88.00, 88.50, 'Passed', 'Villamor, Renato (Demo Faculty)'),
('2023-BSIT-0401', 'T401', 95.00, 95.00, 95.00, 96.00, 95.00, 95.10, 'Passed', 'Ocampo, Maricel (Demo Faculty)'),
('2023-BSIT-0406', 'T401', 92.00, 92.00, 93.00, 93.00, 92.00, 92.40, 'Passed', 'Ocampo, Maricel (Demo Faculty)')
ON DUPLICATE KEY UPDATE
  `final_average` = VALUES(`final_average`),
  `remarks` = VALUES(`remarks`);

-- ============================================================================
-- 9. TABLE: attendance_records
-- ============================================================================
CREATE TABLE IF NOT EXISTS `attendance_records` (
  `attendance_id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `student_number` VARCHAR(30) NOT NULL,
  `subject_code` VARCHAR(20) NOT NULL,
  `attendance_date` DATE NOT NULL,
  `status` ENUM('present', 'late', 'absent') NOT NULL DEFAULT 'present',
  `remarks` VARCHAR(255) DEFAULT NULL,
  PRIMARY KEY (`attendance_id`),
  UNIQUE KEY `uk_att_student_subj_date` (`student_number`, `subject_code`, `attendance_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO `attendance_records` (`student_number`, `subject_code`, `attendance_date`, `status`, `remarks`) VALUES
('2025-BSIT-0202', 'T148', '2026-11-05', 'present', 'Recorded by Faculty (Somera, Fabian) — Lecture on linked lists and stacks'),
('2025-BSIT-0202', 'T150', '2026-11-06', 'present', 'Recorded by Faculty (Salvador, Francis Van) — Encapsulation and inheritance lab'),
('2025-BSIT-0202', 'T151', '2026-11-07', 'present', 'Recorded by Faculty (Panganiban, Edward) — Operating environment configuration'),
('2025-BSIT-0202', 'T146', '2026-11-08', 'late',    'Recorded by Faculty (Duque, Bush) — Arrived 8 minutes after roll call'),
('2025-BSIT-0202', 'T152', '2026-11-09', 'present', 'Recorded by Faculty (Quevedo, Joseph) — Professional correspondence workshop'),
('2025-BSIT-0205', 'T148', '2026-11-05', 'present', 'Recorded by Faculty (Somera, Fabian)'),
('2025-BSIT-0209', 'T148', '2026-11-05', 'present', 'Recorded by Faculty (Somera, Fabian)'),
('2025-BSIT-0214', 'T148', '2026-11-05', 'present', 'Recorded by Faculty (Somera, Fabian)'),
('2025-BSIT-0218', 'T148', '2026-11-05', 'present', 'Recorded by Faculty (Somera, Fabian)'),
('2025-BSIT-0221', 'T148', '2026-11-05', 'present', 'Recorded by Faculty (Somera, Fabian)'),
('2025-BSIT-0225', 'T148', '2026-11-05', 'late',    'Recorded by Faculty (Somera, Fabian)'),
('2026-BSIT-0101', 'T101', '2026-11-05', 'present', 'Recorded by Faculty (Delos Reyes, Arturo)'),
('2024-BSIT-0302', 'T301', '2026-11-05', 'present', 'Recorded by Faculty (Macapagal, Clarissa)'),
('2023-BSIT-0401', 'T401', '2026-11-06', 'present', 'Recorded by Faculty (Ocampo, Maricel)');

-- ============================================================================
-- 10. TABLE: tasks & task_submissions
-- ============================================================================
CREATE TABLE IF NOT EXISTS `tasks` (
  `task_id` VARCHAR(30) NOT NULL,
  `title` VARCHAR(180) NOT NULL,
  `subject_code` VARCHAR(20) NOT NULL,
  `subject_label` VARCHAR(180) NOT NULL,
  `instructor_name` VARCHAR(120) NOT NULL,
  `deadline` DATE NOT NULL,
  `priority` ENUM('High', 'Medium', 'Low') NOT NULL DEFAULT 'Medium',
  `status` ENUM('pending', 'in-progress', 'completed', 'overdue') NOT NULL DEFAULT 'pending',
  `description` TEXT NOT NULL,
  PRIMARY KEY (`task_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO `tasks` (`task_id`, `title`, `subject_code`, `subject_label`, `instructor_name`, `deadline`, `priority`, `status`, `description`) VALUES
('tsk_201', 'Implement Stack & Queue Data Structure Operations', 'T148', 'T148 - IT 211 - Data Structures and Algorithms', 'Somera, Fabian', '2026-11-11', 'High', 'pending', 'Complete the algorithm trace and time-complexity analysis for the BSIT 2-2 laboratory exercise on Stack and Queue operations.'),
('tsk_202', 'Class Hierarchy & Polymorphism Programming Exercise', 'T150', 'T150 - IT ELEC 2 - Object-Oriented Programming', 'Salvador, Francis Van', '2026-11-13', 'High', 'pending', 'Design base and derived classes demonstrating inheritance, encapsulation, and method overriding.'),
('tsk_203', 'Foreign Language 2 Vocabulary & Dialogue Practice', 'T147', 'T147 - GE ELEC IT 3 - Foreign Language 2', 'Itliong, Samantha Dominique', '2026-11-14', 'Medium', 'in-progress', 'Prepare and submit your conversational dialogue script for the BSIT 2-2 oral recitation session.'),
('tsk_204', 'Reflection Essay on Globalization & Digital Society', 'T153', 'T153 - GEC 8 - The Contemporary World', 'Albano, Joan', '2026-11-07', 'Medium', 'overdue', 'Submit an 800-word synthesis paper analyzing the impact of digital globalization on developing economies.'),
('tsk_205', 'Business Memo & Technical Proposal Draft', 'T152', 'T152 - IT BPO 1 - Business Communication', 'Quevedo, Joseph', '2026-11-05', 'Low', 'completed', 'Draft an executive memo and technical project proposal following standard business communication format.');

CREATE TABLE IF NOT EXISTS `task_submissions` (
  `submission_id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `task_id` VARCHAR(30) NOT NULL,
  `student_number` VARCHAR(30) NOT NULL,
  `student_name` VARCHAR(120) NOT NULL,
  `status` ENUM('pending', 'in-progress', 'completed') NOT NULL DEFAULT 'in-progress',
  `response_text` TEXT NOT NULL,
  `submitted_at` DATE NOT NULL,
  PRIMARY KEY (`submission_id`),
  UNIQUE KEY `uk_task_student_sub` (`task_id`, `student_number`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO `task_submissions` (`task_id`, `student_number`, `student_name`, `status`, `response_text`, `submitted_at`) VALUES
('tsk_203', '2025-BSIT-0202', 'Racel Valiente (Demo Student)', 'in-progress', 'Submitted dialogue script and vocabulary pronunciation notes for Partner Exercise 2.', '2026-11-08'),
('tsk_205', '2025-BSIT-0202', 'Racel Valiente (Demo Student)', 'completed', 'Completed and verified during BSIT 2-2 Business Communication workshop.', '2026-11-05');

-- ============================================================================
-- 11. TABLE: announcements & learning_resources
-- ============================================================================
CREATE TABLE IF NOT EXISTS `announcements` (
  `announcement_id` VARCHAR(40) NOT NULL,
  `title` VARCHAR(200) NOT NULL,
  `category` VARCHAR(50) NOT NULL DEFAULT 'Academic',
  `publish_date` DATE NOT NULL,
  `author` VARCHAR(150) NOT NULL,
  `faculty_id` VARCHAR(30) DEFAULT 'FAC-BU-04',
  `target_audience` VARCHAR(100) NOT NULL DEFAULT 'All BSIT Students',
  `description` TEXT NOT NULL,
  `is_published` TINYINT(1) NOT NULL DEFAULT 1,
  `is_read` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`announcement_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Safe non-destructive migration for existing `announcements` tables
ALTER TABLE `announcements` ADD COLUMN IF NOT EXISTS `faculty_id` VARCHAR(30) DEFAULT 'FAC-BU-04' AFTER `author`;
ALTER TABLE `announcements` ADD COLUMN IF NOT EXISTS `target_audience` VARCHAR(100) NOT NULL DEFAULT 'All BSIT Students' AFTER `faculty_id`;
ALTER TABLE `announcements` ADD COLUMN IF NOT EXISTS `is_published` TINYINT(1) NOT NULL DEFAULT 1 AFTER `description`;
ALTER TABLE `announcements` ADD COLUMN IF NOT EXISTS `is_read` TINYINT(1) NOT NULL DEFAULT 0 AFTER `is_published`;
ALTER TABLE `announcements` ADD COLUMN IF NOT EXISTS `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE `announcements` ADD COLUMN IF NOT EXISTS `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

INSERT IGNORE INTO `announcements` (`announcement_id`, `title`, `category`, `publish_date`, `author`, `faculty_id`, `target_audience`, `description`, `is_published`, `is_read`) VALUES
('ann_201', 'BSIT 2-2 Official Class Timetable & Room Assignments', 'Academic', '2026-11-09', 'Somera, Fabian • College of Information Technology & Computing', 'FAC-BU-04', 'BSIT 2-2', 'BSIT 2-2 students may now view the official Monday-to-Friday class schedule under Class Schedule. Please take note of your room assignments (R1, R2, R5, CL2, CL3, IT LAB 1, and GYM) and arrive on time for laboratory and lecture sessions.', 1, 0),
('ann_202', 'IT 211 & IT ELEC 2 Laboratory Submission Guidelines for BSIT 2-2', 'Academic', '2026-11-07', 'Salvador, Francis Van • IT Department Faculty', 'FAC-BU-07', 'BSIT 2-2', 'Students enrolled in Data Structures and Algorithms (IT 211) and Object-Oriented Programming (IT ELEC 2) are reminded to submit their completed programming exercises through the Academic Task Manager before the posted deadline.', 1, 0),
('ann_203', 'BANTUG UNIVERSITY Foundation Week & IT Skills Exhibition', 'Events', '2026-11-05', 'Office of Student Affairs & IT Faculty', 'FAC-BU-04', 'All BSIT Students', 'All BSIT sections are invited to participate in the Web Development and Software Design Showcase. Coordinate with your class adviser and section officers for project booth registration.', 1, 1),
('ann_204', 'University Library Digital Commons & Open Learning Links', 'Campus Notice', '2026-11-03', 'BANTUG UNIVERSITY Learning Resource Center', 'FAC-BU-01', 'All BSIT Students', 'Updated open-access references for Data Structures, OOP, Platform Technologies, and General Education courses are available under the Learning Resources module.', 1, 1);

CREATE TABLE IF NOT EXISTS `learning_resources` (
  `resource_id` VARCHAR(30) NOT NULL,
  `title` VARCHAR(180) NOT NULL,
  `subject_label` VARCHAR(180) NOT NULL,
  `category` VARCHAR(60) NOT NULL,
  `url` VARCHAR(255) NOT NULL,
  `description` TEXT NOT NULL,
  PRIMARY KEY (`resource_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO `learning_resources` (`resource_id`, `title`, `subject_label`, `category`, `url`, `description`) VALUES
('res_201', 'Visualgo: Visualizing Data Structures and Algorithms', 'T148 - IT 211 - Data Structures and Algorithms', 'Tutorials', 'https://visualgo.net/en', 'Interactive step-by-step animations for sorting, trees, graphs, linked lists, and stacks.'),
('res_202', 'MDN Web Docs: Object-Oriented Programming Concepts', 'T150 - IT ELEC 2 - Object-Oriented Programming', 'Reference Links', 'https://developer.mozilla.org/en-US/docs/Learn/JavaScript/Objects/Object-oriented_programming', 'Open-access guide covering classes, constructors, encapsulation, inheritance, and polymorphism.'),
('res_203', 'Operating Systems & Platform Architecture Reference (OSDev Wiki)', 'T151 - IT ELEC 1 - Platform Technologies', 'Study Materials', 'https://wiki.osdev.org/Expanded_Main_Page', 'Public technical reference on hardware platforms, operating system kernels, and system architecture.'),
('res_204', 'Purdue OWL: Professional & Business Writing Guidelines', 'T152 - IT BPO 1 - Business Communication', 'Lecture Notes', 'https://owl.purdue.edu/owl/subject_specific_writing/professional_technical_writing/index.html', 'Reference material for workplace communication, memos, executive summaries, and presentations.'),
('res_205', 'Stanford Encyclopedia: Ethics and History of Science & Technology', 'T146 - GEC 6 - Science, Technology, and Society', 'Reference Links', 'https://plato.stanford.edu/', 'Open academic articles examining the interplay of scientific innovation and modern society.');

-- ============================================================================
-- 12. TABLE: applications (15 Preloaded Applicant Records + Public Submissions)
-- ============================================================================
CREATE TABLE IF NOT EXISTS `applications` (
  `application_id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `id` VARCHAR(40) DEFAULT NULL,
  `reference_number` VARCHAR(30) NOT NULL,
  `username` VARCHAR(60) DEFAULT NULL,
  `full_name` VARCHAR(120) NOT NULL,
  `date_of_birth` DATE NOT NULL,
  `email` VARCHAR(120) NOT NULL,
  `contact_number` VARCHAR(40) NOT NULL,
  `address` VARCHAR(255) NOT NULL,
  `applicant_type` VARCHAR(80) NOT NULL,
  `year_level` ENUM('Year 1', 'Year 2', 'Year 3', 'Year 4') NOT NULL DEFAULT 'Year 1',
  `desired_program` VARCHAR(150) NOT NULL,
  `second_choice_program` VARCHAR(150) DEFAULT 'None',
  `previous_school` VARCHAR(180) NOT NULL,
  `educational_background` VARCHAR(180) NOT NULL,
  `graduation_year` VARCHAR(10) NOT NULL DEFAULT '2026',
  `submitted_date` DATE NOT NULL,
  `status` VARCHAR(30) NOT NULL DEFAULT 'Pending',
  `is_demo_record` TINYINT(1) NOT NULL DEFAULT 0,
  `remarks` TEXT DEFAULT NULL,
  `updated_by` VARCHAR(120) DEFAULT NULL,
  `status_updated_at` DATETIME DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`application_id`),
  UNIQUE KEY `uk_application_ref` (`reference_number`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Safe non-destructive migration for existing `applications` tables
ALTER TABLE `applications` ADD COLUMN IF NOT EXISTS `id` VARCHAR(40) DEFAULT NULL;
ALTER TABLE `applications` ADD COLUMN IF NOT EXISTS `username` VARCHAR(60) DEFAULT NULL AFTER `reference_number`;
ALTER TABLE `applications` MODIFY COLUMN `graduation_year` VARCHAR(10) NOT NULL DEFAULT '2026';
ALTER TABLE `applications` MODIFY COLUMN `status` VARCHAR(30) NOT NULL DEFAULT 'Pending';
ALTER TABLE `applications` ADD COLUMN IF NOT EXISTS `is_demo_record` TINYINT(1) NOT NULL DEFAULT 0 AFTER `status`;
ALTER TABLE `applications` ADD COLUMN IF NOT EXISTS `remarks` TEXT DEFAULT NULL AFTER `is_demo_record`;
ALTER TABLE `applications` ADD COLUMN IF NOT EXISTS `updated_by` VARCHAR(120) DEFAULT NULL AFTER `remarks`;
ALTER TABLE `applications` ADD COLUMN IF NOT EXISTS `status_updated_at` DATETIME DEFAULT NULL AFTER `updated_by`;
ALTER TABLE `applications` ADD COLUMN IF NOT EXISTS `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE `applications` ADD COLUMN IF NOT EXISTS `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

INSERT IGNORE INTO `applications` (
  `id`, `reference_number`, `username`, `full_name`, `date_of_birth`, `email`, `contact_number`, `address`,
  `applicant_type`, `year_level`, `desired_program`, `second_choice_program`,
  `previous_school`, `educational_background`, `graduation_year`, `submitted_date`, `status`, `is_demo_record`, `remarks`
) VALUES
('app_demo_1', 'BU-ADM-2026-10482', 'c.villanueva', 'Ceasar Villanueva (Sample Demo Record)', '2007-05-14', 'applicant.demo@bantug.edu.example', '+63 917 555 0921', '45 Mabini St., Poblacion (Sample Applicant Address)', 'Senior High School Graduate / Freshman', 'Year 1', 'Bachelor of Science in Information Technology (BSIT)', 'Bachelor of Science in Computer Science (BSCS)', 'Bantug National High School - Senior High Dept. (Sample)', 'STEM / ICT Strand - Honors Graduate', '2026', '2026-11-06', 'Under Review', 1, 'Sample Demo Record: Academic credentials and program choice are under simulated evaluation.'),
('app_demo_2', 'BU-ADM-2026-10319', 'r.mendoza', 'Rafael Luis Mendoza (Sample Demo Record)', '2007-08-22', 'rafael.mendoza.demo@bantug.edu.example', '+63 917 555 0432', '88 Rizal Ave., San Isidro (Sample Applicant Address)', 'Senior High School Graduate / Freshman', 'Year 1', 'Bachelor of Science in Computer Science (BSCS)', 'Bachelor of Science in Information Technology (BSIT)', 'San Isidro Science & Technology High School (Sample)', 'TVL-ICT Strand (Computer Programming)', '2026', '2026-11-08', 'Pending', 1, 'Sample Demo Record: Application received in simulated demo queue awaiting initial review.'),
('app_demo_3', 'BU-ADM-2026-10105', 'b.aquino', 'Bea Katrina Aquino (Sample Demo Record)', '2006-11-09', 'bea.aquino.demo@bantug.edu.example', '+63 917 555 0674', '12 Burgos Blvd., Central District (Sample Applicant Address)', 'College Transferee', 'Year 2', 'Bachelor of Science in Information Technology (BSIT)', 'Bachelor of Science in Information Systems (BSIS)', 'Northern Luzon State Polytechnic (Sample)', 'Completed 1st Year BSIT Units', '2025', '2026-11-02', 'Approved', 1, 'Sample Demo Record: Simulated application approved for Year 2 admission.'),
('app_demo_4', 'BU-ADM-2026-10044', 'j.bautista.app', 'Jerome Carlo Bautista (Sample Demo Record)', '2007-02-19', 'jerome.bautista.demo@bantug.edu.example', '+63 917 555 0788', '210 Luna St., West District (Sample Applicant Address)', 'Senior High School Graduate / Freshman', 'Year 1', 'Bachelor of Science in Information Systems (BSIS)', 'None', 'West District Integrated High School (Sample)', 'General Academic Strand (GAS)', '2026', '2026-10-30', 'Rejected', 1, 'Sample Demo Record: Simulated status demonstrating an incomplete/rejected application state.'),
('app_demo_5', 'BU-ADM-2026-10511', 'h.delarosa', 'Hannah Sophia Dela Rosa (Sample Demo Record)', '2007-09-12', 'hannah.delarosa.demo@bantug.edu.example', '+63 917 555 0905', '54 Bonifacio St., Central Poblacion (Sample Applicant Address)', 'Senior High School Graduate / Freshman', 'Year 1', 'Bachelor of Science in Information Technology (BSIT)', 'Bachelor of Science in Computer Science (BSCS)', 'Bantug Science High School (Sample)', 'STEM Strand - With High Honors', '2026', '2026-11-07', 'Pending', 1, 'Sample Demo Record: New BSIT freshman application awaiting faculty evaluation.'),
('app_demo_6', 'BU-ADM-2026-10524', 'm.castro', 'Miguel Antonio Castro (Sample Demo Record)', '2007-04-03', 'miguel.castro.demo@bantug.edu.example', '+63 917 555 0906', '19 Del Pilar St., North District (Sample Applicant Address)', 'Senior High School Graduate / Freshman', 'Year 1', 'Bachelor of Science in Information Technology (BSIT)', 'Bachelor of Science in Information Systems (BSIS)', 'North District National High School (Sample)', 'TVL-ICT Strand (Computer Systems Servicing)', '2026', '2026-11-05', 'Under Review', 1, 'Sample Demo Record: Currently under review by IT Department Admissions Committee.'),
('app_demo_7', 'BU-ADM-2026-10538', 'k.mercado', 'Katrina Mae Mercado (Sample Demo Record)', '2007-01-25', 'katrina.mercado.demo@bantug.edu.example', '+63 917 555 0907', '72 Quezon Blvd., East Poblacion (Sample Applicant Address)', 'Senior High School Graduate / Freshman', 'Year 1', 'Bachelor of Science in Information Technology (BSIT)', 'Bachelor of Science in Business Administration (BSBA)', 'Bantug Integrated Academy (Sample)', 'STEM Strand', '2026', '2026-11-01', 'Approved', 1, 'Sample Demo Record: Approved for Year 1 BSIT enrollment.'),
('app_demo_8', 'BU-ADM-2026-10549', 'l.domingo', 'Lance Gabriel Domingo (Sample Demo Record)', '2006-12-11', 'lance.domingo.demo@bantug.edu.example', '+63 917 555 0908', '105 Aguinaldo Highway, San Roque (Sample Applicant Address)', 'College Transferee', 'Year 2', 'Bachelor of Science in Computer Science (BSCS)', 'Bachelor of Science in Information Technology (BSIT)', 'Central Valley College (Sample)', '1st Year College Units (Incomplete TOR)', '2025', '2026-10-29', 'Rejected', 1, 'Sample Demo Record: Missing required honorable dismissal and complete transcript.'),
('app_demo_9', 'BU-ADM-2026-10562', 't.salazar', 'Trisha Nicole Salazar (Sample Demo Record)', '2007-07-08', 'trisha.salazar.demo@bantug.edu.example', '+63 917 555 0909', '33 Zamora St., Brgy. San Jose (Sample Applicant Address)', 'Senior High School Graduate / Freshman', 'Year 1', 'Bachelor of Science in Information Systems (BSIS)', 'Bachelor of Science in Information Technology (BSIT)', 'San Jose Senior High School (Sample)', 'ABM / ICT Track', '2026', '2026-11-07', 'Pending', 1, 'Sample Demo Record: Pending initial verification of Senior High School report card.'),
('app_demo_10', 'BU-ADM-2026-10577', 'v.pangilinan', 'Vincent Paul Pangilinan (Sample Demo Record)', '2007-03-17', 'vincent.pangilinan.demo@bantug.edu.example', '+63 917 555 0910', '64 Magsaysay Ave., South District (Sample Applicant Address)', 'Senior High School Graduate / Freshman', 'Year 1', 'Bachelor of Science in Information Technology (BSIT)', 'Bachelor of Science in Computer Science (BSCS)', 'South District Regional High School (Sample)', 'TVL-ICT Strand (Web Development)', '2026', '2026-11-04', 'Under Review', 1, 'Sample Demo Record: Application under faculty evaluation for BSIT section placement.'),
('app_demo_11', 'BU-ADM-2026-10583', 'c.evangelista', 'Clarisse Joy Evangelista (Sample Demo Record)', '2007-10-30', 'clarisse.evangelista.demo@bantug.edu.example', '+63 917 555 0911', '18 Legazpi St., Poblacion West (Sample Applicant Address)', 'Senior High School Graduate / Freshman', 'Year 1', 'Bachelor of Science in Business Administration (BSBA)', 'Bachelor of Science in Information Systems (BSIS)', 'Bantug Central High School (Sample)', 'ABM Strand - With Honors', '2026', '2026-10-31', 'Approved', 1, 'Sample Demo Record: Approved by Admissions & Department Committee.'),
('app_demo_12', 'BU-ADM-2026-10590', 'd.magno', 'Daryl Christian Magno (Sample Demo Record)', '2006-06-21', 'daryl.magno.demo@bantug.edu.example', '+63 917 555 0912', '91 Kalayaan Rd., Brgy. Sta. Maria (Sample Applicant Address)', 'Second Degree Applicant', 'Year 3', 'Bachelor of Science in Information Technology (BSIT)', 'None', 'Eastern Provincial Institute (Sample)', 'Diploma in Technical Studies', '2024', '2026-10-28', 'Rejected', 1, 'Sample Demo Record: Did not meet prerequisite mathematics and programming credit units.'),
('app_demo_13', 'BU-ADM-2026-10604', 'n.galang', 'Nadine Rose Galang (Sample Demo Record)', '2007-04-19', 'nadine.galang.demo@bantug.edu.example', '+63 917 555 0913', '27 Tandang Sora St., Brgy. Maligaya (Sample Applicant Address)', 'Senior High School Graduate / Freshman', 'Year 1', 'Bachelor of Secondary Education (BSED)', 'Bachelor of Science in Information Technology (BSIT)', 'Maligaya National High School (Sample)', 'HUMSS Strand', '2026', '2026-11-08', 'Pending', 1, 'Sample Demo Record: Submitted online application; queued for initial screening.'),
('app_demo_14', 'BU-ADM-2026-10618', 'a.vergara', 'Adrian Kyle Vergara (Sample Demo Record)', '2007-08-05', 'adrian.vergara.demo@bantug.edu.example', '+63 917 555 0914', '142 Jacinto St., Brgy. San Nicolas (Sample Applicant Address)', 'Senior High School Graduate / Freshman', 'Year 1', 'Bachelor of Science in Information Technology (BSIT)', 'Bachelor of Science in Computer Science (BSCS)', 'San Nicolas Science High School (Sample)', 'STEM Strand', '2026', '2026-11-03', 'Under Review', 1, 'Sample Demo Record: Academic records verified; awaiting final department sign-off.'),
('app_demo_15', 'BU-ADM-2026-10629', 'f.lopez', 'Francine Mae Lopez (Sample Demo Record)', '2007-11-16', 'francine.lopez.demo@bantug.edu.example', '+63 917 555 0915', '309 Plaridel St., Central District (Sample Applicant Address)', 'Senior High School Graduate / Freshman', 'Year 1', 'Bachelor of Science in Information Technology (BSIT)', 'Bachelor of Science in Information Systems (BSIS)', 'Bantug National High School - Senior High Dept. (Sample)', 'TVL-ICT Strand - With High Honors', '2026', '2026-10-31', 'Approved', 1, 'Sample Demo Record: Approved for admission into BSIT program (AY 2026–2027).');

-- ============================================================================
-- 13. TABLE: portal_state_store
-- ============================================================================
CREATE TABLE IF NOT EXISTS `portal_state_store` (
  `state_key` VARCHAR(60) NOT NULL,
  `schema_version` INT UNSIGNED NOT NULL DEFAULT 8,
  `state_json` LONGTEXT NOT NULL,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`state_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 14. TABLE: user_sessions (Server-Side Session Management & Logout Invalidation)
-- ============================================================================
CREATE TABLE IF NOT EXISTS `user_sessions` (
  `session_token` VARCHAR(96) NOT NULL,
  `username` VARCHAR(60) NOT NULL,
  `role` ENUM('student', 'faculty', 'applicant', 'admin') NOT NULL DEFAULT 'student',
  `actor_id` VARCHAR(40) DEFAULT NULL,
  `actor_name` VARCHAR(120) NOT NULL,
  `is_applicant_demo` TINYINT(1) NOT NULL DEFAULT 0,
  `is_revoked` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `expires_at` DATETIME NOT NULL,
  PRIMARY KEY (`session_token`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 15. TABLE: audit_logs (Audit Trail for Application Status Changes & Critical Actions)
-- ============================================================================
CREATE TABLE IF NOT EXISTS `audit_logs` (
  `log_id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `actor_id` VARCHAR(40) DEFAULT NULL,
  `actor_name` VARCHAR(120) NOT NULL,
  `actor_role` VARCHAR(30) NOT NULL DEFAULT 'system',
  `action_type` VARCHAR(60) NOT NULL,
  `target_type` VARCHAR(60) NOT NULL,
  `target_id` VARCHAR(80) NOT NULL,
  `details` TEXT NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`log_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

