// รอให้หน้าเว็บโหลดเสร็จก่อน
document.addEventListener("DOMContentLoaded", function () {

    // 1. หาองค์ประกอบทั้งหมดที่เราต้องใช้
    const container = document.querySelector(".custom-select-container");
    const displayInput = document.getElementById("address-input-display");
    const hiddenInput = document.getElementById("address-input-hidden");
    const optionsList = document.querySelector(".custom-options-list");
    const allOptions = optionsList.querySelectorAll(".custom-option");

    // 2. เมื่อ "พิมพ์" ในช่องค้นหา (Keyup) -> ให้ "กรอง" (Filter)
    displayInput.addEventListener("keyup", function () {
        const filterValue = displayInput.value.toLowerCase();
        optionsList.classList.add("show"); // เปิด list ตอนพิมพ์

        allOptions.forEach(option => {
            const text = option.textContent.toLowerCase();
            if (text.includes(filterValue)) {
                option.style.display = "block"; // ถ้าตรง ให้แสดง
            } else {
                option.style.display = "none"; // ถ้าไม่ตรง ให้ซ่อน
            }
        });
    });

    // 3. เมื่อ "คลิก" ที่ช่องค้นหา -> ให้ "เปิด/ปิด" list
    displayInput.addEventListener("click", function (e) {
        e.stopPropagation(); // หยุดไม่ให้ event ลามไปถึง document
        optionsList.classList.toggle("show");
        // เมื่อคลิกเปิด ให้แสดงตัวเลือกทั้งหมด
        allOptions.forEach(option => {
            option.style.display = "block";
        });
    });

    // 4. เมื่อ "คลิก" เลือกตัวเลือก (Option)
    allOptions.forEach(option => {
        option.addEventListener("click", function () {
            const value = this.getAttribute("data-value");
            const text = this.textContent;

            // 4.1. อัปเดตค่าในช่องแสดงผล (ให้ผู้ใช้เห็น)
            displayInput.value = text;

            // 4.2. อัปเดตค่าใน input ที่ซ่อนไว้ (สำหรับส่ง Form)
            hiddenInput.value = value;

            // 4.3. ปิด List
            optionsList.classList.remove("show");
        });
    });

    // 5. เมื่อ "คลิก" ที่อื่นบนหน้าจอ -> ให้ "ปิด" list
    document.addEventListener("click", function () {
        if (optionsList.classList.contains("show")) {
            optionsList.classList.remove("show");
        }
    });
});