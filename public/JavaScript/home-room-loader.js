// ตัวแปรเก็บสถานะการโหลด
let currentPage = 1;
let isLoading = false;
let hasMore = true;
let currentFilters = {}; // เก็บค่า Filter ล่าสุดเอาไว้ใช้ตอนเลื่อนจอ

document.addEventListener('DOMContentLoaded', () => {
    // เช็คว่าตอนนี้อยู่หน้าไหน
    const isHistoryPage = window.location.pathname.includes('history-page');
    const isCreatedPage = window.location.pathname.includes('created-room');

    // เช็คว่ามี element ที่ชื่อ rooms-list อยู่ในหน้าไหม
    const listElement = document.getElementById('rooms-list');
    
    // สั่งโหลดเฉพาะเมื่อ: มี List, ไม่ใช่หน้า History, และไม่ใช่หน้า Created Room
    if (listElement && !isHistoryPage && !isCreatedPage) {
        loadRooms(); // โหลดครั้งแรก (หน้า 1)

        // ✅ เพิ่ม Event Listener สำหรับ Infinite Scroll
        window.addEventListener('scroll', () => {
            // เช็คว่าเลื่อนลงมาเกือบสุดจอหรือยัง (เหลือพื้นที่ 100px)
            if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 100) {
                // ถ้าไม่ได้กำลังโหลด และยังมีข้อมูลเหลือ -> โหลดต่อ
                if (!isLoading && hasMore) {
                    loadRooms(currentFilters, true); // true = โหมด Append (ต่อท้าย)
                }
            }
        });
    }
});

export { loadRooms };
async function loadRooms(filterParams = {}, isAppend = false) {
    if (isLoading) return; // ป้องกันการเรียกซ้ำ
    const list = document.getElementById('rooms-list');
    const message = document.getElementById('message');
    const ITEMS_PER_PAGE = 20; // จำนวนห้องต่อหน้า

    // --- กรณี: โหลดใหม่ (กดค้นหา หรือ เข้าหน้าเว็บครั้งแรก) ---
    if (!isAppend) {
        currentFilters = filterParams; // จำค่า Filter นี้ไว้
        currentPage = 1;
        hasMore = true;
        if (list) {
            message.style.display = 'block';
            message.innerText = 'กำลังค้นหากิจกรรม...';}
        if (message) message.innerText = '';
    }

    isLoading = true;
    try {
        // สร้าง URL Query String (รวม Filter + Pagination)
        const queryObj = {
            ...currentFilters,
            page: currentPage,
            limit: ITEMS_PER_PAGE
        };
        const queryString = new URLSearchParams(queryObj).toString();

        // ใช้ fetch เพื่อดึงข้อมูลพร้อม Query String
        const res = await fetch(`/api/rooms?${queryString}`);
        const data = await res.json();

        // ล้าง "กำลังค้นหา..." ออกถ้าเป็นการโหลดใหม่
        if (!isAppend && list) list.innerHTML = '';

        if (!data.success) {
            message.innerText = 'ไม่สามารถโหลดห้องกิจกรรมได้';
            return;
        }

        // กรณีไม่พบข้อมูลเลย
        if (data.rooms.length === 0) {
            hasMore = false; // ไม่มีข้อมูลแล้ว
            if (!isAppend) { 
                message.style.display = 'block'; 
                message.innerText = 'ไม่พบห้องกิจกรรมตามเงื่อนไขที่ระบุ';}
        } else {
            // มีข้อมูล -> วาดลงจอ
            message.innerText = '';
            message.style.display = 'none';
            data.rooms.forEach(room => {
                list.appendChild(createRoomItem(room));
            });
            // เช็คว่าหมดหรือยัง? (ถ้าสิ่งที่ได้มา น้อยกว่า Limit แสดงว่าหมดแล้ว)
            if (data.rooms.length < ITEMS_PER_PAGE) {
                hasMore = false;
            } else {
                currentPage++; // เตรียมโหลดหน้าถัดไป
            }
        }
    } catch (err) {
        console.error(err);
        message.innerHTML = 'เกิดข้อผิดพลาดในการเชื่อมต่อ';
    } finally {
        isLoading = false; // ปลดล็อกสถานะการโหลดไม่ว่าจะสำเร็จหรือผิดพลาด
    }
}

function createRoomItem(room) {
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

            <a class="btn-room-item a-btn"
               href="./room-detail-page.html?id=${room.ROOM_ID}">
               ดูรายละเอียด
            </a>
        </article>
    `;
    return li;
}
