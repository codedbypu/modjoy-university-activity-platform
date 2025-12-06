/* โค้ดสำหรับหน้า room-detail-page.js
  (เราใช้ 'DOMContentLoaded' เพื่อให้แน่ใจว่า HTML โหลดเสร็จก่อน)
*/
document.addEventListener("DOMContentLoaded", function () {

    // --- 1. ค้นหาองค์ประกอบทั้ง 3 State ---
    const Check_In_Container = document.getElementById('check-in-container');
    const joinBox = document.getElementById('join-box');
    const checkInForm = document.getElementById('check-in-form');
    const checkedInMessage = document.getElementById('checked-in-message');

    // --- 2. ค้นหา "ปุ่ม" ที่เป็นตัวกระตุ้น (Trigger) ---
    const joinButton = document.getElementById('join-btn');
    const manageCheckInButton = document.getElementById('manage-check-in-btn');

    const ownerRoom = true;
    if (ownerRoom) {
        joinButton.style.display = 'none';
        manageCheckInButton.style.display = 'flex';
    } else {
        joinButton.style.display = 'inline-block';
        manageCheckInButton.style.display = 'none';
    }

    // --- 3. (Event 1) เมื่อคลิกปุ่ม "เข้าร่วม" ---
    if (joinButton) {
        joinButton.addEventListener('click', function () {

            // (อนาคต: คุณควรส่งข้อมูลไปเซิร์ฟเวอร์ว่า "เข้าร่วม" ที่นี่)
            // fetch('/join-room', { ... });

            // --- สลับหน้าจอ (State 1 -> State 2) ---
            joinBox.style.display = 'none';

            // (สำคัญ!) ใช้ 'flex' เพราะ CSS ของคุณกำหนดให้ .check-in-box เป็น display: flex
            Check_In_Container.style.display = 'block';
            checkInForm.style.display = 'flex';
        });
    }


    // --- 4. (Event 2) เมื่อกดยืนยัน "รหัสเช็คชื่อ" ---
    if (checkInForm) {
        checkInForm.addEventListener('submit', function (event) {

            // 4.1 หยุดไม่ให้หน้าเว็บโหลดใหม่ (เพราะเป็น <form>)
            event.preventDefault();

            // 4.2 (อนาคต: คุณต้องส่งรหัสไปตรวจสอบที่เซิร์ฟเวอร์ที่นี่)
            // const code = checkInForm.querySelector('.check-in-input').value;
            // fetch('/submit-check-in-code', { ... });

            // --- สลับหน้าจอ (State 2 -> State 3) ---
            checkInForm.style.display = 'none';

            // (ใช้ 'flex' เพราะ CSS ของคุณกำหนดให้ .checked-in-message เป็น display: flex)
            checkedInMessage.style.display = 'flex';
        });
    }

});