const express = require('express');
const router = express.Router();
const db = require('../config/db');
const jwt = require('jsonwebtoken');

const multer = require('multer');
const path = require('path');
const fs = require('fs');

// กำหนดรหัสลับสำหรับสร้าง Token (สำคัญมาก)
const JWT_SECRET = process.env.JWT_SECRET

// --- Register  ---
router.post('/register', async (req, res) => {
    const { email, fullname, lastname, password } = req.body;

    const sql = `INSERT INTO USERS (USER_EMAIL, USER_FNAME, USER_LNAME, USER_PASSWORD, USER_YEAR) VALUES (?, ?, ?, ?, 1)`;
    db.query(sql, [email, fullname, lastname, password], (err, result) => {
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

// --- Login ---
router.post('/login', (req, res) => {
    const { email, password } = req.body;

    // ค้นหา User จาก Email ก่อน
    const sql = 'SELECT * FROM USERS WHERE USER_EMAIL = ?';
    db.query(sql, [email], async (err, results) => {
        if (err) return res.status(500).json({ error: err });

        if (results.length === 0) return res.json({ success: false, message: 'ไม่พบบัญชีนี้ในระบบ' });
        const user = results[0];

        // ตรวจสอบรหัสผ่าน (USER_PASSWORD)
        if (password !== user.USER_PASSWORD) {
            return res.json({ success: false, message: 'รหัสผ่านไม่ถูกต้อง' });
        }

        // --- ถ้า Login ผ่าน ---
        // สร้าง Token
        const token = jwt.sign(
            {
                id: user.USER_ID,
                email: user.USER_EMAIL,
                role: user.USER_ROLE
            },
            JWT_SECRET,
            { expiresIn: '1d' }
        );

        // ฝัง Token ลงใน Cookie ของ Browser
        res.cookie('token', token, {
            httpOnly: true, // JavaScript ฝั่งหน้าบ้านแอบอ่านไม่ได้ (กัน Hacker)
            secure: false,
            maxAge: 24 * 60 * 60 * 1000
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

// --- API เช็คว่า User ล็อกอินอยู่ไหม (Me) ---
router.get('/me', (req, res) => {
    const token = req.cookies.token; // อ่านจาก Cookie
    if (!token) return res.json({ loggedIn: false });

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        // Query ข้อมูล User + ชื่อคณะ (JOIN ตาราง FACULTYS)
        const sql = `
            SELECT 
                U.USER_ID, U.USER_EMAIL, U.USER_FNAME, U.USER_LNAME, 
                U.USER_ROLE, U.USER_IMG, U.USER_CREDIT_SCORE, 
                U.USER_YEAR, U.USER_DESCRIPTION, U.USER_FACULTY,
                F.FACULTY_NAME
            FROM USERS U
            LEFT JOIN FACULTYS F ON U.USER_FACULTY = F.FACULTY_ID
            WHERE U.USER_ID = ?
        `;

        db.query(sql, [decoded.id], (err, results) => {
            if (err || results.length === 0) return res.json({ loggedIn: false });

            if (results.length > 0) {
                const user = results[0];
                // ส่งข้อมูลกลับไปให้หน้าบ้าน
                res.json({
                    loggedIn: true,
                    user: {
                        id: user.USER_ID,
                        email: user.USER_EMAIL,
                        fullname: user.USER_FNAME,
                        lastname: user.USER_LNAME,
                        role: user.USER_ROLE,
                        credit: user.USER_CREDIT_SCORE || 0,
                        profile_image: user.USER_IMG,
                        faculty: user.FACULTY_NAME || 'ไม่ได้ระบุ', // ชื่อคณะ
                        faculty_id: user.USER_FACULTY,
                        year: user.USER_YEAR || 1,         // ชั้นปี
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

// --- Logout ---
router.post('/logout', (req, res) => {
    res.clearCookie('token'); // ลบ Cookie ทิ้ง
    res.json({ success: true });
});

// --- ตั้งค่าการเก็บไฟล์รูปภาพ (Multer Config) ---
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadPath = path.join(__dirname, '../public/uploads');
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }
        cb(null, uploadPath);
    },
    filename: function (req, file, cb) {
        // ตั้งชื่อไฟล์ใหม่: user-(id)-(เวลา).นามสกุลเดิม (ป้องกันชื่อซ้ำ)
        // เนื่องจากเรายังไม่รู้ ID ตอนนี้ ให้ใช้ timestamp ไปก่อน หรือแก้ทีหลัง
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'profile-' + uniqueSuffix + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

// --- 5. API อัปเดตข้อมูลผู้ใช้ (Update Profile) ---
// upload.single('profile_image') คือรับไฟล์จาก input name="profile_image"
router.post('/update', upload.single('profile_image'), (req, res) => {
    const token = req.cookies.token;
    if (!token) return res.json({ success: false, message: 'ไม่พบสิทธิ์การใช้งาน' });

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const userId = decoded.id;

        // รับค่า Text จากฟอร์ม
        const { fullname, lastname, faculty, year, about, tags } = req.body;

        // กรณีเลือก "-" ในคณะ ให้ตั้งค่าเป็น null
        let finalFaculty = faculty;
        if (faculty === '') {
            finalFaculty = null;
        }

        // รับค่าไฟล์รูป (ถ้ามีการอัปโหลดใหม่)
        let imagePath = null;
        if (req.file) {
            // ถ้ามีไฟล์ใหม่ ให้เก็บ Path เอาไว้ (ตัด public ออกเพราะเรา serve static ที่ root)
            imagePath = '/uploads/' + req.file.filename;
        }

        // สร้าง SQL Query แบบ Dynamic (อัปเดตเฉพาะค่าที่ส่งมา)
        // เทคนิค: ถ้า imagePath มีค่า ให้รวมเข้าไปในการอัปเดตด้วย
        let sql = `UPDATE USERS SET USER_FNAME=?, USER_LNAME=?, USER_FACULTY=?, USER_YEAR=?, USER_DESCRIPTION=?`;
        let params = [fullname, lastname, finalFaculty, year, about];

        if (imagePath) {
            sql += `, USER_IMG=?`;
            params.push(imagePath);
        }

        // อย่าลืม WHERE เพื่อระบุคน
        sql += ` WHERE USER_ID=?`;
        params.push(userId);

        db.query(sql, params, (err, result) => {
            if (err) {
                console.error(err);
                return res.json({ success: false, message: 'เกิดข้อผิดพลาดในการบันทึก' });
            }

            // (Optional: ตรงนี้คุณอาจจะเพิ่ม Logic บันทึก Tags ลงตาราง USERTAGS ด้วยก็ได้)

            res.json({ success: true, message: 'อัปเดตข้อมูลสำเร็จ!' });
        });

    } catch (err) {
        console.error(err);
        res.json({ success: false, message: 'Session หมดอายุ' });
    }
});

router.get('/faculties', (req, res) => {
    db.query('SELECT * FROM FACULTYS', (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Database error' });
        }
        res.json(results);
    });
});

module.exports = router;