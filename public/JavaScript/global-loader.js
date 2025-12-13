async function loadGlobalUserData() {
    try {
        const response = await fetch('/api/me');
        const data = await response.json();

        // --- Elements ทั่วไป (Sidebar & Header) ---
        const sidebarUserName = document.getElementById('sidebar-user-name');
        const sidebarUserEmail = document.getElementById('sidebar-user-email');
        const sidebarUserCredit = document.getElementById('sidebar-user-credit');
        const sidebarImgs = document.querySelectorAll('.sidebar-profile-img img');

        // Header Dropdown
        const dropdownNames = document.querySelectorAll('.user-name'); // ใช้ class เพราะมีหลายที่
        const dropdownEmails = document.querySelectorAll('.user-email');
        const dropdownImgs = document.querySelectorAll('.my-profile-image, .profile-large-image');

        // --- Elements เฉพาะหน้า "บัญชีของฉัน" (My Account Page) ---
        const myAccountName = document.getElementById('user-name'); // ชื่อใหญ่ๆ
        const myAccountEmail = document.getElementById('user-email');
        const myAccountEducation = document.getElementById('user-education'); // คณะ/ปี
        const myAccountAbout = document.getElementById('user-about-detail'); // เกี่ยวกับฉัน
        const myAccountCredit = document.querySelectorAll('#user-credit'); // เครดิต

        const myAccountTagsContainer = document.getElementById('user-tags-list');

        if (data.loggedIn && data.user) {
            document.body.classList.add('is-logged-in');

            const u = data.user;
            const fullName = `${u.fullname} ${u.lastname}`;
            const firstName = `${u.fullname}`;
            const imgSrc = u.profile_image || '/Resource/img/profile.png';

            // 1. อัปเดต Sidebar & Header
            if (sidebarUserName) sidebarUserName.textContent = firstName;
            if (sidebarUserEmail) sidebarUserEmail.textContent = u.email;
            if (sidebarUserCredit) sidebarUserCredit.textContent = u.credit;
            sidebarImgs.forEach(img => img.src = imgSrc);

            // 2. อัปเดต Dropdown
            dropdownNames.forEach(el => el.textContent = fullName);
            dropdownEmails.forEach(el => el.textContent = u.email);
            dropdownImgs.forEach(img => img.src = imgSrc);

            // 3. อัปเดตหน้า "บัญชีของฉัน" (ถ้ามี Element เหล่านี้อยู่)
            if (myAccountName) myAccountName.textContent = fullName;
            if (myAccountEmail) myAccountEmail.textContent = u.email;
            if (myAccountEducation) {
                // ตัวอย่าง: "คณะวิศวกรรมศาสตร์ ระดับชั้นปีที่ 3"
                myAccountEducation.textContent = `คณะ${u.faculty} ระดับชั้นปีที่ ${u.year}`;
            }
            if (myAccountAbout) {
                myAccountAbout.textContent = u.about || "ไม่มีข้อมูลเพิ่มเติม";
            }
            // อัปเดตเครดิตในหน้า My Account (มันมี ID ซ้ำกันใน HTML ใช้ querySelectorAll ช่วย)
            myAccountCredit.forEach(el => el.textContent = u.credit);

            if (myAccountTagsContainer) {
                myAccountTagsContainer.innerHTML = '';

                if (data.user.tags && data.user.tags.length > 0) {
                    data.user.tags.forEach(tag => {
                        const li = document.createElement('li');
                        li.textContent = tag;
                        myAccountTagsContainer.appendChild(li);
                    });
                } else {
                    myAccountTagsContainer.innerHTML = '<li style="color:#999; font-size:14px; border: none;">ไม่มีแท็กความสนใจ</li>';
                }
            }

        } else {
            document.body.classList.remove('is-logged-in');
        }
        return data.user; // ส่งข้อมูลกลับไปเผื่อไฟล์อื่นใช้ต่อ

    } catch (error) {
        console.error('Global Loader Error:', error);
    }
}

document.addEventListener('DOMContentLoaded', loadGlobalUserData);