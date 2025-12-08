require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const path = require('path');

const app = express();
const port = process.env.PORT || 3307;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// ใช้ API Routes
const authRoutes = require('./routes/auth'); // นำเข้าไฟล์ auth
const roomRoutes = require('./routes/room'); // นำเข้าไฟล์ room

// บอกว่าถ้าลิงก์ขึ้นต้นด้วย /api ให้วิ่งไปหาไฟล์นั้นๆ
app.use('/api', authRoutes); // /register -> /api/register
app.use('/api', roomRoutes); // /rooms -> /api/rooms

// เพิ่ม Route สำหรับหน้าแรก (Root Path)
app.get('/', (req, res) => {
    // สั่งให้ Redirect ไปที่ไฟล์ home-page.html
    res.redirect('/home-page.html');
});

// เริ่มต้น Server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});