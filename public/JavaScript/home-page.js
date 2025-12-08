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
    const userSection = document.getElementById('user-section');
    const guestSection = document.getElementById('guest-section');
    const sidebar = document.getElementById('sidebar');

    try {
        const response = await fetch('/api/me');
        const data = await response.json();

        if (data.loggedIn) {
            // --- กรณีล็อกอินแล้ว มี Token ---
            if (userSection) userSection.style.display = 'block';
            if (guestSection) guestSection.style.display = 'none';

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
            // --- กรณีเป็น Guest (ยังไม่ล็อกอิน) ---
            // if (userSection) userSection.style.display = 'none';  // ซ่อนรูปโปรไฟล์
            // if (guestSection) guestSection.style.display = 'flex'; // โชว์ปุ่ม Login

            // จัดการ Sidebar (อาจจะซ่อนเมนูที่ต้องล็อกอิน หรือเปลี่ยนปุ่ม Logout เป็น Login)
            // const sidebarLogout = document.querySelector('.sidebar-links li:last-child a');
            // if (sidebarLogout) {
            //     sidebarLogout.href = './login-page.html';
            //     sidebarLogout.innerHTML = '<span class="material-symbols-outlined">login</span><span>เข้าสู่ระบบ</span>';
            // }
        }

    } catch (error) {
        console.error('Home Auth Check Error:', error);
        // กรณี Error ให้ถือว่าเป็น Guest ไปก่อน
        if (userSection) userSection.style.display = 'none';
        if (guestSection) guestSection.style.display = 'flex';
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