// Database utility to add catalog descriptions to university subjects.
const mysql = require('mysql2/promise');
const { DB_CONFIG } = require('../../database/seed');

(async () => {
  const conn = await mysql.createConnection(DB_CONFIG);
  const [cols] = await conn.query("SHOW COLUMNS FROM `subjects` LIKE 'description'");
  if (cols.length === 0) {
    await conn.query("ALTER TABLE `subjects` ADD COLUMN `description` TEXT NULL");
    console.log("Added description column to subjects");
  } else {
    console.log("description column already exists in subjects");
  }

  const descriptions = {
    'T148': 'Covers fundamental data structures, arrays, linked lists, stacks, queues, trees, graphs, and algorithmic problem-solving techniques.',
    'T150': 'Principles and practices of object-oriented programming including encapsulation, inheritance, polymorphism, and abstraction.',
    'T147': 'Introduction to foreign language grammar, syntax, conversational phrases, and cultural contexts.',
    'T147A': 'Introduction to foreign language grammar, syntax, conversational phrases, and cultural contexts.',
    'T153': 'Fundamentals of hardware platforms, computer architecture, system software, and operating system principles.',
    'T146': 'Information management principles, database design, relational modeling, normalization, and SQL query language.',
    'T152': 'Concepts of networking, OSI reference model, TCP/IP protocol suite, IP addressing, and local area network configuration.',
    'T151': 'Integration of software applications, middleware, API web services, and enterprise system architectures.',
    'T003': 'Fosters critical thinking, problem-solving strategies, analytical evaluation, and innovation in information technology.',
    'T003A': 'Fosters critical thinking, problem-solving strategies, analytical evaluation, and innovation in information technology.',
    'T001': 'Fosters design thinking methodologies, ideation techniques, prototyping, and user-centered innovation.',
    'T149': 'Physical activity, movement competency, fitness conditioning, and team sport engagement for healthy lifestyle development.',
    'T101': 'Overview of computer systems, information processing, hardware, software, ethics, and career pathways in IT.',
    'T102': 'Fundamental concepts of computer programming using modern structured languages, control structures, and algorithms.',
    'T103': 'Advanced study of programming, modular design, functions, arrays, file I/O, and software debugging.',
    'T104': 'Basic web technologies, HTML5, CSS3, JavaScript, web design principles, and responsive layout development.'
  };

  for (const [code, desc] of Object.entries(descriptions)) {
    await conn.query("UPDATE `subjects` SET `description` = ? WHERE `subject_code` = ?", [desc, code]);
  }
  console.log("Successfully updated subject descriptions.");
  await conn.end();
})();

