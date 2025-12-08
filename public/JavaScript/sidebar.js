document.addEventListener("DOMContentLoaded", function () {
    // init ตัวแปร
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('overlay');
    const openBtn = document.getElementById('sidebar-open-btn');
    const closeBtn = document.getElementById('sidebar-close-btn');

    // #region ฟังก์ชัน "เปิด" เมนู
    function openSidebar() {
        sidebar.classList.add('active');
        overlay.classList.add('active');
        document.body.classList.add('sidebar-is-open');
    }
    // #endregion

    // #region ฟังก์ชัน "ปิด" เมนู
    function closeSidebar() {
        sidebar.classList.remove('active');
        overlay.classList.remove('active');
        document.body.classList.remove('sidebar-is-open');
    }
    // #endregion

    // เพิ่ม event listeners
    openBtn.addEventListener('click', openSidebar);
    closeBtn.addEventListener('click', closeSidebar);
    overlay.addEventListener('click', closeSidebar);
});