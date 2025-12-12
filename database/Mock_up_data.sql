-- ==========================================
-- REALISTIC KMUTT STUDENT DATA (MODJOY)
-- ==========================================

-- 1. สร้าง Users (คาแรคเตอร์เด็กมจธ. หลากหลายสไตล์)
INSERT INTO USERS (USER_EMAIL, USER_FNAME, USER_LNAME, USER_PASSWORD, USER_FACULTY, USER_YEAR, USER_DESCRIPTION, USER_ROLE, USER_IMG) VALUES 
-- ID 1: เด็ก SIT สายเดฟ เดือดร้อนเรื่องโปรเจกต์
('teerawat.dev@kmutt.ac.th', 'Teerawat', 'Code', '123456', 7, 3, 'Fullstack ที่นอนน้อยมาก ช่วงนี้ทำ Senior Project ใครสาย React ทักมาแลกเปลี่ยนความรู้ได้ครับ', 'student', '/Resource/img/profile_dev.png'),

-- ID 2: เด็กวิศวะฯ สายลุย ไป-กลับ บางขุนเทียน (BKT) บ่อย
('ploy.eng@kmutt.ac.th', 'Ploy', 'Mech', '123456', 4, 2, 'วิศวะเครื่องกล ชอบตีแบดหลังเลิกเรียน หาเพื่อนหารค่า Grab ไปเรียนที่ BKT ค่ะ', 'student', '/Resource/img/profile_eng.png'),

-- ID 3: เด็กสถาปัตย์ (SoA+D) สายอาร์ตและบอร์ดเกม
('ken.arch@kmutt.ac.th', 'Ken', 'Design', '123456', 6, 4, 'สิงอยู่ที่ตึกขุนอาส (N18) ตลอดคืน ว่างๆ ชอบเล่น Catan/Splendor แก้เครียดจากการตัดโม', 'student', '/Resource/img/profile_arch.png'),

-- ID 4: เด็กวิทย์ฯ เทพเจ้า Math
('bank.sci@kmutt.ac.th', 'Bank', 'MathGod', '123456', 3, 1, 'รับสอนแคลฯ 1-2 แลกข้าวมันไก่โรงอาหารตึกวิทย์ครับ ชอบฟิสิกส์ด้วย', 'student', '/Resource/img/profile_sci.png'),

-- ID 5: เด็ก FIBO ชอบดนตรีและ IoT
('mind.fibo@kmutt.ac.th', 'Mind', 'Robot', '123456', 5, 2, 'อยู่ตึก FIBO เหงามาก อยากหาคน Jam ดนตรี หรือเล่นบอร์ดเกมยามว่าง', 'student', '/Resource/img/profile_fibo.png'),

-- ID 6: (User ทั่วไป) เด็กครุฯ หาเพื่อน
('noon.edu@kmutt.ac.th', 'Noon', 'Teach', '123456', 1, 3, 'ครุศาสตร์โยธาฯ ค่ะ หาเพื่อนวิ่งสวนธนฯ หรือตีแบดตอนเย็นๆ', 'student', '/Resource/img/profile_edu.png'),

-- ID 7: (User ทั่วไป) เด็กสหวิทยาการ หาตี้เกม
('jay.multi@kmutt.ac.th', 'Jay', 'Gamer', '123456', 2, 1, 'ปี 1 ยังไม่ค่อยรู้จักใคร หาตี้ ROV/Valorant แบกหน่อยครับ', 'student', '/Resource/img/profile_gamer.png'),

-- ID 8: Admin
('admin@modjoy.com', 'System', 'Admin', 'admin123', 7, 4, 'ดูแลความเรียบร้อยของระบบครับ', 'admin', '/Resource/img/profile_admin.png');

-- 2. User Tags (ความสนใจที่สอดคล้องกับคาแรคเตอร์)
INSERT INTO USERTAGS (USER_ID, TAG_ID) VALUES
(1, 3), (1, 4),         -- Teerawat (SIT): Coding, Board Game
(2, 2), (2, 5),         -- Ploy (Eng): Physics, Badminton
(3, 6), (3, 4), (3, 3), -- Ken (Arch): Music, Board Game, Coding (เผื่อทำ Generative Art)
(4, 1), (4, 2), (4, 3), -- Bank (Sci): Calculus, Physics, Coding
(5, 6), (5, 3), (5, 5), -- Mind (FIBO): Music, Coding, Badminton
(6, 5),                 -- Noon (Edu): Badminton
(7, 4), (7, 3);         -- Jay (Multi): Board Game (Gaming), Coding

-- 3. Rooms (10 ห้อง: สถานการณ์จริงในมจธ.)
-- Leader ID 1-5 เป็นเจ้าของห้อง
INSERT INTO ROOMS (ROOM_TITLE, ROOM_EVENT_START_TIME, ROOM_EVENT_END_TIME, ROOM_EVENT_DATE, ROOM_EVENT_LOCATION, ROOM_DESCRIPTION, ROOM_LEADER_ID, ROOM_CAPACITY, ROOM_IMG) VALUES

-- Room 1 [Tag: Coding] (SIT)
('SOS! ช่วยแก้บั๊ก React หน่อย เลี้ยงน้ำ!', '18:00:00', '21:00:00', '2025-12-15', 7, 'ติดบั๊ก state ไม่อัปเดตมา 3 ชม. แล้วครับ ใครเทพ React ช่วยดูให้หน่อย นั่งอยู่ที่ CB2 (N7) ชั้นล่าง', 1, 3, '/Resource/img/room_debug.png'),

-- Room 2 [Tag: Badminton] (Eng)
('หาตี้ตีแบดหลังมอ ขาด 1 คน (มือใหม่)', '17:30:00', '19:30:00', '2025-12-16', 25, 'จองคอร์ดไว้แล้วที่ S5 (โรงยิมเก่า) หารตกคนละ 40 บาท ตีขำๆ ไม่เน้นแข่งครับ', 2, 4, '/Resource/img/room_badminton.png'),

-- Room 3 [Tag: Board Game] (Arch)
('Board Game Night @LX ชั้น 3', '16:00:00', '20:00:00', '2025-12-18', 12, 'ขนบอร์ดเกมมาเพียบ Catan, Ticket to Ride นั่งเล่นโซน Co-working space ตึก LX ใครว่างมาจอยกัน', 3, 8, '/Resource/img/room_boardgame_lx.png'),

-- Room 4 [Tag: Calculus] (Sci)
('ติว Cal 1 ไฟลนก้น (ก่อนสอบ 2 วัน)', '09:00:00', '16:00:00', '2025-12-20', 1, 'รวมพลคนกลัว F มาติวสรุปสูตรและตะลุยโจทย์เก่ากันที่ใต้ตึก CB1 (N1) รับจำนวนจำกัด พื้นที่น้อย', 4, 10, '/Resource/img/room_cal_tutor.png'),

-- Room 5 [Tag: Music] (FIBO)
('หาคนเล่นกีต้าร์ วงเปิดหมวกงานวัด', '17:00:00', '20:00:00', '2025-12-22', 30, 'ขาดมือกีต้าร์ 1 คน ไปเล่นงาน Event ของคณะ นัดซ้อมที่ห้องซ้อมดนตรี S10', 5, 2, '/Resource/img/room_band_pratice.png'),

-- Room 6 [Tag: Coding] (SIT)
('Team Up! Hackathon KMUTT 2026', '13:00:00', '15:00:00', '2026-01-05', 12, 'หาเพื่อนร่วมทีมลงแข่ง Hackathon ขอคนเขียน Backend (Node.js/Go) ได้ นัดคุยไอเดียที่ LX', 1, 5, '/Resource/img/room_hackathon.png'),

-- Room 7 [Tag: Physics, Calculus] (Eng)
('Physics Clinic: ทบทวนกลศาสตร์', '10:00:00', '12:00:00', '2026-01-10', 2, 'ใครไม่แม่นเรื่องการเคลื่อนที่ กฎนิวตัน มาทวนกันครับ พี่ปี 2 ติวให้ (ตึก CB4)', 2, 6, '/Resource/img/room_physics.png'),

-- Room 8 [Tag: Board Game, Music] (Arch)
('Chill Out: นั่งเล่นการ์ด & ฟังเพลง', '19:00:00', '22:00:00', '2026-01-15', 18, 'นั่งชิวหน้าตึกสถาปัตย์ (N18) มี Magic The Gathering เล่น ใครเล่นดนตรีพกเครื่องดนตรีมาแจมได้', 3, 10, '/Resource/img/room_chill_arch.png'),

-- Room 9 [Tag: Coding, Calculus] (Sci)
('เขียน Python คำนวณ Math (Machine Learning)', '14:00:00', '17:00:00', '2026-01-20', 3, 'Workshop เล็กๆ สอนใช้ NumPy/Pandas แก้โจทย์ Math ใครสนใจ Data Science มาลองดู (ตึกวิทย์ N3)', 4, 15, '/Resource/img/room_datasci.png'),

-- Room 10 [Tag: Music, Coding] (FIBO)
('Creative Coding: ทำ Visual ประกอบเพลง', '15:00:00', '18:00:00', '2026-01-25', 5, 'ทดลองเขียนโค้ด (Processing/p5.js) ให้ Interactive กับเสียงดนตรี ที่ FIBO (N5)', 5, 8, '/Resource/img/room_creative_code.png');

-- 4. Room Tags (กระจาย Tag ตามความเหมาะสมของกิจกรรม)
INSERT INTO ROOMTAGS (ROOM_ID, TAG_ID) VALUES
-- Room 1: SOS React (Coding)
(1, 3),
-- Room 2: Badminton (Badminton)
(2, 5),
-- Room 3: Board Game LX (Board Game)
(3, 4),
-- Room 4: Cal Tutor (Calculus, Physics - เพราะมักมาคู่กัน)
(4, 1), (4, 2),
-- Room 5: Music Band (Music)
(5, 6),
-- Room 6: Hackathon (Coding)
(6, 3),
-- Room 7: Physics Clinic (Physics, Calculus)
(7, 2), (7, 1),
-- Room 8: Chill Arch (Board Game, Music)
(8, 4), (8, 6),
-- Room 9: Python Math (Coding, Calculus)
(9, 3), (9, 1),
-- Room 10: Creative Coding (Coding, Music)
(10, 3), (10, 6);