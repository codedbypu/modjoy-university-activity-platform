// public/JavaScript/created-room-loader.js

document.addEventListener("DOMContentLoaded", function () {
    if (document.getElementById('rooms-list') && window.location.pathname.includes('created-room')) {
        loadMyCreatedRooms();
    }
});

export async function loadMyCreatedRooms(filterParams = {}) {
    const list = document.getElementById('rooms-list');
    const message = document.getElementById('message'); // 1. ดึง Element message

    if (!list || !message) return;

    try {
        // 2. สถานะ Loading: เคลียร์ลิสต์ และแสดงข้อความกำลังโหลด
        list.innerHTML = '';
        message.style.display = 'block';
        message.innerText = 'กำลังค้นหากิจกรรม...';

        const queryString = new URLSearchParams(filterParams).toString();
        const response = await fetch(`/api/my-created-rooms?${queryString}`);
        const data = await response.json();

        if (!data.success) {
            if (data.message === 'กรุณาเข้าสู่ระบบ') {
                window.location.href = '/login-page.html';
                return;
            }
            // 3. สถานะ Error: แจ้งเตือนเมื่อโหลดไม่ได้
            message.innerText = 'ไม่สามารถโหลดข้อมูลได้';
            return;
        }

        // เคลียร์ข้อมูลเก่าอีกครั้งเพื่อความชัวร์ (กรณีโหลดสำเร็จ)
        list.innerHTML = '';

        if (data.rooms.length === 0) {
            // 4. สถานะ Empty: ไม่พบข้อมูล
            message.style.display = 'block';
            message.innerText = 'ไม่พบกิจกรรมที่คุณสร้าง';
        } else {
            // 5. สถานะ Success: ซ่อนข้อความ และแสดงรายการห้อง
            message.innerText = ''; 
            message.style.display = 'none'; // ซ่อน element เพื่อไม่ให้กินพื้นที่

            data.rooms.forEach(room => {
                list.appendChild(createRoomItem(room));
            });
        }
    } catch (error) {
        console.error('Error loading rooms:', error);
        // 6. สถานะ Network Error
        message.innerText = 'เกิดข้อผิดพลาดในการเชื่อมต่อ';
        message.style.display = 'block';
    }
}

// ฟังก์ชันสร้าง HTML การ์ด (เหมือนเดิม)
function createRoomItem(room) {
    const li = document.createElement('li');
    li.className = 'room-item';

    const date = new Date(room.ROOM_EVENT_DATE);
    const day = date.getDate();
    const month = date.toLocaleString('th-TH', { month: 'short' });
    const tagsHTML = room.tags ? room.tags.split(',').map(tag => `<li>${tag}</li>`).join('') : '<li>-</li>';
    const bgImage = room.ROOM_IMG ? room.ROOM_IMG : '/Resource/img/bangmod.png';

    li.innerHTML = `
        <article style="display:flex; flex-direction:column; height:100%;">
            <div class="header-item">
                <div class="group-date-month">
                    <span class="date-activity">${day}</span>
                    <span class="month-activity">${month}</span>
                </div>
            </div>

            <hr class="separator-line">

            <div class="body-item">
                <div class="first-row-item-body">
                    <h2>${room.ROOM_TITLE}</h2>
                    <span class="people-activity">
                        <span class="material-symbols-outlined">person</span>
                        ${room.member_count}/${room.ROOM_CAPACITY}
                    </span>
                </div>

                <div class="second-row-item-body">
                    <p>Tag:</p>
                    <ul class="tag-list-item">
                        ${tagsHTML}
                    </ul>
                </div>

                <div class="third-row-item-body">
                    <p>สถานที่: 
                        <span class="address-activity">
                            ${room.LOCATION_NAME || '-'}
                        </span>
                    </p>
                    <p class="time-activity">
                        <span class="material-symbols-outlined">pace</span>
                        <span>
                            ${room.formatted_start_time} - ${room.formatted_end_time}
                        </span>
                    </p>
                </div>
            </div>

            <a class="btn-room-item a-btn"
               href="./room-detail-page.html?id=${room.ROOM_ID}" 
               style="display:flex; justify-content:center; align-items:center; text-decoration:none;">
               ดูรายละเอียด
            </a>
        </article>
    `;
    return li;
}