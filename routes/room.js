const express = require('express');
const router = express.Router();
const db = require('../config/db');
const jwt = require('jsonwebtoken');

const multer = require('multer');
const path = require('path');
const fs = require('fs');

const JWT_SECRET = process.env.JWT_SECRET

// #region --- Helper Function สำหรับ Database Query (Async/Await) ---
function dbQuery(sql, params) {
    return new Promise((resolve, reject) => {
        db.query(sql, params, (err, result) => {
            if (err) reject(err);
            else resolve(result);
        });
    });
}
// #endregion

// #region --- API ดึงรายชื่อสถานที่ --- 
router.get('/locations', (req, res) => {
    db.query('SELECT * FROM LOCATIONS', (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Database error' });
        }
        res.json(results);
    });
});
// #endregion

// #region --- Config Multer สำหรับอัปโหลดรูปปกห้อง --- 
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadPath = path.join(__dirname, '../public/uploads/rooms');
        if (!fs.existsSync(uploadPath))
            fs.mkdirSync(uploadPath, { recursive: true });
        cb(null, uploadPath);
    },
    filename: function (req, file, cb) {
        // ตัวอย่างชื่อไฟล์: room-1632345678901-123456789.png มาจากการผสม timestamp กับ random number
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'room-' + uniqueSuffix + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });
// #endregion

// #region --- API สร้างห้องกิจกรรมใหม่ (create-room) --- 
router.post('/create-room', upload.single('room_image'), async (req, res) => {
    const token = req.cookies.token;
    if (!token) return res.json({ success: false, message: 'กรุณาเข้าสู่ระบบก่อน' });

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const leaderId = decoded.id;

        // ดึงข้อมูลจากฟอร์ม
        const { roomTitle, roomEventStartTime, roomEventEndTime, roomEventDate, roomLocation, roomDescription, roomCapacity, tags } = req.body;

        // จัดการรูปภาพ (ถ้ามี)
        let imagePath = '/Resource/img/bangmod.png'; // รูป Default
        if (req.file) imagePath = '/uploads/rooms/' + req.file.filename;

        // บันทึกลงตาราง ROOMS
        const sql = `INSERT INTO ROOMS
                (ROOM_TITLE, ROOM_EVENT_START_TIME, ROOM_EVENT_END_TIME, ROOM_EVENT_DATE, ROOM_EVENT_LOCATION, ROOM_DESCRIPTION, ROOM_LEADER_ID, ROOM_CAPACITY, ROOM_IMG, ROOM_STATUS)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending');`;
        const roomResult = await dbQuery(sql, [
            roomTitle, roomEventStartTime, roomEventEndTime, roomEventDate, roomLocation, roomDescription, leaderId, roomCapacity, imagePath
        ]);
        const newRoomId = roomResult.insertId;
        // เอาคนสร้าง จับยัดเป็นสมาชิกคนแรก (Leader) ใน ROOMMEMBERS
        await dbQuery(`
            INSERT INTO ROOMMEMBERS (ROOM_ID, USER_ID, ROOMMEMBER_STATUS) 
            VALUES (?, ?, 'present')`, [newRoomId, leaderId]);

        // จัดการ Tags
        if (typeof tags !== 'undefined') {
            const tagList = tags.split(',').map(t => t.trim()).filter(t => t !== '');

            for (const tagName of tagList) {
                let tagId;
                const existingTags = await dbQuery('SELECT TAG_ID FROM TAGS WHERE TAG_NAME = ?', [tagName]);
                if (existingTags.length > 0) {
                    tagId = existingTags[0].TAG_ID;
                } else {
                    const newTag = await dbQuery('INSERT INTO TAGS (TAG_NAME) VALUES (?)', [tagName]);
                    tagId = newTag.insertId;
                }
                // จับคู่ Room-Tag
                await dbQuery('INSERT INTO ROOMTAGS (ROOM_ID, TAG_ID) VALUES (?, ?)', [newRoomId, tagId]);
            }
        }
        res.json({ success: true, message: 'สร้างห้องกิจกรรมสำเร็จ!', roomId: newRoomId });
    } catch (err) {
        console.error(err);
        res.json({ success: false, message: 'เกิดข้อผิดพลาด: ' + err.message });
    }
});
// #endregion

// #region --- API ดึงข้อมูลห้องกิจกรรมทั้งหมด (get-rooms) --- 
router.get('/rooms', async (req, res) => {
    try {
        const sql = `
            SELECT 
                r.ROOM_ID,
                r.ROOM_TITLE,
                r.ROOM_EVENT_DATE,
                TIME_FORMAT(r.ROOM_EVENT_START_TIME, '%H:%i') AS formatted_start_time,
                TIME_FORMAT(r.ROOM_EVENT_END_TIME, '%H:%i') AS formatted_end_time,
                r.ROOM_CAPACITY,
                r.ROOM_IMG,
                l.LOCATION_NAME,
                COUNT(rm.USER_ID) AS member_count,
                GROUP_CONCAT(t.TAG_NAME) AS tags
            FROM ROOMS r
            LEFT JOIN LOCATIONS l ON r.ROOM_EVENT_LOCATION = l.LOCATION_ID
            LEFT JOIN ROOMMEMBERS rm ON r.ROOM_ID = rm.ROOM_ID
            LEFT JOIN ROOMTAGS rt ON r.ROOM_ID = rt.ROOM_ID
            LEFT JOIN TAGS t ON rt.TAG_ID = t.TAG_ID
            GROUP BY r.ROOM_ID
            ORDER BY r.ROOM_EVENT_DATE, r.ROOM_EVENT_START_TIME ASC
        `;
        const rooms = await dbQuery(sql);
        res.json({ success: true, rooms });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Database error' });
    }
});
// #endregion

// #region --- API ดึงข้อมูลห้องกิจกรรมตาม ID (get-room/:id) ---
router.get('/room/:id', (req, res) => {
    const roomId = req.params.id;

    // SQL Query: ดึงข้อมูลห้อง + ชื่อคนสร้าง + ชื่อสถานที่ + จำนวนคน + Tags
    const sql = `
        SELECT 
            R.*,
            L.LOCATION_NAME,
            CONCAT(U.USER_FNAME, ' ', U.USER_LNAME) AS LEADER_NAME,
            U.USER_IMG AS LEADER_IMG,
            (SELECT COUNT(*) FROM ROOMMEMBERS WHERE ROOM_ID = R.ROOM_ID) AS CURRENT_MEMBERS,
            GROUP_CONCAT(T.TAG_NAME) AS TAGS
        FROM ROOMS R
        LEFT JOIN LOCATIONS L ON R.ROOM_EVENT_LOCATION = L.LOCATION_ID
        LEFT JOIN USERS U ON R.ROOM_LEADER_ID = U.USER_ID
        LEFT JOIN ROOMTAGS RT ON R.ROOM_ID = RT.ROOM_ID
        LEFT JOIN TAGS T ON RT.TAG_ID = T.TAG_ID
        WHERE R.ROOM_ID = ?
        GROUP BY R.ROOM_ID
    `;

    db.query(sql, [roomId], (err, results) => {
        if (err) {
            console.error(err);
            return res.json({ success: false, message: 'Database error' });
        }

        if (results.length > 0) {
            res.json({ success: true, room: results[0] });
        } else {
            res.json({ success: false, message: 'ไม่พบห้องกิจกรรมนี้' });
        }
    });
});
// #endregion

module.exports = router;