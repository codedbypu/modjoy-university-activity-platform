const notifiText = document.querySelector('#notifi-text');
document.querySelector('.login-form').addEventListener('submit', async function (e) {
    e.preventDefault();

    notifiText.classList.remove('show');
    notifiText.textContent = '';

    const formData = new FormData(this);
    const data = Object.fromEntries(formData.entries());

    // --- Validation Zone (ตรวจสอบข้อมูล) ---
    // ตรวจสอบ Email KMUTT
    const kmuttEmailRegex = /^[a-zA-Z0-9._%+-]+@(mail\.)?kmutt\.ac\.th$/i;
    if (!kmuttEmailRegex.test(data.email)) {
        showError('กรุณาใช้อีเมลสถาบัน kmutt.ac.th หรือ mail.kmutt.ac.th');
        return;
    }

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
});

function showError(message) {
    notifiText.classList.remove('shake');
    void notifiText.offsetWidth;
    notifiText.classList.add('shake');
    notifiText.classList.add('show');
    notifiText.textContent = message;
}