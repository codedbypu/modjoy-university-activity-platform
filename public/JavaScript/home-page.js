// #region ฟังก์ชันสำหรับ Logout 
async function handleLogout(event) {
    event.preventDefault();

    try {
        const response = await fetch('/api/logout', {
            method: 'POST'
        });

        const result = await response.json();
        if (result.success) {
            window.location.href = '/login-page.html';
        }
    } catch (error) {
        console.error('Logout Error:', error);
        alert('Logout Error:', error);
        window.location.href = '/login-page.html';
    }
}
// #endregion

// #region ตรวจสอบสถานะการล็อกอิน เมื่อโหลดหน้า Home Page 
document.addEventListener('DOMContentLoaded', async () => {
    const logoutButton = document.querySelectorAll('#logout-button');
    logoutButton.forEach(btn => {
        btn.addEventListener('click', handleLogout);
    });

    // #region --------------- ตรวจสอบสถานะการล็อกอิน -------------------- 
    try {
        const response = await fetch('/api/me');
        const data = await response.json();

        if (data.loggedIn) {
            // --- กรณีล็อกอินแล้ว มี Token ---
            document.body.classList.add('is-logged-in');

            // เปลี่ยน elements ต่างๆ ตามข้อมูลจริงของผู้ใช้
            if (data.user) {
                // อัปเดตชื่อและอีเมลใน Dropdown (desktop)
                const userNameDisplay = document.getElementById('user-name');
                const userEmailDisplay = document.getElementById('user-email');
                if (userNameDisplay) userNameDisplay.textContent = data.user.username + ' ' + data.user.lastname;
                if (userEmailDisplay) userEmailDisplay.textContent = data.user.email;

                // อัปเดต Sidebar (mobile)
                const sidebarName = document.getElementById('sidebar-user-name');
                const sidebarEmail = document.getElementById('sidebar-user-email');
                if (sidebarName) sidebarName.textContent = data.user.username + ' ' + data.user.lastname;
                if (sidebarEmail) sidebarEmail.textContent = data.user.email;
            }

        } else {
            // --- กรณีไม่ได้ล็อกอิน ไม่มี Token ---
            document.body.classList.remove('is-logged-in');
        }

    } catch (error) {
        console.error('Home Auth Check Error:', error);
        // กรณี Error ให้ถือว่าเป็น Guest ไปก่อน
        document.body.classList.remove('is-logged-in');
    }
    // #endregion
});
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