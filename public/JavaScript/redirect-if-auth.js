// #region ตรวจสอบถ้าล็อกอินอยู่แล้วให้ดีดไปหน้า Home
(async function checkAlreadyLoggedIn() {
    try {
        const response = await fetch('/api/me');
        const result = await response.json();

        if (result.loggedIn) window.location.href = '/home-page.html';
    } catch (error) {
        console.error('Check Auth Error:', error);
    }
})();
// #endregion