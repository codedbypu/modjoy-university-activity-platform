const express = require('express');
const router = express.Router();
const db = require('../config/db');
const jwt = require('jsonwebtoken');

router.post('/create-room', (req, res) => {
    alert(req);
    const userId = req.cookies.userId; // ดึง userId จากคุกกี้
    const { roomTitle, roomEventStartTime, roomEventEndTime, roomEventDate, roomLocation, roomDescription, roomCapacity, roomIGM } = req.body;
    const sql = `INSERT INTO ROOMS(ROOM_TITLE, ROOM_EVENT_START_TIME, ROOM_EVENT_END_TIME, ROOM_EVENT_DATE, ROOM_EVENT_LOCATION, ROOM_DESCRIPTION, ROOM_LEADER_ID, ROOM_CAPACITY, ROOM_IMG)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?);`;
    db.query(sql, [roomTitle, roomEventStartTime, roomEventEndTime, roomEventDate, roomLocation, roomDescription, userId, roomCapacity, roomIGM], (err, result) => {
        if (err) {
            console.error(err);
            return res.json({ success: false, message: 'เกิดข้อผิดพลาดที่ระบบฐานข้อมูล' });
        }
        res.json({ success: true, message: 'สร้างห้องกิจกรรมเรียบร้อย!' });
    });
});

router.get('/rooms', (req, res) => {
    // ... ก๊อปปี้โค้ด get rooms เดิมมาใส่ ...
    // เปลี่ยน app.get เป็น router.get
});

module.exports = router;