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

        let params = [roomTitle, roomEventStartTime, roomEventEndTime, roomEventDate, roomLocation, roomDescription, leaderId, roomCapacity, imagePath];
        // บันทึกลงตาราง ROOMS
        const sql = `INSERT INTO ROOMS
                (ROOM_TITLE, ROOM_EVENT_START_TIME, ROOM_EVENT_END_TIME, ROOM_EVENT_DATE, ROOM_EVENT_LOCATION, ROOM_DESCRIPTION, ROOM_LEADER_ID, ROOM_CAPACITY, ROOM_IMG)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`;
        const roomResult = await dbQuery(sql, params);
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
                CASE WHEN NOW() >= TIMESTAMP(ROOM_EVENT_DATE, ROOM_EVENT_START_TIME) THEN 1 ELSE 0 END AS is_started
            FROM ROOMS 
            WHERE ROOM_ID = ?`, [roomId]);
        if (checkOwner.length === 0)
            return res.json({ success: false, message: 'ไม่พบห้องกิจกรรม' });
        const roomInfo = checkOwner[0];
        if (roomInfo.ROOM_LEADER_ID != userId && userRole !== 'admin')
            return res.json({ success: false, message: 'คุณไม่มีสิทธิ์แก้ไขห้องนี้' });
        // ถ้ากิจกรรมเริ่มไปแล้ว (และไม่ใช่ Admin) ห้ามแก้ไข
        if (roomInfo.is_started === 1 && userRole !== 'admin')
            return res.json({ success: false, message: 'ไม่สามารถแก้ไขกิจกรรมที่เริ่มไปแล้วได้' });
        // 2. รับค่าที่ส่งมาแก้ไข
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
                CASE WHEN NOW() >= TIMESTAMP(ROOM_EVENT_DATE, ROOM_EVENT_START_TIME) THEN 1 ELSE 0 END AS is_started
            FROM ROOMS 
            WHERE ROOM_ID = ?`, [roomId]);

        if (checkOwner.length === 0)
            return res.json({ success: false, message: 'ไม่พบห้องกิจกรรม' });
        const roomInfo = checkOwner[0];
        if (roomInfo.ROOM_LEADER_ID != userId && userRole !== 'admin')
            return res.json({ success: false, message: 'คุณไม่มีสิทธิ์ลบห้องนี้' });
        if (roomInfo.is_started === 1 && userRole !== 'admin')
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

        // 1. เช็คว่าห้องเต็มหรือยัง? และเช็คว่าเคย join ไปหรือยัง?
        const roomCheck = await dbQuery(`
            SELECT 
                r.ROOM_CAPACITY,
                (SELECT COUNT(*) FROM ROOMMEMBERS WHERE ROOM_ID = r.ROOM_ID) as current_members,
                (SELECT COUNT(*) FROM ROOMMEMBERS WHERE ROOM_ID = r.ROOM_ID AND USER_ID = ?) as is_joined,
                CASE 
                    WHEN NOW() > TIMESTAMP(r.ROOM_EVENT_DATE, r.ROOM_EVENT_END_TIME) THEN 1 
                    ELSE 0 
                END AS is_ended
            FROM ROOMS r
            WHERE r.ROOM_ID = ?
        `, [userId, roomId]);

        if (roomCheck.length === 0) return res.json({ success: false, message: 'ไม่พบห้องกิจกรรม' });

        const room = roomCheck[0];

        if (room.is_ended === 1) return res.json({ success: false, message: 'กิจกรรมนี้จบไปแล้ว ไม่สามารถเข้าร่วมได้' });

        if (room.is_joined > 0) return res.json({ success: false, message: 'คุณเข้าร่วมกิจกรรมนี้ไปแล้ว' });

        if (room.current_members >= room.ROOM_CAPACITY) return res.json({ success: false, message: 'ห้องเต็มแล้วครับ T_T' });

        // 2. บันทึกลงตาราง ROOMMEMBERS
        await dbQuery(`
            INSERT INTO ROOMMEMBERS (ROOM_ID, USER_ID, ROOMMEMBER_STATUS)
            VALUES (?, ?, 'pending')
        `, [roomId, userId]);

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
                END AS is_started
            FROM ROOMS WHERE ROOM_ID = ?`, [roomId]);

        if (room.length > 0 && room[0].ROOM_LEADER_ID == userId)
            return res.json({ success: false, message: 'เจ้าของห้องไม่สามารถกดออกได้ (ต้องลบห้องกิจกรรม)' });
        if (room.is_started === 1)
            return res.json({ success: false, message: 'ไม่สามารถยกเลิกได้ เนื่องจากกิจกรรมเริ่มไปแล้ว' });

        // ลบออกจากตาราง
        await dbQuery('DELETE FROM ROOMMEMBERS WHERE ROOM_ID = ? AND USER_ID = ?', [roomId, userId]);

        res.json({ success: true, message: 'ยกเลิกการเข้าร่วมแล้ว' });
    } catch (err) {
        console.error(err);
        res.json({ success: false, message: 'เกิดข้อผิดพลาด' });
    }
});


// #region --- API ดึงประวัติกิจกรรมที่จบไปแล้ว (History) ---
router.get('/my-history', async (req, res) => {
    const token = req.cookies.token;
    if (!token) return res.json({ success: false, message: 'กรุณาเข้าสู่ระบบ' });

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const userId = decoded.id;
        const { search, date, start_time, end_time, locations, tags } = req.query;

        let whereClauses = [];
        let queryParams = [];

        // 1. เงื่อนไข "กิจกรรมที่จบไปแล้ว" (เวลาปัจจุบัน เลยเวลาจบกิจกรรมแล้ว)
        whereClauses.push(`(
            r.ROOM_EVENT_DATE < CURRENT_DATE() OR 
            (r.ROOM_EVENT_DATE = CURRENT_DATE() AND r.ROOM_EVENT_END_TIME < CURRENT_TIME())
        )`);

        // 2. เงื่อนไขการค้นหา (Filter)
        if (search) {
            whereClauses.push("r.ROOM_TITLE LIKE ?");
            queryParams.push(`%${search}%`);
        }
        if (date) {
            whereClauses.push("r.ROOM_EVENT_DATE = ?");
            queryParams.push(date);
        }
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

        const whereSql = whereClauses.length > 0 ? `AND ${whereClauses.join(' AND ')}` : '';

        // SQL Query
        // ใช้ INNER JOIN กับ ROOMMEMBERS เพื่อดึง "เฉพาะห้องที่ User นี้เข้าร่วม (หรือเป็น Leader)"
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
                COUNT(DISTINCT rm_all.USER_ID) AS member_count,
                GROUP_CONCAT(DISTINCT t.TAG_NAME) AS tags
            FROM ROOMS r
            INNER JOIN ROOMMEMBERS rm_me ON r.ROOM_ID = rm_me.ROOM_ID AND rm_me.USER_ID = ? 
            LEFT JOIN ROOMMEMBERS rm_all ON r.ROOM_ID = rm_all.ROOM_ID
            LEFT JOIN LOCATIONS l ON r.ROOM_EVENT_LOCATION = l.LOCATION_ID
            LEFT JOIN ROOMTAGS rt ON r.ROOM_ID = rt.ROOM_ID
            LEFT JOIN TAGS t ON rt.TAG_ID = t.TAG_ID
            WHERE 1=1 ${whereSql}
            GROUP BY r.ROOM_ID
            ORDER BY r.ROOM_EVENT_DATE DESC, r.ROOM_EVENT_START_TIME DESC
        `;

        // ใส่ userId เป็น parameter ตัวแรก (สำหรับ rm_me.USER_ID = ?)
        const finalParams = [userId, ...queryParams];

        const rooms = await dbQuery(sql, finalParams);
        res.json({ success: true, rooms });

    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Database error' });
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
                -- เช็คว่ามีการตั้งรหัสหรือยัง (1 = มี, 0 = ไม่มี)
                CASE 
                    WHEN R.ROOM_CHECKIN_CODE IS NOT NULL AND R.ROOM_CHECKIN_CODE != '' THEN 1 
                    ELSE 0 
                END AS has_code,
                -- สร้างตัวแปร is_expired (1 = หมดอายุ, 0 = ยังไม่หมด)
                CASE 
                    WHEN R.ROOM_CHECKIN_EXPIRE IS NOT NULL AND NOW() > R.ROOM_CHECKIN_EXPIRE THEN 1 
                    ELSE 0 
                END AS is_expired
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

        if (roomData.has_code === 0) {
            return res.json({ success: false, message: 'ห้องนี้ยังไม่ได้เปิดการเช็คชื่อ (ติดต่อหัวหน้าห้อง)' });
        }

        if (roomData.is_expired === 1) {
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
        // รับ page และ limit เพิ่มเข้ามา (ตั้งค่า default ไว้)
        const { search, date, start_time, end_time, locations, tags, page = 1, limit = 20 } = req.query;

        let whereClauses = [];
        let queryParams = [];
        let locationJoin = "LEFT JOIN LOCATIONS l ON r.ROOM_EVENT_LOCATION = l.LOCATION_ID";

        // 1. เงื่อนไขการค้นหา (search input)
        if (search) {
            whereClauses.push("r.ROOM_TITLE LIKE ?");
            queryParams.push(`%${search}%`);
        }
        // เงื่อนไขพื้นฐาน: ดึงเฉพาะห้องกิจกรรมที่ยังไม่จบ
        whereClauses.push("TIMESTAMP(r.ROOM_EVENT_DATE, r.ROOM_EVENT_END_TIME) > NOW()");

        // 2. เงื่อนไขตัวกรองวันที่/เวลา
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

        // 3. เงื่อนไขตัวกรองสถานที่ (Location Tags)
        if (locations) {
            const locationNames = locations.split(',').map(name => name.trim()).filter(name => name !== '');
            if (locationNames.length > 0) {
                whereClauses.push(`l.LOCATION_NAME IN (?)`);
                queryParams.push(locationNames);
            }
        }

        // 4. เงื่อนไขตัวกรอง Tag (Tags)
        if (tags) {
            const tagList = tags.split(',').map(t => t.trim()).filter(t => t !== '');
            if (tagList.length > 0) {
                // ค้นหาเฉพาะ ID ห้องที่มี Tag เหล่านี้
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

        // สร้าง WHERE clause
        const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

        // ✅ 1. คำนวณ Limit และ Offset
        const limitNum = parseInt(limit) || 20; // ค่า Default 20
        const pageNum = parseInt(page) || 1;
        const offset = (pageNum - 1) * limitNum;

        // --- SQL Query หลัก ---
        const sql = `
            SELECT 
                r.ROOM_ID,
                r.ROOM_TITLE,
                r.ROOM_EVENT_DATE,
                TIME_FORMAT(r.ROOM_EVENT_START_TIME, '%H:%i') AS formatted_start_time,
                TIME_FORMAT(r.ROOM_EVENT_END_TIME, '%H:%i') AS formatted_end_time,
                r.ROOM_CAPACITY,
                r.ROOM_IMG,

                CASE 
                    WHEN NOW() < TIMESTAMP(r.ROOM_EVENT_DATE, r.ROOM_EVENT_START_TIME) THEN 'pending'
                    WHEN NOW() > TIMESTAMP(r.ROOM_EVENT_DATE, r.ROOM_EVENT_END_TIME) THEN 'completed'
                    ELSE 'inProgress'
                END AS ROOM_STATUS,

                l.LOCATION_NAME,
                COUNT(DISTINCT rm.USER_ID) AS member_count,
                GROUP_CONCAT(DISTINCT t.TAG_NAME ORDER BY rt.ID ASC) AS tags
            FROM ROOMS r
            ${locationJoin}
            LEFT JOIN ROOMMEMBERS rm ON r.ROOM_ID = rm.ROOM_ID
            LEFT JOIN ROOMTAGS rt ON r.ROOM_ID = rt.ROOM_ID
            LEFT JOIN TAGS t ON rt.TAG_ID = t.TAG_ID
            ${whereSql}
            GROUP BY r.ROOM_ID
            ORDER BY r.ROOM_EVENT_DATE, r.ROOM_EVENT_START_TIME ASC

            LIMIT ? OFFSET ?
        `;
        // ✅ 3. ยัดค่า limit และ offset ใส่ parameter ตัวสุดท้าย
        queryParams.push(limitNum, offset);
        // เรียก Query ดึงข้อมูล
        let rooms = await dbQuery(sql, queryParams);

        // --- Logic Personalized Feed (JS Sort) ---
        const token = req.cookies.token;
        // ถ้ามีการค้นหา (search มีค่า) จะข้าม Block นี้ไปเลย ทำให้ใช้ลำดับ Date/Time จาก SQL ปกติ
        if (token && !search && !date && !start_time && !end_time && !locations && !tags) {
            try {
                const decoded = jwt.verify(token, process.env.JWT_SECRET);

                // 3. ดึง Tag ของผู้ใช้คนนี้ (เรียงตามที่บันทึกไว้)
                const sqlUserTags = `
                    SELECT T.TAG_NAME 
                    FROM USERTAGS UT
                    JOIN TAGS T ON UT.TAG_ID = T.TAG_ID
                    WHERE UT.USER_ID = ?
                    ORDER BY UT.ID ASC
                `;
                const userTagResult = await dbQuery(sqlUserTags, [decoded.id]);
                // แปลงเป็น Array ชื่อ Tag เช่น ['Coding', 'Music', 'Calculus']
                const userTags = userTagResult.map(row => row.TAG_NAME);

                if (userTags.length > 0) {
                    rooms = rooms.map(room => {
                        let priority = 99;
                        // หา Main Tag ของห้อง (เอาตัวแรกสุด)
                        const roomMainTag = room.tags ? room.tags.split(',')[0] : null;

                        if (roomMainTag) {
                            // เช็คว่า Main Tag ของห้อง ตรงกับ User Tag อันดับที่เท่าไหร่?
                            const matchIndex = userTags.indexOf(roomMainTag);
                            if (matchIndex !== -1) {
                                priority = matchIndex; // ถ้าตรง ให้คะแนน priority เท่ากับลำดับ (0, 1, 2)
                            }
                        }
                        return { ...room, priority }; // แปะป้าย priority ไว้ชั่วคราว
                    });

                    // 5. เรียงลำดับใหม่ (Sort)
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

// #region --- API ดึงกิจกรรมที่กำลังเข้าร่วม (Active / Upcoming) --- 
router.get('/my-joined-active-rooms', async (req, res) => {
    const token = req.cookies.token;
    if (!token) return res.json({ success: false, message: 'กรุณาเข้าสู่ระบบ' });

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const userId = decoded.id;

        // SQL Query:
        // 1. JOIN ROOMMEMBERS: เพื่อดูว่า User นี้เข้าร่วมห้องไหนบ้าง
        // 2. WHERE เงื่อนไขเวลา: วันที่จัดกิจกรรม ต้องมากกว่าหรือเท่ากับ ปัจจุบัน (ยังไม่จบ)
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
                (SELECT COUNT(USER_ID) FROM ROOMMEMBERS WHERE ROOM_ID = r.ROOM_ID) AS member_count,
                GROUP_CONCAT(DISTINCT t.TAG_NAME ORDER BY rt.ID ASC) AS tags
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
        res.json({ success: true, rooms });

    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Database error' });
    }
});
// #endregion

// #region --- API ดึงห้องกิจกรรมที่สร้างโดย User ปัจจุบัน (my-created-rooms) --- 
router.get('/my-created-rooms', async (req, res) => {
    const token = req.cookies.token;
    if (!token) return res.json({ success: false, message: 'กรุณาเข้าสู่ระบบ' });

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const userId = decoded.id;
        const userRole = decoded.role;

        // รับค่า Query Params (search, date, tags, etc.) เหมือน API /rooms
        const { search, date, start_time, end_time, locations, tags } = req.query;

        let whereClauses = [];
        let queryParams = [];

        // 1. เงื่อนไขสำคัญที่สุด: ต้องเป็นห้องของ User คนนี้เท่านั้น
        if (userRole !== 'admin') {
            whereClauses.push("r.ROOM_LEADER_ID = ?");
            queryParams.push(userId);
        }
        // 2. เงื่อนไขการค้นหาอื่นๆ (ก๊อปปี้ Logic มาจาก /rooms)
        if (search) {
            whereClauses.push("r.ROOM_TITLE LIKE ?");
            queryParams.push(`%${search}%`);
        }
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

        // SQL Query (ใช้ DISTINCT เหมือนเดิม)
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
                COUNT(DISTINCT rm.USER_ID) AS member_count,
                GROUP_CONCAT(DISTINCT t.TAG_NAME ORDER BY rt.ID ASC) AS tags
            FROM ROOMS r
            LEFT JOIN LOCATIONS l ON r.ROOM_EVENT_LOCATION = l.LOCATION_ID
            LEFT JOIN ROOMMEMBERS rm ON r.ROOM_ID = rm.ROOM_ID
            LEFT JOIN ROOMTAGS rt ON r.ROOM_ID = rt.ROOM_ID
            LEFT JOIN TAGS t ON rt.TAG_ID = t.TAG_ID
            ${whereSql}
            GROUP BY r.ROOM_ID
            ORDER BY r.ROOM_ID DESC
        `;

        const rooms = await dbQuery(sql, queryParams);
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
            NOW() AS SERVER_TIME,
            CASE 
                WHEN R.ROOM_CHECKIN_EXPIRE IS NOT NULL AND NOW() > R.ROOM_CHECKIN_EXPIRE THEN 1 
                ELSE 0 
            END AS is_expired,

            CASE 
                WHEN NOW() < TIMESTAMP(R.ROOM_EVENT_DATE, R.ROOM_EVENT_START_TIME) THEN 'pending'
                WHEN NOW() > TIMESTAMP(R.ROOM_EVENT_DATE, R.ROOM_EVENT_END_TIME) THEN 'completed'
                ELSE 'inProgress'
            END AS ROOM_STATUS, 

            L.LOCATION_NAME,
            CONCAT(U.USER_FNAME, ' ', U.USER_LNAME) AS LEADER_NAME,
            U.USER_IMG AS LEADER_IMG,
            U.USER_CREDIT_SCORE AS LEADER_CREDIT_SCORE,
            (SELECT COUNT(*) FROM ROOMMEMBERS WHERE ROOM_ID = R.ROOM_ID) AS CURRENT_MEMBERS,
            GROUP_CONCAT(T.TAG_NAME ORDER BY RT.ID ASC) AS TAGS
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

// #region --- API ดึงรายชื่อสมาชิกในห้องกิจกรรม (room/:id/members) --- 
router.get('/room/:id/members', (req, res) => {
    const roomId = req.params.id;

    // Join ตาราง ROOMMEMBERS กับ USERS เพื่อเอารูปและชื่อ
    const sql = `
        SELECT 
            U.USER_ID, U.USER_FNAME, U.USER_LNAME, U.USER_IMG, U.USER_CREDIT_SCORE , RM.ROOMMEMBER_STATUS, RM.ROOMMEMBER_CHECKIN_TIME
        FROM ROOMMEMBERS RM
        JOIN USERS U ON RM.USER_ID = U.USER_ID
        WHERE RM.ROOM_ID = ?
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

        const sqlCheck = `
            SELECT 
                ROOM_LEADER_ID, 
                ROOM_EVENT_DATE, 
                ROOM_EVENT_START_TIME,
                ROOM_EVENT_END_TIME,
                CASE 
                    WHEN NOW() < TIMESTAMP(ROOM_EVENT_DATE, ROOM_EVENT_START_TIME) THEN 1 
                    ELSE 0 
                END AS is_not_started,
                TIMESTAMPDIFF(MINUTE, NOW(), TIMESTAMP(ROOM_EVENT_DATE, ROOM_EVENT_END_TIME)) AS minutes_until_end,
                TIMESTAMPDIFF(MINUTE, TIMESTAMP(ROOM_EVENT_DATE, ROOM_EVENT_START_TIME), TIMESTAMP(ROOM_EVENT_DATE, ROOM_EVENT_END_TIME)) AS duration_minutes
            FROM ROOMS 
            WHERE ROOM_ID = ?
            `;
        const roomCheck = await dbQuery(sqlCheck, [roomId]);
        if (roomCheck.length === 0) return res.json({ success: false, message: 'ไม่พบห้องกิจกรรม' });
        if (roomCheck[0].ROOM_LEADER_ID != userId) return res.json({ success: false, message: 'ไม่มีสิทธิ์ดำเนินการ' });

        const room = roomCheck[0];

        if (room.duration_minutes < 15)
            return res.json({ success: false, message: 'กิจกรรมนี้มีระยะเวลาน้อยกว่า 15 นาที ไม่สามารถเปิดระบบเช็คชื่อได้' });
        if (room.is_not_started === 1)
            return res.json({ success: false, message: 'ยังไม่ถึงเวลาเริ่มกิจกรรม (กรุณารอให้ถึงเวลาก่อน)' });
        if (room.minutes_until_end <= 10)
            return res.json({ success: false, message: 'ไม่สามารถเปิดระบบเช็คชื่อได้ เนื่องจากเหลือเวลาทำกิจกรรมน้อยกว่า 10 นาที หรือกิจกรรมจบไปแล้ว' });

        // 2. สุ่มรหัส 6 หลัก (ตัวอักษรใหญ่ + ตัวเลข)
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