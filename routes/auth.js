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
        const sql = `SELECT USER_ID, USER_EMAIL, USER_FNAME, USER_LNAME, USER_ROLE, USER_IMG, USER_CREDIT_SCORE FROM USERS WHERE USER_ID = ?`;

        db.query(sql, [decoded.id], (err, results) => {
            if (err || results.length === 0) return res.json({ loggedIn: false });

            const user = results[0];
            // ส่งกลับในรูปแบบที่หน้าบ้าน (Global Loader) คุ้นเคย
            res.json({
                loggedIn: true,
                user: {
                    id: user.USER_ID,
                    fullname: user.USER_FNAME,
                    lastname: user.USER_LNAME,
                    email: user.USER_EMAIL,
                    role: user.USER_ROLE,
                    credit: user.USER_CREDIT_SCORE,
                    profile_image: user.USER_IMG
                }
            });
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