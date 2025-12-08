// #region initialize elements
const notifiText = document.getElementById('notifi-text');
const submitBtn = document.getElementById('submitBtn');

const loadingScreen = document.getElementById('loading-screen');
const loadingSpinnerBox = document.getElementById('loading-spinner-box');
const successBox = document.getElementById('success-box');
// #endregion

// ฟังก์ชันหน่วงเวลา
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// #region event listener ฟอร์มลงทะเบียน
document.querySelector('.register-form').addEventListener('submit', async function (e) {
    e.preventDefault();

    notifiText.classList.remove('show');
    notifiText.textContent = '';

    // ดึงข้อมูลจากฟอร์ม
    const formData = new FormData(this);
    const data = Object.fromEntries(formData.entries());

    // #region Validation เบื้องต้น
    // ห้ามช่องว่างในชื่อ-นามสกุล
    const nameRegex = /^\S+\s+\S+/;
    if (!nameRegex.test(data.fullname)) {
        showError('กรุณากรอกชื่อและนามสกุลให้ครบถ้วน');
        return;
    }
    // ตรวจสอบ Email KMUTT
    const kmuttEmailRegex = /^[a-zA-Z0-9._%+-]+@(mail\.)?kmutt\.ac\.th$/i;
    if (!kmuttEmailRegex.test(data.email)) {
        showError('กรุณาใช้อีเมลสถาบัน kmutt.ac.th หรือ mail.kmutt.ac.th');
        return;
    }
    // ตรวจสอบรหัสผ่าน
    if (data.password !== data.confirm_password) {
        showError('รหัสผ่านและยืนยันรหัสผ่านไม่ตรงกัน');
        return;
    }
    // ตรวจสอบ Checkbox
    data.allow = document.getElementById('allow').checked;
    if (!data.allow) {
        showError('กรุณายินยอมให้เปิดเผยข้อมูล');
        return;
    }
    // #endregion

    // #region Sending Zone (เริ่มส่ง)
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.value = 'กำลังบันทึก...';
        submitBtn.style.cursor = 'wait';
    }

    try {
        loadingScreen.style.display = 'flex';
        loadingSpinnerBox.style.display = 'flex';
        successBox.style.display = 'none';

        // ลบข้อมูลที่ไม่จำเป็นก่อนส่ง
        delete data.confirm_password;
        delete data.allow;

        // ส่งไป Backend พร้อมกับหน่วงเวลาอย่างน้อย 800ms
        const [response, _] = await Promise.all([
            fetch('/api/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            }),
            delay(800)
        ]);

        const result = await response.json();
        if (result.success) {
            loadingSpinnerBox.style.display = 'none';
            successBox.style.display = 'flex';

            await delay(1000); // รอแสดงผลสำเร็จ 1 วินาที
            window.location.href = '/login-page.html';
        } else {
            if (result.message === 'อีเมลนี้ถูกใช้งานไปแล้ว กรุณาใช้อีเมลอื่น') {
                showError(result.message);
                return;
            }
            alert('Error: ' + result.message); // กรณีอื่นๆ แสดง alert
        }
    } catch (error) {
        console.error('Error:', error);
        alert('เกิดข้อผิดพลาดในการเชื่อมต่อ Server');
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.value = 'ลงทะเบียน';
            submitBtn.style.cursor = 'pointer';
        }
        loadingScreen.style.display = 'none';
    }
    // #endregion
});
// #endregion

// #region ฟังก์ชันแสดงข้อความผิดพลาด
function showError(message) {
    notifiText.classList.remove('shake');
    void notifiText.offsetWidth; // รีสตาร์ทแอนิเมชัน
    notifiText.classList.add('shake');
    notifiText.classList.add('show');
    notifiText.textContent = message;
}
// #endregion