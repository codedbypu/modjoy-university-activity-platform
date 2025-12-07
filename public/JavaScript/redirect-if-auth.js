(async function checkAlreadyLoggedIn() {
    try {
        const response = await fetch('/api/me');
        const result = await response.json();

        // ถ้าล็อกอินอยู่แล้ว (loggedIn = true) ให้ดีดไปหน้า Home ทันที
        if (result.loggedIn) {
            window.location.href = '/home-page.html';
        }
    } catch (error) {
        console.error('Check Auth Error:', error);
    }
})();