document.addEventListener("DOMContentLoaded", function () {
    // #region initialize elements
    const Check_In_Container = document.getElementById('check-in-container');
    const joinBox = document.getElementById('join-box');
    const checkInForm = document.getElementById('check-in-form');
    const checkedInMessage = document.getElementById('checked-in-message');
    // #endregion

    // #region initialize buttons
    const joinButton = document.getElementById('join-btn');
    const manageCheckInButton = document.getElementById('manage-check-in-btn');
    // #endregion

    // #region check owner room
    const ownerRoom = true;
    if (ownerRoom) {
        joinButton.style.display = 'none';
        manageCheckInButton.style.display = 'flex';
    } else {
        joinButton.style.display = 'inline-block';
        manageCheckInButton.style.display = 'none';
    }
    // #endregion

    // #region event listeners ปุ่ม "เข้าร่วม"
    if (joinButton) {
        joinButton.addEventListener('click', function () {
            // fetch('/join-room', { ... });

            // --- สลับหน้าจอ (State 0 -> State 1) ---
            joinBox.style.display = 'none';

            Check_In_Container.style.display = 'block';
            checkInForm.style.display = 'flex';
        });
    }
    // #endregion

    // #region event listeners ปุ่ม "ยืนยันรหัสเช็คชื่อ"
    if (checkInForm) {
        checkInForm.addEventListener('submit', function (event) {
            event.preventDefault();

            // (อนาคต: คุณต้องส่งรหัสไปตรวจสอบที่เซิร์ฟเวอร์ที่นี่)
            // const code = checkInForm.querySelector('.check-in-input').value;
            // fetch('/submit-check-in-code', { ... });

            // --- สลับหน้าจอ (State 1 -> State 2) ---
            checkInForm.style.display = 'none';

            checkedInMessage.style.display = 'flex';
        });
    }
    // #endregion

});

// #region --- ดึงข้อมูลห้องกิจกรรมจาก API และแสดงผล ---
document.addEventListener('DOMContentLoaded', async () => {
    // 1. ดึง ID จาก URL (เช่น ?id=15)
    const params = new URLSearchParams(window.location.search);
    const roomId = params.get('id');

    if (!roomId) {
        alert('ไม่พบรหัสห้องกิจกรรม');
        window.location.href = '/home-page.html';
        return;
    }

    try {
        // 2. เรียก API ไปดึงข้อมูลห้อง
        const response = await fetch(`/api/room/${roomId}`);
        const data = await response.json();

        if (data.success) {
            const room = data.room;
            renderRoomDetail(room);
        } else {
            alert('ไม่พบข้อมูลห้องกิจกรรม');
            window.location.href = '/home-page.html';
        }

    } catch (error) {
        console.error('Error:', error);
    }
});

function renderRoomDetail(room) {
    // รูปปก
    const imgEl = document.getElementById('detail-room-img');
    if (imgEl) imgEl.src = room.ROOM_IMG || '/Resource/img/bangmod.png';

    // รหัสห้อง
    setText('detail-room-id', room.ROOM_ID);

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
    const leaderImg = document.getElementById('detail-leader-img');
    if (leaderImg) leaderImg.src = room.LEADER_IMG || '/Resource/img/profile.jpg';

    // Tags (ต้องวนลูปสร้าง)
    const tagContainer = document.getElementById('detail-room-tags');
    if (tagContainer) {
        tagContainer.innerHTML = ''; // ล้างของเก่า
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