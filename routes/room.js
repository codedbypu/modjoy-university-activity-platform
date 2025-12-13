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
    // ดึงรายชื่อสถานที่หมด
    db.query('SELECT * FROM LOCATIONS', (err, results) => {
    // ส่วนที่เหลือเป็นการแจ้งเตือนกรณี error
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Database error' });
        }
        res.json(results);
    });
});
// #endregion

// #region --- Config Multer สำหรับอัปโหลดรูปปกห้อง --- 
// สำหรับอัปโหลดรูปปกห้อง
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadPath = path.join(__dirname, '../public/uploads/rooms');
        if (!fs.existsSync(uploadPath))
            fs.mkdirSync(uploadPath, { recursive: true });
        cb(null, uploadPath);
    },
    filename: function (req, file, cb) {
        // ชื่อไฟล์มาจากการผสม timestamp กับ random number
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'room-' + uniqueSuffix + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });
// #endregion

// #region --- API สร้างห้องกิจกรรมใหม่ (add-room) --- 
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

        let params = [roomTitle, roomEventStartTime, roomEventEndTime, roomEventDate, roomLocation, roomDescription, leaderId, roomCapacity, imagePath];
        // บันทึกลงตาราง ROOMS
        const sql = `INSERT INTO ROOMS
                (ROOM_TITLE, ROOM_EVENT_START_TIME, ROOM_EVENT_END_TIME, ROOM_EVENT_DATE, ROOM_EVENT_LOCATION, ROOM_DESCRIPTION, ROOM_LEADER_ID, ROOM_CAPACITY, ROOM_IMG)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`;
        const roomResult = await dbQuery(sql, params);
        const newRoomId = roomResult.insertId;
        // ให้คนสร้างเป็นสมาชิกคนแรก ใน ROOMMEMBERS
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
                await dbQuery('INSERT INTO ROOMTAGS (ROOM_ID, TAG_ID) VALUES (?, ?)', [newRoomId, tagId]);
            }
        }
        // ส่วนที่เหลือเป็นการแจ้งเตือนสถานะการสร้างห้อง
        res.json({ success: true, message: 'สร้างห้องกิจกรรมสำเร็จ!', roomId: newRoomId });
    } catch (err) {
        console.error(err);
        res.json({ success: false, message: 'เกิดข้อผิดพลาด: ' + err.message });
    }
});
// #endregion

// #region --- API แก้ไขข้อมูลห้องกิจกรรม (update-room/:id) --- 
router.post('/update-room/:id', upload.single('room_image'), async (req, res) => {
    const token = req.cookies.token;
    if (!token) return res.json({ success: false, message: 'กรุณาเข้าสู่ระบบ' });

    const roomId = req.params.id;
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const userId = decoded.id;
        const userRole = decoded.role;

        // 1. เช็คก่อนว่า User คนนี้เป็นเจ้าของห้องนี้จริงไหม?
        const checkOwner = await dbQuery(`
            SELECT 
                ROOM_LEADER_ID, 
                CASE WHEN NOW() >= TIMESTAMP(ROOM_EVENT_DATE, ROOM_EVENT_START_TIME) THEN 1 ELSE 0 END AS IS_STARTED
            FROM ROOMS 
            WHERE ROOM_ID = ?`, [roomId]);
        if (checkOwner.length === 0)
            return res.json({ success: false, message: 'ไม่พบห้องกิจกรรม' });
        const roomInfo = checkOwner[0];
        if (roomInfo.ROOM_LEADER_ID != userId && userRole !== 'admin')
            return res.json({ success: false, message: 'คุณไม่มีสิทธิ์แก้ไขห้องนี้' });
        if (roomInfo.IS_STARTED === 1 && userRole !== 'admin')
            return res.json({ success: false, message: 'ไม่สามารถแก้ไขกิจกรรมที่เริ่มไปแล้วได้' });

        const { roomTitle, roomEventDate, roomEventStartTime, roomEventEndTime, roomLocation, roomCapacity, roomDescription, tags } = req.body;

        // 3. จัดการรูปภาพ (ถ้าไม่อัปโหลดใหม่ ให้ใช้รูปเดิม -> ไม่ต้องอัปเดตคอลัมน์ ROOM_IMG)
        let imageUpdateSql = "";
        let params = [roomTitle, roomEventDate, roomEventStartTime, roomEventEndTime, roomLocation, roomCapacity, roomDescription];

        if (req.file) {
            const imagePath = '/uploads/rooms/' + req.file.filename;
            imageUpdateSql = ", ROOM_IMG = ?";
            params.push(imagePath);
        }

        // ใส่ roomId ปิดท้าย params
        params.push(roomId);

        // 4. อัปเดตตาราง ROOMS
        const sql = `
            UPDATE ROOMS 
            SET ROOM_TITLE=?, ROOM_EVENT_DATE=?, ROOM_EVENT_START_TIME=?, ROOM_EVENT_END_TIME=?, 
                ROOM_EVENT_LOCATION=?, ROOM_CAPACITY=?, ROOM_DESCRIPTION=? ${imageUpdateSql}
            WHERE ROOM_ID = ?
        `;

        await dbQuery(sql, params);

        // 5. จัดการ Tags (ลบของเก่า -> ใส่ของใหม่)
        if (typeof tags !== 'undefined') {
            // ลบ Tag เดิมของห้องนี้
            await dbQuery('DELETE FROM ROOMTAGS WHERE ROOM_ID = ?', [roomId]);
            // เพิ่ม Tag ใหม่
            if (tags.trim() !== '') {
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
                    await dbQuery('INSERT INTO ROOMTAGS (ROOM_ID, TAG_ID) VALUES (?, ?)', [roomId, tagId]);
                }
            }
        }
        res.json({ success: true, message: 'แก้ไขข้อมูลสำเร็จ!' });
    } catch (err) {
        console.error(err);
        res.json({ success: false, message: 'เกิดข้อผิดพลาด: ' + err.message });
    }
});
// #endregion

// #region --- API ลบห้องกิจกรรม (delete-room/:id) --- 
router.delete('/delete-room/:id', async (req, res) => {
    const token = req.cookies.token;
    if (!token) return res.json({ success: false, message: 'กรุณาเข้าสู่ระบบ' });

    const roomId = req.params.id;
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const userId = decoded.id;
        const userRole = decoded.role;

        // 1. เช็คสิทธิ์ (ต้องเป็นเจ้าของ หรือ Admin)
        const checkOwner = await dbQuery(`
            SELECT 
                ROOM_LEADER_ID, 
                ROOM_IMG,
                CASE WHEN NOW() >= TIMESTAMP(ROOM_EVENT_DATE, ROOM_EVENT_START_TIME) THEN 1 ELSE 0 END AS IS_STARTED
            FROM ROOMS 
            WHERE ROOM_ID = ?`, [roomId]);

        if (checkOwner.length === 0)
            return res.json({ success: false, message: 'ไม่พบห้องกิจกรรม' });
        const roomInfo = checkOwner[0];
        if (roomInfo.ROOM_LEADER_ID != userId && userRole !== 'admin')
            return res.json({ success: false, message: 'คุณไม่มีสิทธิ์ลบห้องนี้' });
        if (roomInfo.IS_STARTED === 1 && userRole !== 'admin')
            return res.json({ success: false, message: 'ไม่สามารถลบกิจกรรมที่เริ่มไปแล้วได้' });

        // 2. ลบไฟล์รูปภาพออกจาก Server (ถ้าไม่ใช่รูป Default)
        // เช็คว่ามีรูป และ path ไม่ใช่รูปใน folder Resource (ที่เป็นรูป default)
        if (roomInfo.ROOM_IMG && !roomInfo.ROOM_IMG.includes('/Resource/img/')) {
            // แปลง path URL กลับเป็น path เครื่อง (/uploads/rooms/...)
            // หมายเหตุ: ต้องแน่ใจว่า path ใน DB เก็บแบบไหน (ในโค้ดเก่าเก็บเป็น /uploads/rooms/filename)
            const fileName = path.basename(roomInfo.ROOM_IMG);
            const filePath = path.join(__dirname, '../public/uploads/rooms', fileName);

            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath); // ลบไฟล์
            }
        }

        // 3. ลบข้อมูลจาก Database 
        // (เนื่องจากตั้ง Foreign Key ON DELETE CASCADE ไว้แล้ว ข้อมูลใน ROOMMEMBERS, ROOMTAGS จะหายไปเอง)
        await dbQuery('DELETE FROM ROOMS WHERE ROOM_ID = ?', [roomId]);

        res.json({ success: true, message: 'ลบห้องกิจกรรมเรียบร้อยแล้ว' });
    } catch (err) {
        console.error(err);
        res.json({ success: false, message: 'เกิดข้อผิดพลาด: ' + err.message });
    }
});
// #endregion

// #region --- API เข้าร่วมห้องกิจกรรม (join-room/:id) --- 
router.post('/room/:id/join', async (req, res) => {
    const token = req.cookies.token;
    if (!token) return res.json({ success: false, message: 'กรุณาเข้าสู่ระบบก่อน' });

    const roomId = req.params.id;
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const userId = decoded.id;

        // เช็คว่าห้องเต็มหรือยัง และเช็คว่าเคย join ไปหรือยัง
        const roomCheck = await dbQuery(`
            SELECT 
                r.ROOM_CAPACITY,
                (SELECT COUNT(*) FROM ROOMMEMBERS WHERE ROOM_ID = r.ROOM_ID) as CURRENT_MEMBERS,
                (SELECT COUNT(*) FROM ROOMMEMBERS WHERE ROOM_ID = r.ROOM_ID AND USER_ID = ?) as IS_JOINED, 
                CASE 
                    WHEN NOW() > TIMESTAMP(r.ROOM_EVENT_DATE, r.ROOM_EVENT_END_TIME) THEN 1 
                    ELSE 0 
                END AS IS_ENDED
            FROM ROOMS r
            WHERE r.ROOM_ID = ?
        `, [userId, roomId]);

        if (roomCheck.length === 0) return res.json({ success: false, message: 'ไม่พบห้องกิจกรรม' });
        const room = roomCheck[0];
        if (room.IS_ENDED === 1) return res.json({ success: false, message: 'กิจกรรมนี้จบไปแล้ว ไม่สามารถเข้าร่วมได้' });
        if (room.IS_JOINED > 0) return res.json({ success: false, message: 'คุณเข้าร่วมกิจกรรมนี้ไปแล้ว' });
        if (room.current_members >= room.ROOM_CAPACITY) return res.json({ success: false, message: 'ห้องนี้ผู้เข้าร่วมเต็มแล้ว' });

        // บันทึกลงตาราง ROOMMEMBERS
        await dbQuery(`
            INSERT INTO ROOMMEMBERS (ROOM_ID, USER_ID, ROOMMEMBER_STATUS)
            VALUES (?, ?, 'pending')
        `, [roomId, userId]);
        // ส่วนที่เหลือเป็นการแจ้งเตือนการเข้าร่วม
        res.json({ success: true, message: 'เข้าร่วมสำเร็จ!' });

    } catch (err) {
        console.error(err);
        res.json({ success: false, message: 'เกิดข้อผิดพลาด: ' + err.message });
    }
});
// #endregion

// #region --- API ออกจากห้องกิจกรรม (leave-room/:id) --- 
router.post('/room/:id/leave', async (req, res) => {
    const token = req.cookies.token;
    if (!token) return res.json({ success: false, message: 'กรุณาเข้าสู่ระบบ' });

    const roomId = req.params.id;
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const userId = decoded.id;

        // เช็คก่อนว่าเป็นเจ้าของห้องไหม? (เจ้าของห้ามออก ต้องลบห้องอย่างเดียว)
        const room = await dbQuery(`
            SELECT ROOM_LEADER_ID, ROOM_EVENT_DATE, ROOM_EVENT_START_TIME,
                CASE 
                    WHEN NOW() >= TIMESTAMP(ROOM_EVENT_DATE, ROOM_EVENT_START_TIME) THEN 1 
                    ELSE 0 
            END AS IS_STARTED
            FROM ROOMS WHERE ROOM_ID = ?`, [roomId]);

        if (room.length > 0 && room[0].ROOM_LEADER_ID == userId)
            return res.json({ success: false, message: 'เจ้าของห้องไม่สามารถกดออกได้ (ต้องลบห้องกิจกรรม)' });
        if (room[0].IS_STARTED === 1)
            return res.json({ success: false, message: 'ไม่สามารถยกเลิกได้ เนื่องจากกิจกรรมเริ่มไปแล้ว' });

        // ลบออกจากตาราง
        await dbQuery('DELETE FROM ROOMMEMBERS WHERE ROOM_ID = ? AND USER_ID = ?', [roomId, userId]);

        res.json({ success: true, message: 'ยกเลิกการเข้าร่วมแล้ว' });
    } catch (err) {
        console.error(err);
        res.json({ success: false, message: 'เกิดข้อผิดพลาด' });
    }
});
// #endregion

// #region --- API เช็คชื่อเข้าร่วมกิจกรรม (check-in) --- 
router.post('/room/:id/check-in', async (req, res) => {
    const token = req.cookies.token;
    if (!token) return res.json({ success: false, message: 'กรุณาเข้าสู่ระบบ' });

    const roomId = req.params.id;
    const { code } = req.body; // รับรหัสจากหน้าบ้าน
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const userId = decoded.id;

        // 1. ดึงข้อมูลห้อง (รหัสที่ถูกต้อง) และเช็คว่า User เป็นสมาชิกไหม
        const checkSql = `
            SELECT 
                R.ROOM_CHECKIN_CODE,
                RM.ROOMMEMBER_STATUS,
                CASE 
                    WHEN R.ROOM_CHECKIN_CODE IS NOT NULL AND R.ROOM_CHECKIN_CODE != '' THEN 1 
                    ELSE 0 
                END AS HAS_CODE,

                CASE 
                    WHEN R.ROOM_CHECKIN_EXPIRE IS NOT NULL AND NOW() > R.ROOM_CHECKIN_EXPIRE THEN 1 
                    ELSE 0 
                END AS IS_EXPIRED 
            FROM ROOMS R
            JOIN ROOMMEMBERS RM ON R.ROOM_ID = RM.ROOM_ID
            WHERE R.ROOM_ID = ? AND RM.USER_ID = ?
        `;
        const result = await dbQuery(checkSql, [roomId, userId]);

        if (result.length === 0) {
            return res.json({ success: false, message: 'คุณไม่ใช่สมาชิกของห้องนี้' });
        }

        const roomData = result[0];
        // 2. ตรวจสอบรหัส
        if (roomData.ROOMMEMBER_STATUS === 'present') {
            return res.json({ success: false, message: 'คุณเช็คชื่อเข้าร่วมกิจกรรมนี้ไปแล้ว' });
        }

        if (roomData.HAS_CODE === 0) {
            return res.json({ success: false, message: 'ห้องนี้ยังไม่ได้เปิดการเช็คชื่อ (ติดต่อหัวหน้าห้อง)' });
        }

        if (roomData.IS_EXPIRED === 1) {
            return res.json({ success: false, message: 'รหัสเช็คชื่อหมดอายุแล้ว' });
        }

        if (roomData.ROOM_CHECKIN_CODE !== code) {
            return res.json({ success: false, message: 'รหัสเช็คชื่อไม่ถูกต้อง' });
        }

        // 3. บันทึกเวลาเช็คชื่อ และ แจกเครดิต (ถ้ามีระบบเครดิต)
        const updateSql = `
            UPDATE ROOMMEMBERS 
            SET ROOMMEMBER_CHECKIN_TIME = NOW(), 
                ROOMMEMBER_STATUS = 'present'
            WHERE ROOM_ID = ? AND USER_ID = ?
        `;
        await dbQuery(updateSql, [roomId, userId]);

        await dbQuery('UPDATE USERS SET USER_CREDIT_SCORE = LEAST(USER_CREDIT_SCORE + 10, 100) WHERE USER_ID = ?', [userId]);

        res.json({ success: true, message: 'เช็คชื่อสำเร็จ!' });

    } catch (err) {
        console.error(err);
        res.json({ success: false, message: 'Error: ' + err.message });
    }
});
// #endregion

// #region --- API ดึงข้อมูลห้องกิจกรรมทั้งหมด (get-rooms) พร้อม Filter/Search --- 
router.get('/rooms', async (req, res) => {
    try {
        const { search, date, start_time, end_time, locations, tags, page = 1, limit = 20 } = req.query;
        // --- SQL Sub Query ---
        let whereClauses = [];
        let queryParams = [];
        // ดึงเฉพาะกิจกรรมที่ยังไม่จบ
        whereClauses.push("TIMESTAMP(r.ROOM_EVENT_DATE, r.ROOM_EVENT_END_TIME) > NOW()");
        // ส่วนพิมพ์ค้นหา
        if (search) {
            const isNumeric = !isNaN(search) && search.trim() !== '';
            if (isNumeric) {
                whereClauses.push("(r.ROOM_TITLE LIKE ? OR r.ROOM_ID = ?)");
                queryParams.push(`%${search}%`, search);
            } else {
                whereClauses.push("r.ROOM_TITLE LIKE ?");
                queryParams.push(`%${search}%`);
            }
        }
        // ตัวกรองวันที่/เวลา
        if (date) {
            whereClauses.push("r.ROOM_EVENT_DATE >= ?");
            queryParams.push(date);
        }
        if (start_time) {
            whereClauses.push("r.ROOM_EVENT_START_TIME >= ?");
            queryParams.push(start_time);
        }
        if (end_time) {
            whereClauses.push("r.ROOM_EVENT_END_TIME <= ?");
            queryParams.push(end_time);
        }
        // ตัวกรองสถานที่
        if (locations) {
            const locationNames = locations.split(',');
            if (locationNames.length > 0) {
                whereClauses.push(`l.LOCATION_NAME IN (?)`);
                queryParams.push(locationNames);
            }
        }
        // ตัวกรอง Tags
        if (tags) {
            const tagList = tags.split(',');
            if (tagList.length > 0) {
                whereClauses.push(`
                    r.ROOM_ID IN (
                        SELECT rt_sub.ROOM_ID 
                        FROM ROOMTAGS rt_sub 
                        JOIN TAGS t_sub ON rt_sub.TAG_ID = t_sub.TAG_ID 
                        WHERE t_sub.TAG_NAME IN (?)
                    )
                `);
                queryParams.push(tagList);
            }
        }
        const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

        // --- SQL Query หลัก ---
        const sql = `
            SELECT 
                r.ROOM_ID,
                r.ROOM_TITLE,
                r.ROOM_EVENT_DATE,
                TIME_FORMAT(r.ROOM_EVENT_START_TIME, '%H:%i') AS FORMAT_START_TIME,
                TIME_FORMAT(r.ROOM_EVENT_END_TIME, '%H:%i') AS FORMAT_END_TIME,
                r.ROOM_CAPACITY,
                r.ROOM_IMG,
                l.LOCATION_NAME,
                COUNT(DISTINCT rm.USER_ID) AS MEMBER_COUNT,
                GROUP_CONCAT(DISTINCT t.TAG_NAME ORDER BY rt.ID) AS TAGS
            FROM ROOMS r
            LEFT JOIN LOCATIONS l ON r.ROOM_EVENT_LOCATION = l.LOCATION_ID
            LEFT JOIN ROOMTAGS rt ON r.ROOM_ID = rt.ROOM_ID
            LEFT JOIN TAGS t ON rt.TAG_ID = t.TAG_ID
            LEFT JOIN ROOMMEMBERS rm ON r.ROOM_ID = rm.ROOM_ID
            ${whereSql}
            GROUP BY r.ROOM_ID
            ORDER BY r.ROOM_EVENT_DATE , r.ROOM_EVENT_START_TIME ASC
            LIMIT ? OFFSET ?
        `;
        const limitNum = parseInt(limit);
        const pageNum = parseInt(page);
        const offset = (pageNum - 1) * limitNum;
        queryParams.push(limitNum, offset);
        let rooms = await dbQuery(sql, queryParams);

        // --- หลังจากที่ดึง SQL มาแล้วก็เอามาเรียงใหม่ให้ตรงกับ Tag ผู้ใช้ ---
        const token = req.cookies.token;
        if (token && !search && !date && !start_time && !end_time && !locations && !tags) {
            try {
                const decoded = jwt.verify(token, process.env.JWT_SECRET);
                // หลังจากที่ดึงห้องมาแล้ว ส่วนนี้ดึง User Tags ของผู้ใช้ เพื่อเอามาใช้เรียง Feed
                const sqlUserTags = `
                    SELECT T.TAG_NAME 
                    FROM USERTAGS ut
                    JOIN TAGS T ON ut.TAG_ID = T.TAG_ID
                    WHERE ut.USER_ID = ?
                    ORDER BY ut.ID ASC
                `;
                const userTagResult = await dbQuery(sqlUserTags, [decoded.id]);

                const userTags = userTagResult.map(row => row.TAG_NAME); // ดึงชื่อ Tag มาเป็น Array

                if (userTags.length > 0) {
                    rooms = rooms.map(room => {
                        let priority = 99;
                        // หา Main Tag ของห้อง (เอาตัวแรกสุด)
                        const roomMainTag = room.TAGS ? room.TAGS.split(',')[0] : null;

                        if (roomMainTag) {
                            // เช็คว่า Main Tag ของห้อง ตรงกับ User Tag อันดับที่เท่าไหร่?
                            const matchIndex = userTags.indexOf(roomMainTag);
                            if (matchIndex !== -1) {
                                priority = matchIndex; // ถ้าตรง ให้คะแนน priority เท่ากับลำดับ (0, 1, 2)
                            }
                        }
                        return { ...room, priority }; // แปะป้าย priority ไว้ชั่วคราว
                    });

                    // เรียงลำดับใหม่ (Sort)
                    rooms.sort((a, b) => {
                        // เรียงตาม Priority น้อยไปมาก (0 -> 1 -> 2 -> 99)
                        if (a.priority !== b.priority) {
                            return a.priority - b.priority;
                        }
                        // ถ้า Priority เท่ากัน (เช่น ไม่ตรงทั้งคู่) ให้เรียงตามวันที่เหมือนเดิม
                        return new Date(a.ROOM_EVENT_DATE) - new Date(b.ROOM_EVENT_DATE);
                    });
                }
            } catch (err) {
                // ถ้า Token ผิด หรือ Error อื่นๆ ก็ปล่อยผ่าน (แสดงแบบปกติ)
                console.error('Feed Sort Warning:', err.message);
            }
        }

        res.json({ success: true, rooms });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Database error' });
    }
});
// #endregion

// #region --- API ดึงกิจกรรมของฉัน (My Activities) --- 
router.get('/my-activities', async (req, res) => {
    const token = req.cookies.token;
    if (!token) return res.json({ success: false, message: 'กรุณาเข้าสู่ระบบ' });

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const userId = decoded.id;
        const userRole = decoded.role;

        // รับค่า Query Params
        const { type, search, date, start_time, end_time, locations, tags, page = 1, limit = 20 } = req.query;

        let whereClauses = [];
        let queryParams = [];
        let roommembersJoin = "";
        let orderBy = "";

        if (type === 'history') {
            roommembersJoin = "INNER JOIN ROOMMEMBERS rm_me ON r.ROOM_ID = rm_me.ROOM_ID AND rm_me.USER_ID = ?";
            queryParams.push(userId);

            whereClauses.push(`(
                r.ROOM_EVENT_DATE < CURRENT_DATE() OR 
                (r.ROOM_EVENT_DATE = CURRENT_DATE() AND r.ROOM_EVENT_END_TIME < CURRENT_TIME())
            )`);
            orderBy = "r.ROOM_EVENT_DATE DESC, r.ROOM_EVENT_START_TIME DESC";

        } else if (type === 'created') {
            if (userRole !== 'admin') {
                whereClauses.push("r.ROOM_LEADER_ID = ?");
                queryParams.push(userId);
            }
            orderBy = "ROOM_STATUS ASC, r.ROOM_EVENT_DATE ASC, r.ROOM_EVENT_START_TIME ASC";
            
        } else {
            return res.json({ success: false, message: 'กรุณาระบุประเภทกิจกรรม (filter)' });
        }

        // การค้นหาและกรอง
        // พิมพ์ค้นหา
        if (search) {
            const isNumeric = !isNaN(search) && search.trim() !== '';
            if (isNumeric) {
                whereClauses.push("(r.ROOM_TITLE LIKE ? OR r.ROOM_ID = ?)");
                queryParams.push(`%${search}%`, search);
            } else {
                whereClauses.push("r.ROOM_TITLE LIKE ?");
                queryParams.push(`%${search}%`);
            }
        }
        // Date & Time
        if (date) {
            whereClauses.push("r.ROOM_EVENT_DATE >= ?");
            queryParams.push(date);
        }
        if (start_time && end_time) {
            whereClauses.push("r.ROOM_EVENT_START_TIME >= ? AND r.ROOM_EVENT_END_TIME <= ?");
            queryParams.push(start_time, end_time);
        } else if (start_time) {
            whereClauses.push("r.ROOM_EVENT_START_TIME >= ?");
            queryParams.push(start_time);
        } else if (end_time) {
            whereClauses.push("r.ROOM_EVENT_END_TIME <= ?");
            queryParams.push(end_time);
        }

        // Locations & Tags
        if (locations) {
            const locationNames = locations.split(',').map(name => name.trim()).filter(name => name !== '');
            if (locationNames.length > 0) {
                whereClauses.push(`l.LOCATION_NAME IN (?)`);
                queryParams.push(locationNames);
            }
        }
        if (tags) {
            const tagList = tags.split(',').map(t => t.trim()).filter(t => t !== '');
            if (tagList.length > 0) {
                whereClauses.push(`t.TAG_NAME IN (?)`);
                queryParams.push(tagList);
            }
        }

        const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

        // SQL Query หลัก
        const sql = `
            SELECT 
                r.ROOM_ID,
                r.ROOM_TITLE,
                r.ROOM_EVENT_DATE,
                TIME_FORMAT(r.ROOM_EVENT_START_TIME, '%H:%i') AS FORMAT_START_TIME,
                TIME_FORMAT(r.ROOM_EVENT_END_TIME, '%H:%i') AS FORMAT_END_TIME,
                
                -- คำนวณสถานะเสมอ (จะได้มีใช้ทั้งสองแบบ)
                CASE 
                    WHEN NOW() < TIMESTAMP(r.ROOM_EVENT_DATE, r.ROOM_EVENT_START_TIME) THEN 0 -- pending
                    WHEN NOW() > TIMESTAMP(r.ROOM_EVENT_DATE, r.ROOM_EVENT_END_TIME) THEN 2 -- completed
                ELSE 1 -- inProgress
                END AS ROOM_STATUS,

                r.ROOM_CAPACITY,
                r.ROOM_IMG,
                l.LOCATION_NAME,
                COUNT(DISTINCT rm_all.USER_ID) AS MEMBER_COUNT,
                GROUP_CONCAT(DISTINCT t.TAG_NAME ORDER BY rt.ID ASC) AS TAGS
            FROM ROOMS r
            ${roommembersJoin}
            LEFT JOIN ROOMMEMBERS rm_all ON r.ROOM_ID = rm_all.ROOM_ID
            LEFT JOIN LOCATIONS l ON r.ROOM_EVENT_LOCATION = l.LOCATION_ID
            LEFT JOIN ROOMTAGS rt ON r.ROOM_ID = rt.ROOM_ID
            LEFT JOIN TAGS t ON rt.TAG_ID = t.TAG_ID
            ${whereSql}
            GROUP BY r.ROOM_ID
            ORDER BY ${orderBy}
            LIMIT ? OFFSET ?
        `;    
        const limitNum = parseInt(limit);
        const pageNum = parseInt(page);
        const offset = (pageNum - 1) * limitNum;
        queryParams.push(limitNum, offset);

        const rooms = await dbQuery(sql, queryParams);
        res.json({ success: true, rooms });

    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Database error' });
    }
});
// #endregion

// #region --- API ดึงกิจกรรมที่กำลังเข้าร่วม (Active / Upcoming) --- 
router.get('/my-joined-active-rooms', async (req, res) => {
    const token = req.cookies.token;
    if (!token) return res.json({ success: false, message: 'กรุณาเข้าสู่ระบบ' });

    try {
        // กิจกรรมที่กำลังเข้าร่วมและไม่ได้เป็นคนสร้าง
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const userId = decoded.id;
        const sql = `
            SELECT 
                r.ROOM_ID,
                r.ROOM_TITLE,
                r.ROOM_EVENT_DATE,
                TIME_FORMAT(r.ROOM_EVENT_START_TIME, '%H:%i') AS FORMAT_START_TIME,
                TIME_FORMAT(r.ROOM_EVENT_END_TIME, '%H:%i') AS FORMAT_END_TIME,
                r.ROOM_CAPACITY,
                r.ROOM_IMG,
                l.LOCATION_NAME,
                (SELECT COUNT(USER_ID) FROM ROOMMEMBERS WHERE ROOM_ID = r.ROOM_ID) AS MEMBER_COUNT,
                GROUP_CONCAT(DISTINCT t.TAG_NAME ORDER BY rt.ID ASC) AS TAGS
            FROM ROOMS r
            JOIN ROOMMEMBERS rm ON r.ROOM_ID = rm.ROOM_ID
            LEFT JOIN LOCATIONS l ON r.ROOM_EVENT_LOCATION = l.LOCATION_ID
            LEFT JOIN ROOMTAGS rt ON r.ROOM_ID = rt.ROOM_ID
            LEFT JOIN TAGS t ON rt.TAG_ID = t.TAG_ID
            WHERE rm.USER_ID = ? 
            AND r.ROOM_LEADER_ID != ?
            AND (
                r.ROOM_EVENT_DATE > CURRENT_DATE() OR 
                (r.ROOM_EVENT_DATE = CURRENT_DATE() AND r.ROOM_EVENT_END_TIME > CURRENT_TIME())
            )
            GROUP BY r.ROOM_ID
            ORDER BY r.ROOM_EVENT_DATE ASC, r.ROOM_EVENT_START_TIME ASC
        `;
        const rooms = await dbQuery(sql, [userId, userId]);
        // ส่วนที่เหลือเป็นการแจ้งเตือนกรณี error
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

    // SQL ดึงข้อมูลห้อง + ชื่อคนสร้าง + ชื่อสถานที่ + จำนวนคน + Tags
    const sql = `
        SELECT 
            r.*,
            NOW() AS SERVER_TIME,
            CASE 
                WHEN r.ROOM_CHECKIN_EXPIRE IS NOT NULL AND NOW() > r.ROOM_CHECKIN_EXPIRE THEN 1 
                ELSE 0 
            END AS IS_EXPIRED,

            CASE 
                WHEN NOW() < TIMESTAMP(r.ROOM_EVENT_DATE, r.ROOM_EVENT_START_TIME) THEN 'pending'
                WHEN NOW() > TIMESTAMP(r.ROOM_EVENT_DATE, r.ROOM_EVENT_END_TIME) THEN 'completed'
                ELSE 'inProgress'
            END AS ROOM_STATUS, 

            l.LOCATION_NAME,
            CONCAT(u.USER_FNAME, ' ', u.USER_LNAME) AS LEADER_NAME,
            u.USER_IMG AS LEADER_IMG,
            u.USER_CREDIT_SCORE AS LEADER_CREDIT_SCORE,
            (SELECT COUNT(*) FROM ROOMMEMBERS WHERE ROOM_ID = r.ROOM_ID) AS CURRENT_MEMBERS,
            GROUP_CONCAT(t.TAG_NAME ORDER BY rt.ID ASC) AS TAGS
        FROM ROOMS r
        LEFT JOIN LOCATIONS l ON r.ROOM_EVENT_LOCATION = l.LOCATION_ID
        LEFT JOIN USERS u ON r.ROOM_LEADER_ID = u.USER_ID
        LEFT JOIN ROOMTAGS rt ON r.ROOM_ID = rt.ROOM_ID
        LEFT JOIN TAGS t ON rt.TAG_ID = t.TAG_ID
        WHERE r.ROOM_ID = ?
        GROUP BY r.ROOM_ID
    `;
    // ส่วนที่เหลือเป็นการแจ้งเตือนเมื่อไม่พบห้อง
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

// #region --- API ดึงรายชื่อสมาชิกในห้องกิจกรรม (room/:id/members) --- 
router.get('/room/:id/members', (req, res) => {
    const roomId = req.params.id;

    // Join ตาราง ROOMMEMBERS กับ USERS เพื่อเอารูปและชื่อ
    const sql = `
        SELECT 
            u.USER_ID, u.USER_FNAME, u.USER_LNAME, u.USER_IMG, u.USER_CREDIT_SCORE , rm.ROOMMEMBER_STATUS, rm.ROOMMEMBER_CHECKIN_TIME
        FROM ROOMMEMBERS rm
        JOIN USERS u ON rm.USER_ID = u.USER_ID
        WHERE rm.ROOM_ID = ?
    `;

    db.query(sql, [roomId], (err, results) => {
        if (err) {
            console.error(err);
            return res.json({ success: false, message: 'Database error' });
        }
        res.json({ success: true, members: results });
    });
});
// #endregion

// #region --- API สร้างรหัสเช็คชื่อกิจกรรม (generate-code) ---
router.post('/room/:id/generate-code', async (req, res) => {
    const token = req.cookies.token;
    if (!token) return res.json({ success: false, message: 'กรุณาเข้าสู่ระบบ' });

    const roomId = req.params.id;
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const userId = decoded.id;
        // เช็คสถานะเวลาของกิจกรรม
        const sqlCheck = `
            SELECT 
                ROOM_LEADER_ID, 
                ROOM_EVENT_DATE, 
                ROOM_EVENT_START_TIME,
                ROOM_EVENT_END_TIME,
                CASE 
                    WHEN NOW() < TIMESTAMP(ROOM_EVENT_DATE, ROOM_EVENT_START_TIME) THEN 1
                    ELSE 0 
                END AS IS_NOT_STARTED,
                TIMESTAMPDIFF(MINUTE, NOW(), TIMESTAMP(ROOM_EVENT_DATE, ROOM_EVENT_END_TIME)) AS MINUTES_UNTIL_END,
                TIMESTAMPDIFF(MINUTE, TIMESTAMP(ROOM_EVENT_DATE, ROOM_EVENT_START_TIME), TIMESTAMP(ROOM_EVENT_DATE, ROOM_EVENT_END_TIME)) AS DURATION_MINUTE
            FROM ROOMS 
            WHERE ROOM_ID = ?
            `;
        const roomCheck = await dbQuery(sqlCheck, [roomId]);
        if (roomCheck.length === 0) return res.json({ success: false, message: 'ไม่พบห้องกิจกรรม' });
        if (roomCheck[0].ROOM_LEADER_ID != userId) return res.json({ success: false, message: 'ไม่มีสิทธิ์ดำเนินการ' });

        const room = roomCheck[0];
        
        if (room.DURATION_MINUTE < 15)
            return res.json({ success: false, message: 'กิจกรรมนี้มีระยะเวลาน้อยกว่า 15 นาที ไม่สามารถเปิดระบบเช็คชื่อได้' });
        if (room.IS_NOT_STARTED === 1)
            return res.json({ success: false, message: 'ยังไม่ถึงเวลาเริ่มกิจกรรม (กรุณารอให้ถึงเวลาก่อน)' });
        if (room.MINUTES_UNTIL_END <= 10)
            return res.json({ success: false, message: 'ไม่สามารถเปิดระบบเช็คชื่อได้ เนื่องจากเหลือเวลาทำกิจกรรมน้อยกว่า 10 นาที หรือกิจกรรมจบไปแล้ว' });

        // สุ่มรหัส 6 หลัก (ตัวอักษรใหญ่ + ตัวเลข)
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let code = '';
        for (let i = 0; i < 6; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }

        const sqlUpdate = `
            UPDATE ROOMS 
            SET ROOM_CHECKIN_CODE = ?, 
                ROOM_CHECKIN_EXPIRE = DATE_SUB(TIMESTAMP(ROOM_EVENT_DATE, ROOM_EVENT_END_TIME), INTERVAL 10 MINUTE)
            WHERE ROOM_ID = ?
        `;
        await dbQuery(sqlUpdate, [code, roomId]);

        const updatedRoom = await dbQuery('SELECT ROOM_CHECKIN_EXPIRE FROM ROOMS WHERE ROOM_ID = ?', [roomId]);
        const expireTime = updatedRoom[0].ROOM_CHECKIN_EXPIRE;

        res.json({ success: true, message: 'เปิดระบบเช็คชื่อแล้ว', code: code, expire: expireTime });

    } catch (err) {
        console.error(err);
        res.json({ success: false, message: 'เกิดข้อผิดพลาด: ' + err.message });
    }
});
// #endregion

module.exports = router;