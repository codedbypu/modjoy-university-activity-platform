
function toggleProfileMenu() {
    const dropdown = document.getElementById('profile-dropdown');
    dropdown.classList.toggle('active');
}

// ฟังก์ชันเสริม: คลิกที่อื่นแล้วให้เมนูปิดเอง
document.addEventListener('click', function (event) {
    const container = document.querySelector('.profile-menu-container');
    const dropdown = document.getElementById('profile-dropdown');

    // ถ้าคลิกนอกพื้นที่ container และเมนูเปิดอยู่ -> ให้สั่งปิด
    if (container && !container.contains(event.target) && dropdown.classList.contains('active')) {
        dropdown.classList.remove('active');
    }
});
