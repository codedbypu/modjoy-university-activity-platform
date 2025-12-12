document.addEventListener("DOMContentLoaded", function () {
    loadMyJoinedRooms();
});

async function loadMyJoinedRooms() {
    const list = document.getElementById('rooms-list');
    if (!list) return;

    try {
        // แสดง Loading
        list.innerHTML = '<h3 style="text-align:center; width:100%; color:#AEAEAE;">กำลังโหลดข้อมูล...</h3>';

        const response = await fetch('/api/my-joined-active-rooms');
        const data = await response.json();

        if (!data.success) {
            list.innerHTML = `<h3 style="text-align:center; width:100%; color:#AEAEAE;">${data.message || 'เกิดข้อผิดพลาด'}</h3>`;
            return;
        }

        list.innerHTML = '';

        if (data.rooms.length === 0) {
            // แก้ไขบรรทัดนี้: เพิ่ม grid-column: 1 / -1; ลงไปใน style
            list.innerHTML = '<h3 style="text-align:center; width:100%; grid-column: 1 / -1; color:#AEAEAE; padding:20px;">ยังไม่มีกิจกรรมที่เข้าร่วมเร็วๆ นี้</h3>';
        } else {
            data.rooms.forEach(room => {
                list.appendChild(createRoomItem(room));
            });
        }

    } catch (error) {
        console.error('Error:', error);
        list.innerHTML = '<h3 style="text-align:center; width:100%; color:#AEAEAE;">ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้</h3>';
    }
}

// ฟังก์ชันสร้าง HTML การ์ด (เหมือนกับใน created-room-loader แต่ปรับให้ใช้ได้ทั่วไป)
function createRoomItem(room) {
    const li = document.createElement('li');
    li.className = 'room-item';

    const date = new Date(room.ROOM_EVENT_DATE);
    const day = date.getDate();
    const month = date.toLocaleString('th-TH', { month: 'short' });
    
    // จัดการ Tags
    const tagsHTML = room.TAGS 
        ? room.TAGS.split(',').map(tag => `<li>${tag}</li>`).join('') 
        : '<li>-</li>';
        
    // รูปภาพ
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
                        ${room.MEMBER_COUNT}/${room.ROOM_CAPACITY}
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
                            ${room.FORMAT_START_TIME} - ${room.FORMAT_END_TIME}
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