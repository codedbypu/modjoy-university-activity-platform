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
                (ROOM_TITLE, ROOM_EVENT_START_TIME, ROOM_EVENT_END_TIME, ROOM_EVENT_DATE, ROOM_EVENT_LOCATION, ROOM_DESCRIPTION, ROOM_LEADER_ID, ROOM_CAPACITY, ROOM_IMG, ROOM_STATUS)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending');`;
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

// #region --- API ดึงข้อมูลห้องกิจกรรมทั้งหมด (get-rooms) --- 
// router.get('/rooms', async (req, res) => {
//     try {
//         const sql = `
//             SELECT 
//                 r.ROOM_ID,
//                 r.ROOM_TITLE,
//                 r.ROOM_EVENT_DATE,
//                 TIME_FORMAT(r.ROOM_EVENT_START_TIME, '%H:%i') AS formatted_start_time,
//                 TIME_FORMAT(r.ROOM_EVENT_END_TIME, '%H:%i') AS formatted_end_time,
//                 r.ROOM_CAPACITY,
//                 r.ROOM_IMG,
//                 l.LOCATION_NAME,
//                 COUNT(rm.USER_ID) AS member_count,
//                 GROUP_CONCAT(t.TAG_NAME) AS tags
//             FROM ROOMS r
//             LEFT JOIN LOCATIONS l ON r.ROOM_EVENT_LOCATION = l.LOCATION_ID
//             LEFT JOIN ROOMMEMBERS rm ON r.ROOM_ID = rm.ROOM_ID
//             LEFT JOIN ROOMTAGS rt ON r.ROOM_ID = rt.ROOM_ID
//             LEFT JOIN TAGS t ON rt.TAG_ID = t.TAG_ID
//             GROUP BY r.ROOM_ID
//             ORDER BY r.ROOM_EVENT_DATE, r.ROOM_EVENT_START_TIME ASC
//         `;
//         const rooms = await dbQuery(sql);
//         res.json({ success: true, rooms });
//     } catch (err) {
//         console.error(err);
//         res.status(500).json({ success: false, message: 'Database error' });
//     }
// });
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

// #region --- API ดึงรายชื่อสมาชิกในห้องกิจกรรม (room/:id/members) ---
router.get('/room/:id/members', (req, res) => {
    const roomId = req.params.id;

    // Join ตาราง ROOMMEMBERS กับ USERS เพื่อเอารูปและชื่อ
    const sql = `
        SELECT 
            U.USER_ID, U.USER_FNAME, U.USER_LNAME, U.USER_IMG, U.USER_CREDIT_SCORE
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

// #region --- API แก้ไขข้อมูลห้องกิจกรรม (update-room/:id) ---
router.post('/update-room/:id', upload.single('room_image'), async (req, res) => {
    const token = req.cookies.token;
    if (!token) return res.json({ success: false, message: 'กรุณาเข้าสู่ระบบ' });

    const roomId = req.params.id;
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const userId = decoded.id;

        // 1. เช็คก่อนว่า User คนนี้เป็นเจ้าของห้องนี้จริงไหม?
        const checkOwner = await dbQuery('SELECT ROOM_LEADER_ID FROM ROOMS WHERE ROOM_ID = ?', [roomId]);
        if (checkOwner.length === 0)
            return res.json({ success: false, message: 'ไม่พบห้องกิจกรรม' });
        if (checkOwner[0].ROOM_LEADER_ID != userId)
            return res.json({ success: false, message: 'คุณไม่มีสิทธิ์แก้ไขห้องนี้' });

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

// #region --- API ดึงข้อมูลห้องกิจกรรมทั้งหมด (get-rooms) พร้อม Filter/Search ---
router.get('/rooms', async (req, res) => {
    try {
        const { search, date, start_time, end_time, locations, tags } = req.query;

        let whereClauses = [];
        let queryParams = [];
        // กำหนดให้ JOINs เป็นมาตรฐาน เพื่อให้ GROUP_CONCAT ทำงานได้เสมอ
        let tagsJoin = ""; 
        let locationJoin = "LEFT JOIN LOCATIONS l ON r.ROOM_EVENT_LOCATION = l.LOCATION_ID";

        // 1. เงื่อนไขการค้นหา (search input)
        if (search) {
            whereClauses.push("r.ROOM_TITLE LIKE ?");
            queryParams.push(`%${search}%`);
        }
        
        // 2. เงื่อนไขตัวกรองวันที่/เวลา (ถูกต้องแล้ว)
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

        // 3. เงื่อนไขตัวกรองสถานที่ (Location Tags)
        if (locations) {
            const locationNames = locations.split(',').map(name => name.trim()).filter(name => name !== '');
            if (locationNames.length > 0) {
                // ใช้ IN (?) เพื่อให้ node-mysql จัดการ Array
                whereClauses.push(`l.LOCATION_NAME IN (?)`);
                queryParams.push(locationNames); 
            }
        }

        // 4. เงื่อนไขตัวกรอง Tag (Tags)
        if (tags) {
            const tagList = tags.split(',').map(t => t.trim()).filter(t => t !== '');
            if (tagList.length > 0) {
                // **ถ้ามีการกรอง Tag ต้องใช้ INNER JOIN เพื่อกรองเฉพาะห้องที่มี Tag นั้นๆ**
                // และต้องใช้ Subquery/HAVING หรือวิธีอื่น หากต้องการกรองด้วย Tag หลายตัว (แต่ใช้ IN ก็อาจพอ)
                // เพื่อความรัดกุม เราจะใช้ Subquery/INNER JOIN แต่ในโค้ดเดิมใช้ LEFT JOIN + WHERE
                // เพื่อให้สอดคล้องกับโค้ดเดิม แต่ปรับให้เป็น INNER JOIN ชั่วคราวเมื่อกรองด้วย TAG
                
                // ใช้ LEFT JOIN ใน SQL หลัก เพื่อให้ GROUP_CONCAT ทำงาน
                // และเพิ่มเงื่อนไข t.TAG_NAME IN (?) ใน WHERE
                whereClauses.push(`t.TAG_NAME IN (?)`);
                queryParams.push(tagList);
                // **หมายเหตุ:** หากต้องการกรองหลาย Tag พร้อมกัน (AND Logic) ต้องใช้ Subquery หรือ HAVING COUNT(DISTINCT t.TAG_NAME)
                // สำหรับตอนนี้ ใช้ IN (?) จะหมายถึง (OR Logic) คือ ห้องที่มี Tag ใด Tag หนึ่งในรายการ
            }
        }
        
        // สร้าง WHERE clause
        const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
        
        // **ปรับปรุง SQL Query หลัก:** ทำให้ JOINs ชัดเจนและใช้ DISTINCT ใน GROUP_CONCAT
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
                GROUP_CONCAT(DISTINCT t.TAG_NAME) AS tags
            FROM ROOMS r
            ${locationJoin}
            LEFT JOIN ROOMMEMBERS rm ON r.ROOM_ID = rm.ROOM_ID
            LEFT JOIN ROOMTAGS rt ON r.ROOM_ID = rt.ROOM_ID
            LEFT JOIN TAGS t ON rt.TAG_ID = t.TAG_ID
            ${whereSql}
            GROUP BY r.ROOM_ID
            ORDER BY r.ROOM_EVENT_DATE, r.ROOM_EVENT_START_TIME ASC
        `;
        
        // เรียกใช้ Query
        const rooms = await dbQuery(sql, queryParams);
        res.json({ success: true, rooms });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Database error' });
    }
});
// #endregion

module.exports = router;