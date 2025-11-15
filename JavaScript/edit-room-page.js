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

document.addEventListener("DOMContentLoaded", function() {
    // (Database) ใช้สำหรับ "แนะนำ" (Suggest) เท่านั้น
    const availableTags = [
        "อ่านหนังสือ", "Calculus", "ติวฟรี", "เล่นเกม", 
        "ดูหนัง", "ฟังเพลง", "Physics", "Art", "Coding"
    ];
    const MAX_TAGS = 5;
    let currentTags = [];

    // --- 2. หาองค์ประกอบ HTML (เหมือนเดิม) ---
    const tagInput = document.getElementById('room-tag-input');
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