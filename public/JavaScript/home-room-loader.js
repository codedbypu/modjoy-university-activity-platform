document.addEventListener('DOMContentLoaded', loadRooms);

async function loadRooms() {
    try {
        const res = await fetch('/api/rooms');
        const data = await res.json();

        if (!data.success) return;

        const list = document.getElementById('rooms-list');
        list.innerHTML = '';

        data.rooms.forEach(room => {
            list.appendChild(createRoomItem(room));
        });
    } catch (err) {
        console.error(err);
    }
}

function createRoomItem(room) {
    const li = document.createElement('li');
    li.className = 'room-item';

    const date = new Date(room.ROOM_EVENT_DATE);
    const day = date.getDate();
    const month = date.toLocaleString('th-TH', { month: 'short' });

    const tagsHTML = room.tags
        ? room.tags.split(',').map(tag => `<li>${tag}</li>`).join('')
        : '<li>-</li>';

    li.innerHTML = `
        <article>
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
                            ${room.ROOM_EVENT_START_TIME} - ${room.ROOM_EVENT_END_TIME}
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
