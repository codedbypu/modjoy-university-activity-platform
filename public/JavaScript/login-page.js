// #region กดปุ่มล็อกอิน
const notifiText = document.getElementById('notifi-text');
document.querySelector('.login-form').addEventListener('submit', async function (e) {
    e.preventDefault();

    notifiText.classList.remove('show');
    notifiText.textContent = '';

    // ดึงข้อมูลจากฟอร์ม
    const formData = new FormData(this);
    const data = Object.fromEntries(formData.entries());

    // #region Validation ตรวจสอบ Email KMUTT 
    const kmuttEmailRegex = /^[a-zA-Z0-9._%+-]+@(mail\.)?kmutt\.ac\.th$/i;
    if (!kmuttEmailRegex.test(data.email)) {
        showError('กรุณาใช้อีเมลสถาบัน kmutt.ac.th หรือ mail.kmutt.ac.th');
        return;
    }
    // #endregion

    // #region Sending Zone (เริ่มส่ง) 
    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        const result = await response.json();

        if (result.success) {
            window.location.href = '/home-page.html';
        } else {
            showError(result.message);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('เกิดข้อผิดพลาดในการเชื่อมต่อ');
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