const express = require('express');
const router = express.Router();
const db = require('../config/db');
const jwt = require('jsonwebtoken');

// กำหนดรหัสลับสำหรับสร้าง Token (สำคัญมาก)
const JWT_SECRET = process.env.JWT_SECRET

// --- 1. Register แบบเข้ารหัส ---
router.post('/register', async (req, res) => {
    const { email, username, lastname, password } = req.body;

    const sql = 'INSERT INTO users (email, username, lastname, password) VALUES (?, ?, ?, ?)';
    db.query(sql, [email, username, lastname, password], (err, result) => {
        if (err) {
            console.error(err); // ดู Error เต็มๆ ใน Terminal
            // เช็ครหัส Error ของ MySQL ว่าใช่รหัส "ข้อมูลซ้ำ" หรือไม่
            if (err.code === 'ER_DUP_ENTRY') {
                return res.json({ success: false, message: 'อีเมลนี้ถูกใช้งานไปแล้ว กรุณาใช้อีเมลอื่น' });
            }
            // กรณี Error อื่นๆ ทั่วไป
            return res.json({ success: false, message: 'เกิดข้อผิดพลาดที่ระบบฐานข้อมูล' });
        }
        res.json({ success: true, message: 'สมัครสมาชิกเรียบร้อย!' });
    });
});

// --- 2. Login แบบตรวจสอบรหัสผ่านที่เข้ารหัส ---
router.post('/login', (req, res) => {
    const { email, password } = req.body;

    // 1. ค้นหา User จาก Email ก่อน (ยังไม่เช็ค Password)
    const sql = 'SELECT * FROM users WHERE email = ?';

    db.query(sql, [email], async (err, results) => {
        if (err) return res.status(500).json({ error: err });

        if (results.length === 0) {
            return res.json({ success: false, message: 'ไม่พบบัญชีนี้ในระบบ' });
        }
        const user = results[0];

        // 2. เอารหัสที่กรอกมา เทียบกับรหัสลับใน Database
        if (password !== user.password) {
            return res.json({ success: false, message: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' });
        }

        // --- ถ้า Login ผ่าน ---

        // 3. สร้าง Token (JWT)
        const token = jwt.sign(
            { id: user.id, username: user.username, lastname: user.lastname, email: user.email, role: user.role },
            JWT_SECRET, // <--- ต้องใส่ Secret Key ตรงนี้ (ที่คุณลืมในโค้ดเก่า)
            { expiresIn: '1d' } // หมดอายุใน 1 วัน
        );

        // 4. ฝัง Token ลงใน Cookie ของ Browser
        res.cookie('token', token, {
            httpOnly: true, // JavaScript ฝั่งหน้าบ้านแอบอ่านไม่ได้ (กัน Hacker)
            secure: false,  // (ใส่ true ถ้าขึ้น Server จริงที่เป็น HTTPS)
            maxAge: 24 * 60 * 60 * 1000 // อายุ Cookie 1 วัน
        });

        // 5. ส่งข้อมูล User กลับไป (ไม่ส่ง password กลับไปนะ!)
        res.json({
            success: true,
            message: 'เข้าสู่ระบบสำเร็จ!',
            user: {
                id: user.id,
                username: user.username,
                lastname: user.lastname,
                email: user.email,
                role: user.role
            }
        });

    });
});

// --- 3. API เช็คว่า User ล็อกอินอยู่ไหม (Me) ---
// หน้าเว็บจะยิงมาถามอันนี้เพื่อดูว่าเข้าสู่ระบบรึยัง
router.get('/me', (req, res) => {
    const token = req.cookies.token; // อ่านจาก Cookie

    if (!token) return res.json({ loggedIn: false });

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        res.json({ loggedIn: true, user: decoded });
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