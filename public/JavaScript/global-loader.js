async function loadGlobalUserData() {
    try {
        const response = await fetch('/api/me');
        const data = await response.json();

        // --- 1. เตรียม Element ที่ต้องแก้ค่า (Sidebar & Header) ---
        // Sidebar
        const sidebarUserName = document.getElementById('sidebar-user-name');
        const sidebarUserEmail = document.getElementById('sidebar-user-email');
        const sidebarUserCredit = document.getElementById('sidebar-user-credit');
        // รูปใน Sidebar (มี 2 จุด: อันที่เป็น Link และอันที่เป็น Guest)
        const sidebarImgs = document.querySelectorAll('.sidebar-profile-img img');

        // Header Desktop (Dropdown)
        const dropdownNames = document.querySelectorAll('.profile-dropdown .user-name');
        const dropdownEmails = document.querySelectorAll('.profile-dropdown .user-email');
        const dropdownImgs = document.querySelectorAll('.profile-dropdown img');
        const headerProfileBtnImg = document.querySelector('#profile-menu-btn img');

        // --- 2. เช็คสถานะ ---
        if (data.loggedIn && data.user) {
            // === ล็อกอินแล้ว ===
            document.body.classList.add('is-logged-in'); // ใส่ Class ให้ Body เพื่อคุม CSS (ซ่อน/แสดงปุ่ม)

            const fullName = `${data.user.fullname} ${data.user.lastname}`;
            const imgSrc = data.user.profile_image || '/Resource/img/profile.jpg';

            // อัปเดต Sidebar
            if(sidebarUserName) sidebarUserName.textContent = fullName;
            if(sidebarUserEmail) sidebarUserEmail.textContent = data.user.email;
            if(sidebarUserCredit) sidebarUserCredit.textContent = data.user.credit || 0;
            sidebarImgs.forEach(img => img.src = imgSrc);

            // อัปเดต Header Dropdown
            dropdownNames.forEach(el => el.textContent = fullName);
            dropdownEmails.forEach(el => el.textContent = data.user.email);
            dropdownImgs.forEach(img => img.src = imgSrc);
            if(headerProfileBtnImg) headerProfileBtnImg.src = imgSrc;

        } else {
            // === ยังไม่ล็อกอิน (Guest) ===
            document.body.classList.remove('is-logged-in');
            
            // รีเซ็ตค่าเป็น Default
            if(sidebarUserName) sidebarUserName.textContent = 'ยินดีต้อนรับ';
            if(sidebarUserEmail) sidebarUserEmail.textContent = 'กรุณาเข้าสู่ระบบ';
        }

        return data.user; // ส่งข้อมูลกลับเผื่อไฟล์อื่นจะใช้

    } catch (error) {
        console.error('Global Loader Error:', error);
        document.body.classList.remove('is-logged-in');
    }
}

// สั่งให้ทำงานทันทีเมื่อโหลดหน้าเว็บ
document.addEventListener('DOMContentLoaded', loadGlobalUserData);