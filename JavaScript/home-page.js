document.addEventListener("DOMContentLoaded", function () {
    // 1. หาปุ่มและเมนูทั้งหมด
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('overlay');
    const openBtn = document.getElementById('sidebar-open-btn');
    const closeBtn = document.getElementById('sidebar-close-btn');

    // 2. ฟังก์ชัน "เปิด" เมนู
    function openSidebar() {
        sidebar.classList.add('active');
        overlay.classList.add('active');
    }

    // 3. ฟังก์ชัน "ปิด" เมนู
    function closeSidebar() {
        sidebar.classList.remove('active');
        overlay.classList.remove('active');
    }

    // 4. สั่งให้ปุ่มทำงาน
    openBtn.addEventListener('click', openSidebar);
    closeBtn.addEventListener('click', closeSidebar);
    overlay.addEventListener('click', closeSidebar);
});