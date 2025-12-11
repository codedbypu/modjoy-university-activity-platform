require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const path = require('path');
const cron = require('node-cron');
const db = require('./config/db');

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
    res.redirect('/home-page.html');
});

cron.schedule('* * * * *', () => {
    // โค้ดจะทำงานทุกๆ 1 นาที
    
    // 1. หัก 5 คะแนน (เฉพาะห้องที่จบแล้ว + ยังไม่เช็คชื่อ + มีรหัสเช็คชื่อตั้งไว้)
    const deductSql = `
        UPDATE USERS U
        JOIN ROOMMEMBERS RM ON U.USER_ID = RM.USER_ID
        JOIN ROOMS R ON RM.ROOM_ID = R.ROOM_ID
        SET U.USER_CREDIT_SCORE = GREATEST(U.USER_CREDIT_SCORE - 5, 0)
        WHERE RM.ROOMMEMBER_STATUS = 'pending' 
        AND TIMESTAMP(R.ROOM_EVENT_DATE, R.ROOM_EVENT_END_TIME) < NOW()
        AND R.ROOM_CHECKIN_CODE IS NOT NULL 
        AND R.ROOM_CHECKIN_CODE != ''; 
    `;

    db.query(deductSql, (err, result) => {
        if (err) return console.error('Error deduct score:', err);
        if (result && result.changedRows > 0) {
            console.log(`[Auto-Deduct] หักคะแนนผู้ที่ไม่เช็คชื่อไปแล้ว ${result.changedRows} คน`);
        }

        // 2. เปลี่ยนสถานะเป็น 'absent' (ขาด) เพื่อไม่ให้โดนหักซ้ำ
        const updateStatusSql = `
            UPDATE ROOMMEMBERS RM
            JOIN ROOMS R ON RM.ROOM_ID = R.ROOM_ID
            SET RM.ROOMMEMBER_STATUS = 'absent'
            WHERE RM.ROOMMEMBER_STATUS = 'pending'
            AND TIMESTAMP(R.ROOM_EVENT_DATE, R.ROOM_EVENT_END_TIME) < NOW()
            AND R.ROOM_CHECKIN_CODE IS NOT NULL 
            AND R.ROOM_CHECKIN_CODE != '';
        `;

        db.query(updateStatusSql, (err, res) => {
            if (err) console.error('Error update status:', err);
        });
    });
});

// เริ่มต้น Server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});