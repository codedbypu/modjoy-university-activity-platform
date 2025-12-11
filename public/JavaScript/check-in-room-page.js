let countdownInterval;
let serverTimeOffset = 0;

document.addEventListener('DOMContentLoaded', async () => {
    const params = new URLSearchParams(window.location.search);
    const roomId = params.get('id');

    if (!roomId) {
        alert('ไม่พบรหัสห้อง');
        window.location.href = '/home-page.html';
        return;
    }

    // เรียกฟังก์ชันหลัก
    await initCheckInPage(roomId);

    // ตั้งเวลาให้รีเฟรชรายชื่อคนเช็คชื่อทุกๆ 30 วินาที (Real-time polling)
    setInterval(() => {
        updateMembersList(roomId);
    }, 30000);
});

async function initCheckInPage(roomId) {
    try {
        // 1. ดึงข้อมูลห้อง (เพื่อเอารหัสเช็คชื่อ)
        const roomRes = await fetch(`/api/room/${roomId}`);
        const roomData = await roomRes.json();

        if (!roomData.success) {
            alert('โหลดข้อมูลไม่สำเร็จ');
            return;
        }
        const room = roomData.room;

        if (room.SERVER_TIME) {
            const serverTime = new Date(room.SERVER_TIME).getTime();
            const clientTime = new Date().getTime();
            serverTimeOffset = serverTime - clientTime; // เก็บค่าผลต่างไว้
        }

        // แสดงข้อมูลพื้นฐาน
        document.getElementById('room-id').textContent = room.ROOM_ID;
        document.getElementById('room-name').textContent = room.ROOM_TITLE;

        // 2. เช็คว่ามีรหัสหรือยัง? ถ้ายังไม่มี ให้สร้างใหม่ (Auto Generate)
        if (!room.ROOM_CHECKIN_CODE) {
            await generateCheckInCode(roomId);
        } else {
            renderCodeInfo(room.ROOM_CHECKIN_CODE, room.ROOM_CHECKIN_EXPIRE);
        }

        // 3. ดึงรายชื่อสมาชิกมาแสดง
        await updateMembersList(roomId);

    } catch (err) {
        console.error(err);
    }
}

// ฟังก์ชันยิง API สร้างรหัส
async function generateCheckInCode(roomId) {
    try {
        const res = await fetch(`/api/room/${roomId}/generate-code`, { method: 'POST' });
        const data = await res.json();
        
        if (data.success) {
            renderCodeInfo(data.code, data.expire);
        } else {
            alert('สร้างรหัสไม่สำเร็จ: ' + data.message);
        }
    } catch (err) {
        console.error(err);
    }
}

// ฟังก์ชันแสดงรหัสและเวลาหมดอายุ
function renderCodeInfo(code, expireDateStr) {
    document.getElementById('room-password').textContent = code;
    
    if (expireDateStr) {
        const expireTime = new Date(expireDateStr.replace(' ', 'T')).getTime();

        const expiryElement = document.getElementById('room-expiry');

        const timeStr = new Date(expireTime).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });

        if (countdownInterval) clearInterval(countdownInterval);
        const updateTimer = () => {
            const now = new Date().getTime() + serverTimeOffset; 
            const distance = expireTime - now;
            
            // ถ้าหมดเวลาแล้ว
            if (distance < 0) {
                clearInterval(countdownInterval);
                expiryElement.textContent = `รหัสหมดอายุแล้ว (${timeStr}น.)`;
                expiryElement.style.color = "#e74c3c"; // เปลี่ยนเป็นสีแดง
                return;
            } else if (distance <= 10 * 60 * 1000) {
                // ถ้าเหลือเวลาไม่เกิน 10 นาที
                expiryElement.style.color = "#e67e22"; // เปลี่ยนเป็นสีส้ม
            }else {
                expiryElement.style.color = ""; // สีปกติ
            }

            // คำนวณนาทีและวินาที
            const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((distance % (1000 * 60)) / 1000);

            // จัดรูปแบบให้มีเลข 0 นำหน้าถ้าน้อยกว่า 10 (เช่น 09, 05)
            const hoursStr = hours < 10 ? "0" + hours : hours;
            const minutesStr = minutes < 10 ? "0" + minutes : minutes;
            const secondsStr = seconds < 10 ? "0" + seconds : seconds;

            
            // แสดงผล
            expiryElement.textContent = `เหลือเวลา: ${hoursStr} ชั่วโมง ${minutesStr} นาที ${secondsStr} วินาที (${timeStr}น.)`;
        };
        updateTimer();
        countdownInterval = setInterval(updateTimer, 1000);
    }
}

// ฟังก์ชันดึงและแสดงรายชื่อสมาชิก (แยกกลุ่ม)
async function updateMembersList(roomId) {
    try {
        const res = await fetch(`/api/room/${roomId}/members`);
        const data = await res.json();

        if (data.success) {
            const members = data.members;

            // แยกกลุ่ม
            const checkedIn = members.filter(m => m.ROOMMEMBER_STATUS === 'present');
            const notCheckedIn = members.filter(m => m.ROOMMEMBER_STATUS !== 'present');

            // อัปเดตตัวเลข
            document.getElementById('checked-in-count').textContent = `เช็คชื่อแล้ว ( ${checkedIn.length} ) : `;
            document.getElementById('not-checked-in-count').textContent = `ยังไม่ได้เช็คชื่อ ( ${notCheckedIn.length} ) : `;

            // Render List
            renderList('checked-in-list', checkedIn, true);
            renderList('not-checked-in-list', notCheckedIn, false);
        }
    } catch (err) {
        console.error(err);
    }
}

// Helper: สร้าง HTML รายชื่อ
function renderList(elementId, members, isCheckedIn) {
    const list = document.getElementById(elementId);
    list.innerHTML = '';

    members.forEach(m => {
        const li = document.createElement('li');
        li.className = 'member-room-box';
        
        const img = m.USER_IMG || '/Resource/img/profile.png';
        const name = `${m.USER_FNAME} ${m.USER_LNAME}`;
        const credit = m.USER_CREDIT_SCORE || 0;

        // ไอคอน: ถ้าเช็คแล้วเป็นสีเขียว (checked-in-icon), ยังไม่เช็คเป็นสีเทา/จาง (not-checked-in-icon)
        const iconClass = isCheckedIn ? 'checked-in-icon' : 'not-checked-in-icon';
        const iconStyle = isCheckedIn ? 'color: #2ecc71;' : 'color: #ccc;';

        li.innerHTML = `
            <div class="profile-member">
                <img src="${img}" alt="profile-image">
                <span>${name}</span>
            </div>
            <div class="creditperson">
                <span>${credit}</span>
                <img src="/Resource/img/credit.png" alt="credit-image">
                <span class="material-symbols-outlined ${iconClass}" style="${iconStyle}">
                    check_circle
                </span>
            </div>
        `;
        list.appendChild(li);
    });
}