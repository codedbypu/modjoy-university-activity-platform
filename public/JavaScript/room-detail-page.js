document.addEventListener("DOMContentLoaded", function () {
    // #region initialize elements
    const Check_In_Container = document.getElementById('check-in-container');
    const joinBox = document.getElementById('join-box');
    const checkInForm = document.getElementById('check-in-form');
    const checkedInMessage = document.getElementById('checked-in-message');
    // #endregion

    // #region initialize buttons
    const joinButton = document.getElementById('join-btn');
    const manageCheckInButton = document.getElementById('manage-check-in-btn');
    // #endregion

    // #region check owner room
    const ownerRoom = true;
    if (ownerRoom) {
        joinButton.style.display = 'none';
        manageCheckInButton.style.display = 'flex';
    } else {
        joinButton.style.display = 'inline-block';
        manageCheckInButton.style.display = 'none';
    }
    // #endregion

    // #region event listeners ปุ่ม "เข้าร่วม"
    if (joinButton) {
        joinButton.addEventListener('click', function () {
            // fetch('/join-room', { ... });

            // --- สลับหน้าจอ (State 0 -> State 1) ---
            joinBox.style.display = 'none';

            Check_In_Container.style.display = 'block';
            checkInForm.style.display = 'flex';
        });
    }
    // #endregion

    // #region event listeners ปุ่ม "ยืนยันรหัสเช็คชื่อ"
    if (checkInForm) {
        checkInForm.addEventListener('submit', function (event) {
            event.preventDefault();
            
            // (อนาคต: คุณต้องส่งรหัสไปตรวจสอบที่เซิร์ฟเวอร์ที่นี่)
            // const code = checkInForm.querySelector('.check-in-input').value;
            // fetch('/submit-check-in-code', { ... });

            // --- สลับหน้าจอ (State 1 -> State 2) ---
            checkInForm.style.display = 'none';

            checkedInMessage.style.display = 'flex';
        });
    }
    // #endregion

});