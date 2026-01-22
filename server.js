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

// ให้ Server เช็คทุกๆ 5 นาที
cron.schedule('*/5 * * * *', () => { 
    console.log('[Cron] เริ่มตรวจสอบคนที่ยังไม่เช็คชื่อ...');

    const sql = `
        UPDATE ROOMMEMBERS rm
        JOIN USERS u ON rm.USER_ID = u.USER_ID
        JOIN ROOMS r ON rm.ROOM_ID = r.ROOM_ID
        SET 
            u.USER_CREDIT_SCORE = GREATEST(u.USER_CREDIT_SCORE - 5, 0),
            rm.ROOMMEMBER_STATUS = 'absent'
        WHERE 
            rm.ROOMMEMBER_STATUS = 'pending' 
            AND TIMESTAMP(r.ROOM_EVENT_DATE, r.ROOM_EVENT_END_TIME) < NOW()
            AND r.ROOM_CHECKIN_CODE IS NOT NULL 
            AND r.ROOM_CHECKIN_CODE != '';
    `;

    db.query(sql, (err, result) => {
        // ที่เหลือเป็นเช็ค error เฉยๆ
        if (err) {
            return console.error('[Cron Error] ไม่สามารถหักคะแนนได้:', err);
        }

        if (result.changedRows > 0) {
            console.log(`[Auto-Deduct] ดำเนินการเช็คขาดและหักคะแนนเรียบร้อย: ${result.changedRows} รายการ`);
        } else {
            console.log('[Auto-Deduct] ไม่มีรายการต้องดำเนินการ');
        }
    });
});

// เริ่มต้น Server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
