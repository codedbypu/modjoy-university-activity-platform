// #region ฟังก์ชันสำหรับ Logout 
async function handleLogout(event) {
    event.preventDefault();

    try {
        const response = await fetch('/api/logout', {
            method: 'POST'
        });

        const result = await response.json();
        if (result.success) {
            alert('Logout Success:', result.success);
            window.location.href = '/login-page.html';
        }
    } catch (error) {
        console.error('Logout Error:', error);
        alert('Logout Error:', error);
        window.location.href = '/login-page.html';
    }
}
// #endregion

// #region ฟังก์ชันเปิด/ปิดเมนูโปรไฟล์ 
function toggleProfileMenu() {
    const dropdown = document.getElementById('profile-dropdown');
    dropdown.classList.toggle('active');
}
// #endregion

// #region ปิดเมนูโปรไฟล์เมื่อคลิกนอกพื้นที่ 
document.addEventListener('click', function (event) {
    const container = document.querySelector('.profile-menu-container');
    const dropdown = document.getElementById('profile-dropdown');

    // ถ้าคลิกนอกพื้นที่ container และเมนูเปิดอยู่ -> ให้สั่งปิด
    if (container && !container.contains(event.target) && dropdown.classList.contains('active')) {
        dropdown.classList.remove('active');
    }
});
// #endregion