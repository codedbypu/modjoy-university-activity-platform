// public/JavaScript/created-room-loader.js

// ลบ Import ที่วนลูปตัวเองออกให้หมด
// เราไม่จำเป็นต้อง import loadRooms ที่นี่ เพราะหน้านี้ใช้แต่ loadMyCreatedRooms

document.addEventListener("DOMContentLoaded", function () {
    // เช็คว่าอยู่ในหน้า created-room หรือไม่ เพื่อสั่งรันอัตโนมัติเมื่อเปิดหน้า
    // ใช้ includes('created-room') เพื่อให้ครอบคลุมทั้ง .html หรือไม่มีนามสกุล
    if (document.getElementById('rooms-list') && window.location.pathname.includes('created-room')) {
        loadMyCreatedRooms();
    }
});

// Export ฟังก์ชันเพื่อให้ filter.js เรียกใช้ได้เมื่อมีการกดค้นหา
export async function loadMyCreatedRooms(filterParams = {}) {
    const list = document.getElementById('rooms-list');
    if (!list) return;

    try {
        list.innerHTML = '<li>กำลังค้นหากิจกรรม...</li>';

        // สร้าง Query String
        const queryString = new URLSearchParams(filterParams).toString();

        // เรียก API /my-created-rooms (ซึ่งใน Backend เขียนไว้ถูกแล้วว่า WHERE ROOM_LEADER_ID = ?)
        const response = await fetch(`/api/my-created-rooms?${queryString}`);
        const data = await response.json();

        if (!data.success) {
            if (data.message === 'กรุณาเข้าสู่ระบบ') {
                window.location.href = '/login-page.html';
                return;
            }
            list.innerHTML = '<li>ไม่สามารถโหลดข้อมูลได้</li>';
            return;
        }

        list.innerHTML = '';

        if (data.rooms.length === 0) {
            list.innerHTML = '<li style="text-align:center; padding: 20px; width:100%;">ไม่พบกิจกรรมที่คุณสร้าง</li>';
        } else {
            data.rooms.forEach(room => {
                list.appendChild(createRoomItem(room));
            });
        }
    } catch (error) {
        console.error('Error loading rooms:', error);
        list.innerHTML = '<li>เกิดข้อผิดพลาดในการเชื่อมต่อ</li>';
    }
}

// ฟังก์ชันสร้าง HTML การ์ด (ใช้เฉพาะในไฟล์นี้)
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
            <div class="header-item" style="background-image: url('${bgImage}'); position: relative;">
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