let currentPage = 1;
let isLoading = false;
let hasMore = true;
let currentFilters = {};

document.addEventListener("DOMContentLoaded", function () {
    const listElement = document.getElementById('rooms-list');

    // ตรวจสอบ URL เพื่อกำหนดประเภทกิจกรรม (Created หรือ History)
    const path = window.location.pathname;
    let initialFilter = {};

    if (path.includes('created-room'))
        initialFilter = { type: 'created' };
    else if (path.includes('history'))
        initialFilter = { type: 'history' };

    if (listElement && initialFilter.type) {
        loadMyActivities(initialFilter);

        window.addEventListener('scroll', () => {
            if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 100) {
                if (!isLoading && hasMore) {
                    loadMyActivities(currentFilters, true); // true = โหมด Append
                }
            }
        });
    }
});

export async function loadMyActivities(filterParams = {}, isAppend = false) {
    if (isLoading) return;
    const list = document.getElementById('rooms-list');
    const message = document.getElementById('message');
    const ITEMS_PER_PAGE = 20;

    // --- กรณี: โหลดใหม่ (Reset) ---
    if (!isAppend) {
        currentFilters = filterParams; // จำค่า Filter ไว้
        currentPage = 1;
        hasMore = true;
        if (list) {
            list.innerHTML = ''; // เคลียร์รายการเก่า
            if (message) {
                message.style.display = 'block';
                message.innerText = 'กำลังค้นหากิจกรรม...';
            }
        }
    }
    isLoading = true;
    try {
        // สร้าง Query String
        const queryObj = {
            ...currentFilters,
            page: currentPage,
            limit: ITEMS_PER_PAGE
        };
        const queryString = new URLSearchParams(queryObj).toString();

        const response = await fetch(`/api/my-activities?${queryString}`);
        const data = await response.json();

        // เช็ค Error
        if (!data.success) {
            if (data.message === 'กรุณาเข้าสู่ระบบ') {
                window.location.href = '/login-page.html';
                return;
            }
            if (message) {
                message.style.display = 'block';
                message.innerText = 'ไม่สามารถโหลดห้องกิจกรรมได้';
            }
            return;
        }
        // --- กรณีไม่พบข้อมูลเลย ---
        if (data.rooms.length === 0) {
            hasMore = false; // หมดข้อมูลแล้ว
            if (!isAppend && message) {
                message.style.display = 'block';
                message.innerText = 'ไม่พบห้องกิจกรรมตามเงื่อนไขที่ระบุ';
            }
        } else {
            // --- กรณีมีข้อมูล: วาดลงจอ ---
            message.innerText = '';
            message.style.display = 'none';
            data.rooms.forEach(room => {
                list.appendChild(createRoomItem(room));
            });
            // เช็คว่าหมดหน้าหรือยัง?
            if (data.rooms.length < ITEMS_PER_PAGE) {
                hasMore = false;
            } else {
                currentPage++; // เตรียมโหลดหน้าถัดไป

                setTimeout(() => {
                    if (document.body.offsetHeight <= window.innerHeight && hasMore) {
                        console.log('จอใหญ่เกิน... กำลังโหลดเพิ่มอัตโนมัติ');
                        loadMyActivities(currentFilters, true);
                    }
                }, 1000);
            }
        }
    } catch (error) {
        console.error('Error:', error);
        message.innerText = 'เกิดข้อผิดพลาดในการเชื่อมต่อ';
    } finally {
        isLoading = false; // ปลดล็อกสถานะ
    }
}

// ฟังก์ชันหลักในการดึงข้อมูล
function createRoomItem(room) {
    const li = document.createElement('li');
    li.className = 'room-item';

    const date = new Date(room.ROOM_EVENT_DATE);
    const day = date.getDate();
    const month = date.toLocaleString('th-TH', { month: 'short' });
    const bgImage = room.ROOM_IMG ? room.ROOM_IMG : '/Resource/img/bangmod.png';
    const tagsHTML = room.TAGS ? room.TAGS.split(',').map(tag => `<li>${tag}</li>`).join('') : '<li>-</li>';

    let btnClass = 'btn-room-item'; 
    if (room.ROOM_STATUS === 2)
        btnClass = 'btn-htsroom-item'; 

    li.innerHTML = `
        <article>
            <div class="header-item" style="background-image: url('${bgImage}');">
                <div class="group-date-month">
                    <span class="date-activity">${day}</span>
                    <span class="month-activity">${month}</span>
                </div>
            </div>

            <hr class="separator-line">

            <div class="body-item">
                <div class="first-row-item-body">
                    <h2 title="${room.ROOM_TITLE}">${room.ROOM_TITLE}</h2>
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
                            ${room.LOCATION_NAME || 'ไม่ระบุ'}
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

            <a class="${btnClass} a-btn" href="./room-detail-page.html?id=${room.ROOM_ID}">
                ดูรายละเอียด
            </a>
        </article>
    `;
    return li;
}