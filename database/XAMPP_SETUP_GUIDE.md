# BANTUG UNIVERSITY – SQL & XAMPP Setup Guide

This guide explains how to run the **BANTUG UNIVERSITY Student Portal System** with **XAMPP (Apache + MySQL/MariaDB + phpMyAdmin)** and why the project must be served through XAMPP so the database receives your inputs.

---

## Why Wasn't the Database Reading Inputs?

There are two common reasons why inputs in the browser don't show up in `phpMyAdmin`:

1. **Opening `index.html` outside XAMPP (`file://` or VS Code Live Server)**:
   - Browsers cannot talk directly to MySQL; they send data to [`api/portal_api.php`](../api/portal_api.php), which requires **XAMPP Apache (PHP)** to execute.
   - If the project folder is not inside `C:\xampp\htdocs\StudentHub`, Apache cannot run the PHP script.
2. **Full Relational Table Sync (Now Fixed)**:
   - [`api/portal_api.php`](../api/portal_api.php) has now been upgraded so **every** input across the portal immediately writes into its matching SQL table in `bantug_university_db` (`students`, `faculty`, `student_grades`, `attendance_records`, `tasks`, `task_submissions`, `announcements`, `learning_resources`, `grading_weights`, and `applications`).

---

## Quickest Way to Connect XAMPP (3 Steps)

### Step 1: Start Apache & MySQL in XAMPP
1. Open **XAMPP Control Panel**.
2. Click **Start** next to **Apache** and **Start** next to **MySQL** so both turn green.

### Step 2: Deploy the Folder to `C:\xampp\htdocs\StudentHub`
- **Option A (One-Click Script)**: Double-click [`deploy_to_xampp.bat`](../deploy_to_xampp.bat) in the project folder. It automatically copies the project to `C:\xampp\htdocs\StudentHub` and opens `http://localhost/StudentHub/`.
- **Option B (Manual Copy)**: Copy the entire `StudentHub` project folder and paste it into:
  ```text
  C:\xampp\htdocs\StudentHub
  ```
  *(Whenever you edit files or we update the code, re-run `deploy_to_xampp.bat` or copy the updated files to `C:\xampp\htdocs\StudentHub`.)*

### Step 3: Import or Auto-Initialize the SQL Database
1. Open **phpMyAdmin** at: `http://localhost/phpmyadmin`
2. Click the **Import** tab at the top.
3. Choose [`database/bantug_university_portal.sql`](bantug_university_portal.sql) and click **Import** (or **Go**).
   - *Note: Even if you skip manual import, opening `http://localhost/StudentHub/` will automatically create and seed `bantug_university_db` via [`api/config.php`](../api/config.php).*

---

## How to Verify Your Inputs in phpMyAdmin

Open the portal via **`http://localhost/StudentHub/`** (or Live Server once `C:\xampp\htdocs\StudentHub` is in place):

| Action in the Portal | Table Updated in `http://localhost/phpmyadmin` (`bantug_university_db`) |
|---|---|
| Submit an **Applicant Admission Form** | `applications` |
| Encode or edit **Student Grades** (Faculty Portal) | `student_grades` & `students` (GWA updated) |
| Mark **Attendance** (`present` / `late` / `absent`) | `attendance_records` |
| Create or edit **Tasks / Assignments** | `tasks` |
| Update **Student Task Status** (`pending` / `in-progress` / `completed`) | `task_submissions` |
| Post or delete an **Announcement** | `announcements` |
| Add a **Learning Resource** | `learning_resources` |
| Edit **Student Profile** or **Faculty Profile** | `students` / `faculty` |
