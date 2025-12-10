document.addEventListener("DOMContentLoaded", function () {
    // #region initialize elements
    const Check_In_Container = document.getElementById('check-in-container');
    const joinBox = document.getElementById('join-box');
    const checkInForm = document.getElementById('check-in-form');
    const checkedInMessage = document.getElementById('checked-in-message');
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
    // ดึง ID จาก URL (เช่น ?id=15)
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

    try {
        // 2. เรียก API ไปดึงข้อมูลห้อง
        const response = await fetch(`/api/room/${roomId}`);
        const data = await response.json();

        if (data.success) {
            const room = data.room;
            renderRoomDetail(room);
            fetchRoomMembers(roomId);

            if (currentUserId && (room.ROOM_LEADER_ID == currentUserId || currentUserRole === 'admin')) {
                const editBtn = document.getElementById('edit-room-btn');
                const headerBlank = document.querySelector('.header-blank');
                const joinButton = document.getElementById('join-btn');
                const manageCheckInButton = document.getElementById('manage-check-in-btn');
                if (headerBlank) headerBlank.style.display = 'none'; // ซ่อนช่องว่าง
                if (editBtn) editBtn.style.display = 'block'; // โชว์ปุ่ม
                if (editBtn) editBtn.href = `/edit-room-page.html?id=${room.ROOM_ID}`;
                if (joinButton) joinButton.style.display = 'none'; // ซ่อนปุ่มเข้าร่วม
                if (manageCheckInButton) manageCheckInButton.style.display = 'flex'; // โชว์ปุ่มจัดการเช็คชื่อ
            }
        } else {
            alert('ไม่พบข้อมูลห้องกิจกรรม');
            window.location.href = '/home-page.html';
        }

    } catch (error) {
        console.error('Error:', error);
    }
});

// #region ฟังก์ชันแสดงข้อมูลห้องกิจกรรม
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

// #region ฟังก์ชันดึงและแสดงสมาชิก
async function fetchRoomMembers(roomId) {
    try {
        const res = await fetch(`/api/room/${roomId}/members`);
        const data = await res.json();

        if (data.success) {
            const listContainer = document.getElementById('detail-room-member-list');
            if (!listContainer) return;

            listContainer.innerHTML = ''; // เคลียร์ค่าเก่า

            data.members.forEach(member => {
                // เตรียมข้อมูล
                const fullName = `${member.USER_FNAME} ${member.USER_LNAME}`;
                const imgSrc = member.USER_IMG || '/Resource/img/profile.jpg';
                const credit = member.USER_CREDIT_SCORE || 0;

                // สร้าง HTML
                const li = document.createElement('li');
                li.className = 'member-room-box';
                li.innerHTML = `
                    <div class="profile-member">
                        <img src="${imgSrc}" alt="profile-image">
                        <span>${fullName}</span>
                    </div>
                    <div class="creditperson">
                        <span>${credit}</span>
                        <img src="/Resource/img/credit.png" alt="credit-image">
                    </div>
                `;

                listContainer.appendChild(li);
            });
        }

    } catch (error) {
        console.error('Error fetching members:', error);
    }
}
// #endregion
// #endregion --- ดึงข้อมูลห้องกิจกรรมจาก API และแสดงผล ---

