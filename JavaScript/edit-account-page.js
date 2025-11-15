// รอให้หน้าเว็บโหลดเสร็จก่อน
document.addEventListener("DOMContentLoaded", function() {

    // --- 1. หาองค์ประกอบทั้งหมดที่ต้องใช้ ---
    const imageContainer = document.getElementById('profile-image-container');
    const imagePreview = document.getElementById('profile-image-preview');
    const fileInput = document.getElementById('cover-image-input');
    
    
    // --- 2. ฟังก์ชันสำหรับอัปเดต UI (หัวใจหลัก) ---
    function updateImagePreview(imageUrl) {
        if (imageUrl && imageUrl !== "") {
            // ถ้ามี URL รูปภาพ
            imagePreview.src = imageUrl;
            imageContainer.classList.add('has-image');
        } else {
            // ถ้าไม่มี URL รูปภาพ (เป็นค่าว่าง)
            imagePreview.src = "";
            imageContainer.classList.remove('has-image');
        }
    }


    // --- 3. (สำหรับหน้า Edit) โหลดข้อมูลผู้ใช้ครั้งแรก ---
    // (นี่คือส่วนที่คุณต้องไปดึงข้อมูลจาก Database จริง)
    function loadInitialData() {
        // (ตัวอย่างข้อมูลสมมติ)
        // ถ้าผู้ใช้มีรูปอยู่แล้ว ให้ใส่ URL
        const userProfileUrl = ""; 

        updateImagePreview(userProfileUrl);
    }
    
    // สั่งให้โหลดข้อมูล 1 ครั้งตอนเปิดหน้า
    loadInitialData();


    // --- 4. เมื่อผู้ใช้ "เลือกไฟล์ใหม่" ---
    fileInput.addEventListener('change', function(event) {
        const file = event.target.files[0];
        
        if (file) {
            // ถ้าผู้ใช้เลือกไฟล์
            const reader = new FileReader();
            
            reader.onload = function(e) {
                // e.target.result คือ URL (base64) ของรูปที่เพิ่งเลือก
                updateImagePreview(e.target.result);
            };
            
            // อ่านไฟล์ที่ผู้ใช้เลือก
            reader.readAsDataURL(file);
        }
    });

});