const express = require('express');
const router = express.Router();
const db = require('../config/db');
const jwt = require('jsonwebtoken');

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
                U.USER_YEAR, U.USER_DESCRIPTION,
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
                        username: user.USER_FNAME,
                        lastname: user.USER_LNAME,
                        role: user.USER_ROLE,
                        credit: user.USER_CREDIT_SCORE || 0,
                        profile_image: user.USER_IMG,
                        faculty: user.FACULTY_NAME || 'ไม่ได้ระบุ', // ชื่อคณะ
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

// --- 4. Logout ---
router.post('/logout', (req, res) => {
    res.clearCookie('token'); // ลบ Cookie ทิ้ง
    res.json({ success: true });
});

module.exports = router;