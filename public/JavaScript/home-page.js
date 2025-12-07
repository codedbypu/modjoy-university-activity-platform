// ฟังก์ชันสำหรับ Logout
async function handleLogout(event) {
    event.preventDefault(); // หยุดการเปลี่ยนหน้าแบบปกติ

    try {
        const response = await fetch('/api/logout', {
            method: 'POST'
        });

        const result = await response.json();

        if (result.success) {
            // ย้ายไปหน้า Login
            window.location.href = '/login-page.html';
        }
    } catch (error) {
        console.error('Logout Error:', error);
        window.location.href = '/login-page.html'; // ถ้า Error ก็ดีดออกไปเลยเพื่อความชัวร์
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    // ---------------- ผูกอีเวนต์ Logout ให้กับลิงก์หรือปุ่มที่เกี่ยวข้อง ----------------
    const logoutLinks = document.querySelectorAll('a[href="./login-page.html"], a[href="/login-page.html"], #logout-button, .logout-item');

    logoutLinks.forEach(link => {
        // เช็คว่าเป็นปุ่ม Logout จริงๆ (ดูจาก text หรือ class)
        if (link.textContent.includes('ออกจากระบบ') || link.id === 'logout-button' || link.classList.contains('logout-item')) {
            link.addEventListener('click', handleLogout);
        }
    });

    // --------------- ตรวจสอบสถานะการล็อกอิน --------------------
    // 1. ดึง Element ที่ต้องใช้
    const userSection = document.getElementById('user-section'); // ส่วนรูปโปรไฟล์
    const guestSection = document.getElementById('guest-section'); // ปุ่ม Login
    const sidebar = document.getElementById('sidebar'); // Sidebar (เผื่อปรับในมือถือ)

    try {
        // 2. เช็คสถานะจาก Server
        const response = await fetch('/api/me');
        const data = await response.json();

        if (data.loggedIn) {
            // --- กรณีล็อกอินแล้ว ---
            if (userSection) userSection.style.display = 'block'; // โชว์รูปโปรไฟล์
            if (guestSection) guestSection.style.display = 'none';  // ซ่อนปุ่ม Login

            // อัปเดตข้อมูลผู้ใช้ (ถ้ามี)
            if (data.user) {
                // อัปเดตชื่อและอีเมลใน Dropdown (desktop)
                const userNameDisplay = document.getElementById('user-name'); // ชื่อใน Dropdown
                const userEmailDisplay = document.getElementById('user-email'); // อีเมลใน Dropdown
                if (userNameDisplay) userNameDisplay.textContent = data.user.username + ' ' + data.user.lastname;
                if (userEmailDisplay) userEmailDisplay.textContent = data.user.email;

                // อัปเดต Sidebar ในมือถือด้วยก็ได้
                const sidebarName = document.getElementById('sidebar-user-name');
                const sidebarEmail = document.getElementById('sidebar-user-email');
                if (sidebarName) sidebarName.textContent = data.user.username + ' ' + data.user.lastname;
                if (sidebarEmail) sidebarEmail.textContent = data.user.email;
            }

        } else {
            // // --- กรณีเป็น Guest (ยังไม่ล็อกอิน) ---
            // if (userSection) userSection.style.display = 'none';  // ซ่อนรูปโปรไฟล์
            // if (guestSection) guestSection.style.display = 'flex'; // โชว์ปุ่ม Login

            // // จัดการ Sidebar (อาจจะซ่อนเมนูที่ต้องล็อกอิน หรือเปลี่ยนปุ่ม Logout เป็น Login)
            // const sidebarLogout = document.querySelector('.sidebar-links li:last-child a');
            // if (sidebarLogout) {
            //     sidebarLogout.href = './login-page.html';
            //     sidebarLogout.innerHTML = '<span class="material-symbols-outlined">login</span><span>เข้าสู่ระบบ</span>';
            // }
        }

    } catch (error) {
        console.error('Home Auth Check Error:', error);
        // กรณี Error ให้ถือว่าเป็น Guest ไปก่อน
        // if (userSection) userSection.style.display = 'none';
        // if (guestSection) guestSection.style.display = 'flex';
    }
});

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