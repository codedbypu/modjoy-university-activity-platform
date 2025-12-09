const mysql = require('mysql2');
require('dotenv').config(); // โหลดค่าจาก .env

const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT || 3306
});

db.connect(err => {
    if (err) console.error('MySQL Connection Error:', err);
    else console.log('Connected to MySQL database');
});

module.exports = db; // ส่งออกตัวแปร db ให้ไฟล์อื่นใช้