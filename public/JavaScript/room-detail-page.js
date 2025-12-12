document.addEventListener('DOMContentLoaded', async () => {
    const params = new URLSearchParams(window.location.search);
    const roomId = params.get('id');

    if (!roomId) {
        window.location.href = '/home-page.html';
        return;
    }

    // 1. ดึงข้อมูล User ปัจจุบันก่อน
    let currentUserId = null;
    let currentUserRole = null;
    try {
        const userRes = await fetch('/api/me');
        const userData = await userRes.json();
        if (userData.loggedIn) {
            currentUserId = userData.user.id;
            currentUserRole = userData.user.role;
        }
    } catch (err) { console.error('Auth Check Error', err); }
    // 2. ดึงข้อมูลห้อง
    await fetchAndRenderRoom(roomId, currentUserId, currentUserRole);

    // ตั้งเวลารีเฟรชข้อมูลทุก 30 วินาที
    setInterval(() => {
        // เรียกฟังก์ชันเดิมซ้ำ ข้อมูลในหน้าเว็บจะอัปเดตเอง
        fetchAndRenderRoom(roomId, currentUserId, currentUserRole);
    }, 30000); // 30000 ms = 30 วินาที
});

// #region --- ฟังก์ชันดึงข้อมูลห้องและแสดงผล ---
async function fetchAndRenderRoom(roomId, currentUserId, currentUserRole) {
    try {
        // ดึงข้อมูลห้อง
        const roomRes = await fetch(`/api/room/${roomId}`);
        const roomData = await roomRes.json();

        // ดึงสมาชิกในห้อง (เพื่อเช็คว่าเรา join หรือยัง)
        const membersRes = await fetch(`/api/room/${roomId}/members`);
        const membersData = await membersRes.json();

        if (roomData.success && membersData.success) {
            const room = roomData.room;
            const members = membersData.members;
            renderRoomDetail(room);
            renderMembersList(members);

            // --- 🎯 Logic ปุ่มควบคุม (Action Buttons) ---
            const editBtn = document.getElementById('edit-room-btn');
            const headerBlank = document.querySelector('.header-blank');
            const manageCheckInBtn = document.getElementById('manage-check-in-btn');
            const joinBox = document.getElementById('join-box');
            const unownerControls = document.getElementById('unowner-room-btns');
            const joinBtn = document.getElementById('join-room-btn');
            const leaveBtn = document.getElementById('leave-room-btn');

            const RoomMessage = document.getElementById('room-message');
            const RoomTextMessage = document.getElementById('room-text-message');

            const checkInForm = document.getElementById('check-in-form');
            const checkedInMessage = document.getElementById('checked-in-message');

            // ซ่อนทุกปุ่มก่อน
            if (editBtn) editBtn.style.display = 'none'; // ปุ่มแก้ไข ด้านบน

            // ปุ่มด้านล่าง
            if (joinBox) joinBox.style.display = 'flex';
            if (unownerControls) unownerControls.style.display = 'none';
            if (joinBtn) joinBtn.style.display = 'none';
            if (leaveBtn) leaveBtn.style.display = 'none';
            if (RoomMessage) RoomMessage.style.display = 'none';
            if (manageCheckInBtn) manageCheckInBtn.style.display = 'none';
            if (checkInForm) checkInForm.style.display = 'none';
            if (checkedInMessage) checkedInMessage.style.display = 'none';

            // เช็คสถานะ
            const isOwner = (currentUserId && room.ROOM_LEADER_ID == currentUserId);
            const isAdmin = (currentUserRole === 'admin');
            const isMember = members.some(m => m.USER_ID == currentUserId); // เช็คว่า ID เราอยู่ในลิสต์สมาชิกไหม
            const isFull = (room.CURRENT_MEMBERS >= room.ROOM_CAPACITY);
            const hasCheckedIn = members.some(m => m.USER_ID == currentUserId && m.ROOMMEMBER_STATUS === 'present');

            // เช็คเวลา (Time Logic) 🕒
            const status = room.ROOM_STATUS;
            const isEventStarted = (status === 'inProgress' || status === 'completed');
            const isEventEnded = (status === 'completed');

            let isCheckinExpired = (room.is_expired === 1) || false;

            if (isOwner || isAdmin) {
                // เจ้าของห้องหรือแอดมิน
                // ด้านบน: โชว์ปุ่มแก้ไข
                if (headerBlank) headerBlank.style.display = 'none'; // ซ่อนช่องว่าง
                if (editBtn) editBtn.style.display = 'block'; // โชว์ปุ่ม
                if (editBtn) editBtn.href = `/edit-room-page.html?id=${room.ROOM_ID}`;

                // ด้านล่าง: โชว์ปุ่มจัดการเช็คชื่อ
                if (joinBtn) joinBtn.style.display = 'none'; // ซ่อนปุ่มเข้าร่วม

                if (manageCheckInBtn) {
                    manageCheckInBtn.style.display = 'flex'; // โชว์ปุ่มจัดการเช็คชื่อ
                    const safeDate = (dateStr) => new Date(dateStr.replace(' ', 'T'));

                    const eventDateStr = room.ROOM_EVENT_DATE.split('T')[0]; // YYYY-MM-DD
                    const startTime = safeDate(`${eventDateStr}T${room.ROOM_EVENT_START_TIME}`);
                    const endTime = safeDate(`${eventDateStr}T${room.ROOM_EVENT_END_TIME}`);

                    const now = safeDate(room.SERVER_TIME);

                    // คำนวณระยะห่าง (นาที)
                    // (ใช้ getTime() เพื่อให้มั่นใจว่าเป็นตัวเลข timestamp เอามาลบกันได้)
                    const durationMinutes = (endTime.getTime() - startTime.getTime()) / 60000;
                    const minutesUntilEnd = (endTime.getTime() - now.getTime()) / 60000;
                    const isStarted = now.getTime() >= startTime.getTime();

                    // Reset State
                    manageCheckInBtn.disabled = false;
                    manageCheckInBtn.textContent = 'การเช็คชื่อ';
                    manageCheckInBtn.style.backgroundColor = ''; 
                    manageCheckInBtn.style.cursor = 'pointer';
                    manageCheckInBtn.onclick = () => {
                        if (room.ROOM_CHECKIN_CODE) {
                            window.location.href = `/check-in-room-page.html?id=${room.ROOM_ID}`;
                        } else if (confirm('คุณต้องการสร้างรหัสเช็คชื่อ เพื่อเปิดการเช็คชื่อใช่หรือไม่?')) {
                            window.location.href = `/check-in-room-page.html?id=${room.ROOM_ID}`;
                        }
                    }

                    if (durationMinutes < 15) {
                        disableButton(manageCheckInBtn, 'กิจกรรมสั้นเกินไป');
                    } 
                    else if (!isStarted) { // ยังไม่ถึงเวลาเริ่ม
                        disableButton(manageCheckInBtn, 'ยังไม่ถึงเวลาเริ่ม');
                    } 
                    else if (minutesUntilEnd <= 10) { // เหลือ <= 10 นาที หรือ ติดลบ (จบไปแล้ว)
                        disableButton(manageCheckInBtn, 'หมดเวลาเปิดเช็คชื่อ');
                    }
                }

            } else if (isMember) {
                // --- สมาชิก (Member) ---
                if (unownerControls) unownerControls.style.display = 'flex';

                if (isEventEnded) {
                    // ⚫ จบกิจกรรมแล้ว (completed) -> ทำอะไรไม่ได้
                    if (RoomMessage) {
                        if (RoomTextMessage) RoomTextMessage.textContent = 'กิจกรรมจบแล้ว';
                        RoomMessage.style.display = 'flex';
                    }
                } else if (hasCheckedIn) {
                    // กรณี: เช็คชื่อแล้ว -> โชว์ข้อความเช็คชื่อแล้ว
                    if (checkedInMessage) checkedInMessage.style.display = 'flex';
                } else if (isCheckinExpired && room.ROOM_CHECKIN_EXPIRE) {
                    // รหัสเช็คชื่อหมดอายุ -> โชว์ข้อความหมดเวลาเช็คชื่อ
                    if (RoomMessage) {
                        if (RoomTextMessage) RoomTextMessage.textContent = 'หมดเวลาการเช็คชื่อแล้ว';
                        RoomMessage.style.display = 'flex';
                    }
                } else if (isEventStarted) {
                    // 🟠 กำลังดำเนินกิจกรรม (inProgress) (ยังไม่จบ, ยังไม่เช็ค, ยังไม่หมดเวลา) -> ซ่อนปุ่มออก, โชว์ช่องเช็คชื่อ
                    if (checkInForm) {
                        checkInForm.style.display = 'flex'; // โชว์ฟอร์มเช็คชื่อ
                        checkInForm.onsubmit = (e) => {
                            e.preventDefault();
                            handleCheckIn(roomId);
                        };
                    }
                } else {
                    // 🟢 ยังไม่เริ่ม (pending) -> โชว์ปุ่มออก
                    if (leaveBtn) {
                        leaveBtn.style.display = 'block';
                        leaveBtn.onclick = () => handleLeaveRoom(roomId);
                    }
                }
            } else {
                // กรณี: ยังไม่เป็นสมาชิก
                if (unownerControls) unownerControls.style.display = 'flex';

                if (isEventEnded) {
                    // ⚫ เช็คก่อนว่าจบหรือยัง? -> ถ้าจบแล้วบอก "กิจกรรมจบแล้ว"
                    if (RoomMessage) {
                        if (RoomTextMessage) RoomTextMessage.textContent = 'ปิดรับสมัคร (กิจกรรมจบแล้ว)';
                        RoomMessage.style.display = 'flex';
                    }
                } else if (isEventStarted) {
                    // 🔴 กิจกรรมเริ่มแล้ว -> ปิดรับ
                    if (RoomMessage) {
                        if (RoomTextMessage) RoomTextMessage.textContent = 'ปิดรับสมัคร (เริ่มแล้ว)';
                        RoomMessage.style.display = 'flex';
                    }
                } else if (isFull) {
                    // กรณี: ห้องเต็ม -> โชว์ปุ่มแจ้งเต็ม
                    if (RoomMessage) {
                        if (RoomTextMessage) RoomTextMessage.textContent = 'ห้องเต็มแล้ว';
                        RoomMessage.style.display = 'flex';
                    }
                } else {
                    // 🟢 กิจกรรมยังไม่เริ่ม -> โชว์ปุ่มเข้าร่วม
                    if (joinBtn) {
                        joinBtn.style.display = 'block';
                        joinBtn.onclick = () => handleJoinRoom(roomId, currentUserId);
                    }
                }
            }
        } else {
            alert('ไม่พบข้อมูลห้องกิจกรรม');
            window.location.href = '/home-page.html';
        }

    } catch (error) {
        console.error('Error:', error);
    }
};
function disableButton(button, text) {
    if (button) {
        button.disabled = true;
        button.textContent = text;
        button.style.backgroundColor = '#ccc';
        button.style.cursor = 'not-allowed';
    }
}

// #endregion --- ดึงข้อมูลห้องกิจกรรมจาก API และแสดงผล ---

// #region --- ฟังก์ชันส่งรหัสเช็คชื่อ ---
async function handleCheckIn(roomId) {
    const codeInput = document.getElementById('check-in-input');
    const code = codeInput.value.trim();
    if (!code) { alert('กรุณากรอกรหัสเช็คชื่อ'); return; }

    try {
        const res = await fetch(`/api/room/${roomId}/check-in`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code })
        });
        const result = await res.json();

        if (result.success) {
            alert('เช็คชื่อเรียบร้อย! ได้รับเครดิต +10 💰');
            location.reload();
        } else {
            alert(result.message);
        }
    } catch (err) {
        console.error(err);
        alert('เกิดข้อผิดพลาดในการเช็คชื่อ : ' + err.message);
    }
}
// #endregion

// #region --- ฟังก์ชันแสดงข้อมูลห้องกิจกรรม ---
function renderRoomDetail(room) {
    // รูปปก
    const imgEl = document.getElementById('detail-room-img');
    if (imgEl) imgEl.src = room.ROOM_IMG || '/Resource/img/bangmod.png';

    // รหัสห้อง
    setText('detail-room-id', room.ROOM_ID);
    const roomIdhidden = document.getElementById('detail-room-id-hidden');
    if (roomIdhidden) roomIdhidden.value = room.ROOM_ID;
    // ชื่อห้อง
    setText('detail-room-title', room.ROOM_TITLE);
    // รายละเอียด
    setText('detail-room-desc', room.ROOM_DESCRIPTION || 'ไม่มีรายละเอียดเพิ่มเติม');
    // สถานที่
    setText('detail-room-location', room.LOCATION_NAME || 'ไม่ระบุ');
    // วันที่และเวลา
    const date = new Date(room.ROOM_EVENT_DATE);
    const dateStr = date.toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' });
    setText('detail-room-date', dateStr);

    const startTime = room.ROOM_EVENT_START_TIME.slice(0, 5); // ตัดวินาทีออก
    const endTime = room.ROOM_EVENT_END_TIME.slice(0, 5);
    setText('detail-room-time', `${startTime} - ${endTime} น.`);

    // จำนวนคน (เช่น 3 / 10)
    setText('detail-room-member-count', `ผู้เข้าร่วม ( ${room.CURRENT_MEMBERS} / ${room.ROOM_CAPACITY} ) : `);

    // ข้อมูลหัวหน้าห้อง
    setText('detail-leader-name', room.LEADER_NAME);
    setText('detail-leader-credit', room.LEADER_CREDIT_SCORE);
    const leaderImg = document.getElementById('detail-leader-img');
    if (leaderImg) leaderImg.src = room.LEADER_IMG || '/Resource/img/profile.jpg';

    // Tags (ต้องวนลูปสร้าง)
    const tagContainer = document.getElementById('detail-room-tags');
    if (tagContainer) {
        tagContainer.innerHTML = '';
        if (room.TAGS) {
            const tags = room.TAGS.split(',');
            tags.forEach(tag => {
                const li = document.createElement('li');
                li.textContent = tag;
                tagContainer.appendChild(li);
            });
        } else {
            tagContainer.innerHTML = '<li>ไม่มีแท็ก</li>';
        }
    }
}
// ฟังก์ชันช่วยใส่ข้อความ (กัน Error ถ้าหา ID ไม่เจอ)
function setText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
}
// #endregion

// #region --- ฟังก์ชันแสดงรายชื่อสมาชิกในห้อง ---
function renderMembersList(members) {
    const listContainer = document.getElementById('detail-room-member-list');
    if (!listContainer) return;
    listContainer.innerHTML = '';

    members.forEach(member => {
        const li = document.createElement('li');
        li.className = 'member-room-box';
        li.innerHTML = `
            <div class="profile-member">
                <img src="${member.USER_IMG || '/Resource/img/profile.jpg'}" alt="img">
                <span>${member.USER_FNAME} ${member.USER_LNAME}</span>
            </div>
            <div class="creditperson">
                <span>${member.USER_CREDIT_SCORE || 0}</span>
                <img src="/Resource/img/credit.png" alt="coin">
            </div>
        `;
        listContainer.appendChild(li);
    });
}
// #endregion

// #region --- ฟังก์ชันกดปุ่ม Join --- 
async function handleJoinRoom(roomId, currentUserId) {
    if (!currentUserId) {
        alert('กรุณาเข้าสู่ระบบก่อนเข้าร่วมกิจกรรม');
        window.location.href = '/login-page.html';
        return;
    }

    if (!confirm('ยืนยันการเข้าร่วมกิจกรรม?')) return;

    try {
        const res = await fetch(`/api/room/${roomId}/join`, { method: 'POST' });
        const result = await res.json();

        if (result.success) {
            alert('เข้าร่วมสำเร็จ! 🎉');
            location.reload(); // รีเฟรชหน้าเพื่ออัปเดตสถานะและรายชื่อ
        } else {
            alert(result.message);
        }
    } catch (err) {
        alert('เกิดข้อผิดพลาด');
    }
}
// #endregion

// #region --- ฟังก์ชันกดปุ่ม Leave ---
async function handleLeaveRoom(roomId) {
    if (!confirm('คุณต้องการยกเลิกการเข้าร่วมกิจกรรมนี้ใช่หรือไม่?')) return;

    try {
        const res = await fetch(`/api/room/${roomId}/leave`, { method: 'POST' });
        const result = await res.json();

        if (result.success) {
            alert('ยกเลิกการเข้าร่วมเรียบร้อย');
            location.reload();
        } else {
            alert(result.message);
        }
    } catch (err) {
        alert('เกิดข้อผิดพลาด');
    }
}
// #endregion
