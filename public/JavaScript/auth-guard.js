// #region ตรวจสอบถ้าล็อกอินอยู่แล้วให้ดีดไปหน้า Home
(async function checkAlreadyLoggedIn() {
    try {
        // ยิงเช็ค Session ที่ Server
        const response = await fetch('/api/me');
        const result = await response.json();

        // ถ้าไม่ได้ล็อกอิน (loggedIn = false)
        if (!result.loggedIn) {
            alert('กรุณาเข้าสู่ระบบเพื่อใช้งานหน้านี้'); // (ลบออกได้ถ้าไม่อยากให้เด้งเตือน)
            window.location.href = '/home-page.html'; // ดีดกลับหน้า Home
        }
    } catch (error) {
        console.error('Auth Guard Error:', error);
        window.location.href = '/home-page.html'; // ถ้า Error ก็ดีดกลับกันเหนียว
    }
})();
// #endregion