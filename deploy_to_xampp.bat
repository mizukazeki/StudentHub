@echo off
title BANTUG UNIVERSITY - Deploy & Seed to XAMPP (htdocs\StudentHub)
echo ============================================================================
echo  BANTUG UNIVERSITY - Student Portal System (Revision 7)
echo  Deploying Project & Seeding 15 Records/Category to XAMPP MySQL
echo ============================================================================
echo.

set "SOURCE_DIR=%~dp0"
set "TARGET_DIR=C:\xampp\htdocs\StudentHub"

if not exist "C:\xampp\htdocs" (
    echo [WARNING] C:\xampp\htdocs was not found on your C: drive.
    echo If your XAMPP is installed in another drive/folder, please copy this
    echo StudentHub folder into your XAMPP "htdocs\StudentHub" directory manually.
    echo.
    pause
    exit /b 1
)

echo Copying files from "%SOURCE_DIR%" to "%TARGET_DIR%"...
if not exist "%TARGET_DIR%" mkdir "%TARGET_DIR%"
xcopy "%SOURCE_DIR%*" "%TARGET_DIR%\" /E /I /Y /Q

if exist "C:\xampp\mysql\bin\mysql.exe" (
    echo Seeding MySQL database (`bantug_university_db`) with 15 Students, 15 Faculty, and 15 Applicants...
    "C:\xampp\mysql\bin\mysql.exe" -u root --default-character-set=utf8mb4 < "%SOURCE_DIR%database\bantug_university_portal.sql" 2>nul
)

echo.
echo [SUCCESS] Files copied to %TARGET_DIR% and database seed ready!
echo Opening http://localhost/StudentHub/ in your browser...
start "" "http://localhost/StudentHub/"
echo.
echo Make sure Apache and MySQL are both STARTED (green) in XAMPP Control Panel!
pause
