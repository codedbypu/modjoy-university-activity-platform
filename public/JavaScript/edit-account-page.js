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
        const userProfileUrl = "/Resource/img/profile.jpg"; 

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

document.addEventListener("DOMContentLoaded", function() {
    // (Database) ใช้สำหรับ "แนะนำ" (Suggest) เท่านั้น
    const availableTags = [
        "อ่านหนังสือ", "Calculus", "ติวฟรี", "เล่นเกม", 
        "ดูหนัง", "ฟังเพลง", "Physics", "Art", "Coding"
    ];
    const MAX_TAGS = 3;
    let currentTags = [];

    // --- 2. หาองค์ประกอบ HTML (เหมือนเดิม) ---
    const tagInput = document.getElementById('user-tag-input');
    const addTagBtn = document.getElementById('add-tag-btn');
    const tagListContainer = document.getElementById('tag-list-display');
    const hiddenInput = document.getElementById('tags-list-hidden');
    const suggestionsContainer = document.getElementById('tag-suggestions');

    // --- 3. ฟังก์ชันหลัก (Core Functions) ---

    // (ฟังก์ชัน renderTags และ removeTag เหมือนเดิม 100%)
    function renderTags() {
        tagListContainer.innerHTML = '';
        currentTags.forEach(tagText => {
            const li = document.createElement('li');
            li.textContent = tagText;
            const deleteBtn = document.createElement('button');
            deleteBtn.type = "button";
            deleteBtn.className = "material-symbols-outlined";
            deleteBtn.textContent = 'close';
            deleteBtn.addEventListener('click', () => removeTag(tagText));
            li.appendChild(deleteBtn);
            tagListContainer.appendChild(li);
        });
        hiddenInput.value = currentTags.join(',');

        if (currentTags.length >= MAX_TAGS) {
            tagInput.disabled = true;
            addTagBtn.disabled = true;
            tagInput.placeholder = "เพิ่มแท็กได้สูงสุด " + MAX_TAGS + " อัน";
        } else {
            tagInput.disabled = false;
            addTagBtn.disabled = false;
            tagInput.placeholder = "พิมพ์เพื่อค้นหา หรือเพิ่มแท็กใหม่...";
        }
    }
    
    function removeTag(tagText) {
        currentTags = currentTags.filter(tag => tag !== tagText);
        renderTags();
    }

    function addTag(tagText) {
        const cleanTag = tagText.trim();
        
        // 1. (Validation) เช็คว่าว่างเปล่าหรือไม่
        if (cleanTag === "") {
            return; // ไม่ทำอะไรเลย
        }
        
        // 2. (Validation) เช็คว่าซ้ำหรือไม่
        // (เราเปลี่ยนเป็น .toLowerCase() เพื่อกัน "Cal" กับ "cal")
        const lowerCaseTag = cleanTag.toLowerCase();
        const existingTagsLower = currentTags.map(t => t.toLowerCase());
        
        if (existingTagsLower.includes(lowerCaseTag)) {
            alert("คุณเพิ่มแท็กนี้ไปแล้ว");
            tagInput.value = '';
            hideSuggestions();
            return;
        }

        /* 3. (Validation ที่ถูก "ลบ") 
           เราไม่เช็ค !availableTags.includes(cleanTag) อีกต่อไป
           เพื่อให้ผู้ใช้ "เพิ่มแท็กใหม่" ได้
        */
        
        // 4. (Validation) เช็คลิมิต 3 แท็ก (เหมือนเดิม)
        if (currentTags.length < MAX_TAGS) {
            currentTags.push(cleanTag); // (เพิ่มแท็กใหม่เข้าไปเลย)
            renderTags(); // อัปเดตหน้าจอ
        }
        
        // 5. (เหมือนเดิม) เคลียร์ช่องพิมพ์
        tagInput.value = '';
        hideSuggestions();
    }
    // ===============================================


    // (ฟังก์ชัน showSuggestions และ hideSuggestions เหมือนเดิม 100%)
    function showSuggestions(filteredList) {
        suggestionsContainer.innerHTML = '';
        if (filteredList.length === 0) {
            hideSuggestions();
            return;
        }

        filteredList.forEach(tagText => {
            const item = document.createElement('div');
            item.className = 'suggestion-item';
            item.textContent = tagText;
            
            // (ตรรกะ "คลิก = เติมข้อความ" เหมือนเดิม)
            item.addEventListener('click', function() {
                tagInput.value = tagText;
                hideSuggestions();
                tagInput.focus();
            });
            
            suggestionsContainer.appendChild(item);
        });
        
        suggestionsContainer.style.display = 'block';
    }

    function hideSuggestions() {
        suggestionsContainer.style.display = 'none';
    }


    // --- 4. เชื่อมต่อ Events (เหมือนเดิม) ---

    // (Event) เมื่อ "พิมพ์"
    tagInput.addEventListener('keyup', function() {
        const query = tagInput.value.toLowerCase();
        if (query.length === 0) {
            hideSuggestions();
            return;
        }
        const filtered = availableTags.filter(tag => 
            tag.toLowerCase().includes(query) && 
            !currentTags.map(t => t.toLowerCase()).includes(tag.toLowerCase())
        );
        showSuggestions(filtered);
    });

    // (Event) เมื่อ "คลิก" ปุ่ม +
    addTagBtn.addEventListener('click', function() {
        addTag(tagInput.value);
    });

    // (Event) เมื่อกด "Enter"
    tagInput.addEventListener('keydown', function(event) {
        if (event.key === 'Enter') {
            event.preventDefault(); 
            addTag(tagInput.value);
        }
    });

    // (Event) คลิกที่อื่น (เหมือนเดิม)
    document.addEventListener('click', function(event) {
        if (!event.target.closest('.tag-input-container')) {
            hideSuggestions();
        }
    });
    
    // --- 5. สั่งให้ทำงานครั้งแรก ---
    renderTags();
});