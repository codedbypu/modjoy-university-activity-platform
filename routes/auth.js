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

// #region --- API register --- 
router.post('/register', async (req, res) => {
    const { email, fullname, lastname, password } = req.body;
    const sql = `INSERT INTO USERS (USER_EMAIL, USER_FNAME, USER_LNAME, USER_PASSWORD, USER_YEAR) VALUES (?, ?, ?, ?, 1)`;
    db.query(sql, [email, fullname, lastname, password], (err, result) => {
        // ที่เหลือเป็นการเช็คอีเมลซ้ำด้วย ER_DUP_ENTRY ครับ เพราะมันเป็น PK อยู่แล้ว
        if (err) {
            console.error(err);
            if (err.code === 'ER_DUP_ENTRY') {
                return res.json({ success: false, message: 'อีเมลนี้ถูกใช้งานไปแล้ว กรุณาใช้อีเมลอื่น' });
            }
            return res.json({ success: false, message: 'เกิดข้อผิดพลาดที่ระบบฐานข้อมูล' });
        }
        res.json({ success: true, message: 'สมัครสมาชิกเรียบร้อย!' });
    });
});
// #endregion

// #region --- API login ---
router.post('/login', (req, res) => {
    const { email, password, rememberMe } = req.body;
    const sql = 'SELECT * FROM USERS WHERE USER_EMAIL = ?';
    db.query(sql, [email], async (err, results) => {
        // ที่เหลือเป็นการเช็ครหัสกับ EMAIL ครับ
        if (err) return res.status(500).json({ error: err });

        if (results.length === 0) return res.json({ success: false, message: 'ไม่พบบัญชีนี้ในระบบ' });
        const user = results[0];

        // ตรวจสอบรหัสผ่าน (USER_PASSWORD)
        if (password !== user.USER_PASSWORD) {
            return res.json({ success: false, message: 'รหัสผ่านไม่ถูกต้อง' });
        }

        // ถ้า Login ผ่าน
        // ถ้าติ๊ก Remember Me : 30 วัน, ถ้าไม่ติ๊ก: 1 วัน
        const tokenLife = rememberMe ? '30d' : '1d';
        const cookieLife = rememberMe ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
        // สร้าง Token
        const token = jwt.sign(
            {
                id: user.USER_ID,
                email: user.USER_EMAIL,
                role: user.USER_ROLE
            },
            JWT_SECRET,
            { expiresIn: tokenLife }
        );

        // ฝัง Token ลงใน Cookie ของ Browser
        res.cookie('token', token, {
            httpOnly: true, // JavaScript ฝั่งหน้าบ้านแอบอ่านไม่ได้ (กัน Hacker)
            secure: false,
            maxAge: cookieLife
        });

        // ส่งข้อมูลกลับ (Mapping ชื่อให้หน้าบ้านใช้ง่าย)
        res.json({
            success: true,
            message: 'เข้าสู่ระบบสำเร็จ!',
            user: {
                id: user.USER_ID,
                fullname: user.USER_FNAME,
                lastname: user.USER_LNAME,
                email: user.USER_EMAIL,
                role: user.USER_ROLE,
                profile_image: user.USER_IMG
            }
        });

    });
});
// #endregion

// #region --- API เช็คว่า User ล็อกอินอยู่ไหม (Me) --- 
router.get('/me', (req, res) => {
    const token = req.cookies.token;
    if (!token) return res.json({ loggedIn: false });

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const sql = `
            SELECT 
                U.USER_ID, U.USER_EMAIL, U.USER_FNAME, U.USER_LNAME, 
                U.USER_ROLE, U.USER_IMG, U.USER_CREDIT_SCORE, 
                U.USER_YEAR, U.USER_DESCRIPTION, U.USER_FACULTY,
                F.FACULTY_NAME,
                GROUP_CONCAT(T.TAG_NAME ORDER BY UT.id ASC) AS user_tags
            FROM USERS U
            LEFT JOIN FACULTYS F ON U.USER_FACULTY = F.FACULTY_ID
            LEFT JOIN USERTAGS UT ON U.USER_ID = UT.USER_ID
            LEFT JOIN TAGS T ON UT.TAG_ID = T.TAG_ID
            WHERE U.USER_ID = ?
            GROUP BY U.USER_ID
        `;
        db.query(sql, [decoded.id], (err, results) => {
            // ที่เหลือเป็นการทำ json ส่งข้อมูลกลับไปให้หน้าบ้าน
            if (err || results.length === 0) return res.json({ loggedIn: false });

            if (results.length > 0) {
                const user = results[0];

                // แปลง string "Tag1,Tag2" ให้กลับเป็น Array ["Tag1", "Tag2"]
                const tagsArray = user.user_tags ? user.user_tags.split(',') : [];

                // ส่งข้อมูลกลับไปให้หน้าบ้าน
                res.json({
                    loggedIn: true,
                    user: {
                        id: user.USER_ID,
                        email: user.USER_EMAIL,
                        fullname: user.USER_FNAME,
                        lastname: user.USER_LNAME,
                        role: user.USER_ROLE,
                        credit: user.USER_CREDIT_SCORE || 100, // ค่าเริ่มต้น 100
                        profile_image: user.USER_IMG,
                        faculty: user.FACULTY_NAME || 'ไม่ได้ระบุ', // ชื่อคณะ
                        faculty_id: user.USER_FACULTY,
                        year: user.USER_YEAR || 1,         // ชั้นปี
                        tags: tagsArray,                    // รายการ Tag
                        about: user.USER_DESCRIPTION || '' // เกี่ยวกับฉัน
                    }
                });
            } else {
                res.clearCookie('token');
                res.json({ loggedIn: false });
            }
        });
    } catch (err) {
        res.json({ loggedIn: false });
    }
});
// #endregion

// #region --- API Logout --- 
router.post('/logout', (req, res) => {
    res.clearCookie('token');
    res.json({ success: true });
});
// #endregion

// #region --- ตั้งค่าการเก็บไฟล์รูปภาพ (Multer Config) --- 
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadPath = path.join(__dirname, '../public/uploads');
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }
        cb(null, uploadPath);
    },
    filename: function (req, file, cb) {
        // ดึง User ID จาก Token
        const token = req.cookies.token;
        let userId
        try {
            const decoded = jwt.verify(token, JWT_SECRET);
            userId = decoded.id;
        } catch (err) { return cb(new Error('Invalid token')); }
        // ตั้งชื่อไฟล์ใหม่: user-(id)-(เวลา).นามสกุลเดิม (ป้องกันชื่อซ้ำ)
        const uniqueSuffix = userId + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'profile-' + uniqueSuffix + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });
// #endregion

// #region --- API อัปเดตข้อมูลผู้ใช้ (Update Profile) ---
router.post('/update', upload.single('profile_image'), async (req, res) => {
    const token = req.cookies.token;
    if (!token) return res.json({ success: false, message: 'ไม่พบสิทธิ์การใช้งาน' });

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const userId = decoded.id;

        // รับค่า Text จากฟอร์ม
        const { fullname, lastname, faculty, year, about, tags } = req.body;

        // จัดการกรณีที่ faculty เป็นค่าว่าง (ให้เก็บเป็น NULL ในฐานข้อมูล)
        let finalFaculty = faculty;
        if (faculty === '') {
            finalFaculty = null;
        }

        // รับค่าไฟล์รูป (ถ้ามีการอัปโหลดใหม่)
        // ถ้ามีไฟล์ใหม่ ให้เก็บ Path เอาไว้ (ตัด public ออกเพราะเรา serve static ที่ root)
        let imagePath = null;
        if (req.file) imagePath = '/uploads/' + req.file.filename;

        // สร้าง SQL Query แบบ Dynamic (อัปเดตเฉพาะค่าที่ส่งมา)
        // เทคนิค: ถ้า imagePath มีค่า ให้รวมเข้าไปในการอัปเดตด้วย
        let sql = `UPDATE USERS SET USER_FNAME=?, USER_LNAME=?, USER_FACULTY=?, USER_YEAR=?, USER_DESCRIPTION=?`;
        let params = [fullname, lastname, finalFaculty, year, about];

        if (imagePath) {
            sql += `, USER_IMG=?`;
            params.push(imagePath);
        }

        sql += ` WHERE USER_ID=?`;
        params.push(userId);

        // รอให้ Update ข้อมูล User เสร็จก่อน
        await dbQuery(sql, params);

        // 2. จัดการ Tags (Logic: ลบของเก่า -> วนลูปใส่ของใหม่)
        // เช็คว่า "มีการส่งค่า tags มาไหม" (ไม่ว่าจะเป็นข้อความหรือค่าว่าง)
        if (typeof tags !== 'undefined') {
            // แปลง string "Tag1,Tag2" เป็น array
            const tagList = tags.split(',').map(t => t.trim()).filter(t => t !== '');
            // 2.1 ลบ Tag เดิมของ User คนนี้ออกให้หมดก่อน (Reset)
            await dbQuery('DELETE FROM USERTAGS WHERE USER_ID = ?', [userId]);
            // 2.2 วนลูปเช็คและเพิ่ม Tag ใหม่
            for (const tagName of tagList) {
                let tagId;

                // เช็คว่ามี Tag นี้ในระบบหรือยัง?
                const existingTags = await dbQuery('SELECT TAG_ID FROM TAGS WHERE TAG_NAME = ?', [tagName]);

                if (existingTags.length > 0) {
                    // มีแล้ว -> เอา ID มาใช้
                    tagId = existingTags[0].TAG_ID;
                } else {
                    // ยังไม่มี -> Insert ใหม่ลงตาราง TAGS
                    const newTag = await dbQuery('INSERT INTO TAGS (TAG_NAME) VALUES (?)', [tagName]);
                    tagId = newTag.insertId;
                }

                // จับคู่ User กับ Tag ลงตาราง USERTAGS
                await dbQuery('INSERT INTO USERTAGS (USER_ID, TAG_ID) VALUES (?, ?)', [userId, tagId]);
            }
        }
        res.json({ success: true, message: 'อัปเดตข้อมูลและแท็กสำเร็จ!' });
    } catch (err) {
        console.error(err);
        res.json({ success: false, message: 'Session หมดอายุ' });
    }
});
// #endregion

// #region --- API ดึงรายชื่อคณะทั้งหมด ---
router.get('/faculties', (req, res) => {
    db.query('SELECT * FROM FACULTYS', (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Database error' });
        }
        res.json(results);
    });
});
// #endregion

// #region --- API ดึงรายชื่อ Tag ทั้งหมด ---
router.get('/tags', (req, res) => {
    db.query('SELECT TAG_NAME FROM TAGS', (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Database error' });
        }
        // ส่งกลับเป็น Array ของชื่อ Tag เช่น ["Calculus", "Coding", ...]
        const tagList = results.map(row => row.TAG_NAME);
        res.json(tagList);
    });
});
// #endregion

module.exports = router;

