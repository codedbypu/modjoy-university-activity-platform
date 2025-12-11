// public/JavaScript/history-room-loader.js

document.addEventListener("DOMContentLoaded", function () {
    if (document.getElementById('rooms-list') && window.location.pathname.includes('history-page')) {
        loadMyHistoryRooms();
    }
});

export async function loadMyHistoryRooms(filterParams = {}) {
    const list = document.getElementById('rooms-list');
    const message = document.getElementById('message');
    if (!list) return;

    try {
        message.style.display = 'block';
        message.innerText = 'กำลังค้นหาประวัติ...';
        const queryString = new URLSearchParams(filterParams).toString();

        // เรียก API ประวัติ
        const response = await fetch(`/api/my-history?${queryString}`);
        const data = await response.json();

        if (!data.success) {
            if (data.message === 'กรุณาเข้าสู่ระบบ') {
                window.location.href = '/login-page.html';
                return;
            }
            message.innerText = 'ไม่สามารถโหลดข้อมูลได้';
            return;
        }

        list.innerHTML = '';

        if (data.rooms.length === 0) {
            message.style.display = 'block';
            message.innerHTML = 'ไม่พบประวัติการเข้าร่วมกิจกรรม';
        } else {
            message.innerText = '';
            message.style.display = 'none';
            data.rooms.forEach(room => {
                list.appendChild(createHistoryRoomItem(room));
            });
        }
    } catch (error) {
        console.error('Error loading history:', error);
        message.innerHTML = 'เกิดข้อผิดพลาดในการเชื่อมต่อ';
    }
}

function createHistoryRoomItem(room) {
    const li = document.createElement('li');
    li.className = 'room-item';

    const date = new Date(room.ROOM_EVENT_DATE);
    const day = date.getDate();
    const month = date.toLocaleString('th-TH', { month: 'short' });
    const tagsHTML = room.tags ? room.tags.split(',').map(tag => `<li>${tag}</li>`).join('') : '<li>-</li>';
    li.innerHTML = `
        <article>
            <div class="header-item" style="background-image: url('${room.ROOM_IMG}');">
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

            <a class="btn-htsroom-item a-btn"
               href="./room-detail-page.html?id=${room.ROOM_ID}">
               ดูรายละเอียด
            </a>
        </article>
    `;
    return li;
}