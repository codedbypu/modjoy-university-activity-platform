document.addEventListener("DOMContentLoaded", function () {
    // #region loadInitialData โหลดข้อมูลผู้ใช้ครั้งแรก --- 
    async function loadInitialData() {
        try {
            // เรียก API /me โดยตรง (หรือจะรอจาก global-loader ก็ได้ แต่วิธีนี้ชัวร์กว่าสำหรับฟอร์ม)
            const response = await fetch('/api/me');
            const data = await response.json();

            if (data.loggedIn && data.user) {
                const u = data.user;

                // 1. เติมข้อมูลลง Input
                if (document.getElementById('user-fullname'))
                    document.getElementById('user-fullname').value = u.username || '';

                if (document.getElementById('user-lastname'))
                    document.getElementById('user-lastname').value = u.lastname || '';

                if (document.getElementById('user-email'))
                    document.getElementById('user-email').value = u.email || '';

                if (document.getElementById('user-about-detail'))
                    document.getElementById('user-about-detail').value = u.about || '';

                // 2. เติมรูปภาพ
                const userProfileUrl = u.profile_image || "./Resource/img/profile.jpg";
                updateImagePreview(userProfileUrl);

                // 3. เลือก Dropdown คณะ/ปี (ถ้ามี)
                // (ต้องเขียน Logic เพิ่มถ้าใน HTML มี value ที่ตรงกับ DB)
            }
        } catch (error) {
            console.error("Error loading user data:", error);
        }
    }
    // #endregion loadInitialData โหลดข้อมูลผู้ใช้ครั้งแรก ---

    // #region ======== Profile Image Uploader ==========
    // #region init ตัวแปร หาองค์ประกอบ 
    const imageContainer = document.getElementById('profile-image-container');
    const imagePreview = document.getElementById('profile-image-preview');
    const fileInput = document.getElementById('cover-image-input');
    // #endregion

    // #region updateImagePreview ฟังก์ชันสำหรับอัปเดต UI --- 
    function updateImagePreview(imageUrl) {
        if (imageUrl && imageUrl !== "") {
            imagePreview.src = imageUrl;
            imageContainer.classList.add('has-image');
        } else {
            imagePreview.src = "";
            imageContainer.classList.remove('has-image');
        }
    }
    // #endregion

    // เรียกโหลดข้อมูลผู้ใช้ครั้งแรก
    loadInitialData();

    // #region เมื่อผู้ใช้ "เลือกไฟล์ใหม่"
    fileInput.addEventListener('change', function (event) {
        const file = event.target.files[0];

        if (file) {
            const reader = new FileReader();
            reader.onload = function (e) {
                // e.target.result คือ URL ของรูปที่เพิ่งเลือก
                updateImagePreview(e.target.result);
            };

            // อ่านไฟล์ที่ผู้ใช้เลือก
            reader.readAsDataURL(file);
        }
    });
    // #endregion
    // #endregion ======== จบ Profile Image Uploader ==========

    // #region ======== Tag Input สำหรับแท็ก User ========== 
    // #region init ตัวแปร หาองค์ประกอบ
    const availableTags = [
        "อ่านหนังสือ", "Calculus", "ติวฟรี", "เล่นเกม",
        "ดูหนัง", "ฟังเพลง", "Physics", "Art", "Coding"
    ];
    const MAX_TAGS = 3;
    let currentTags = [];
    // #endregion

    // #region หาองค์ประกอบทั้งหมดที่ต้องใช้
    const tagInput = document.getElementById('user-tag-input');
    const addTagBtn = document.getElementById('add-tag-btn');
    const tagListContainer = document.getElementById('tag-list-display');
    const hiddenInput = document.getElementById('tags-list-hidden');
    const suggestionsContainer = document.getElementById('tag-suggestions');
    // #endregion

    // #region ----- ฟังก์ชันหลัก (Core Functions) -----
    // #region ฟังก์ชัน hideSuggestions 
    function hideSuggestions() {
        suggestionsContainer.style.display = 'none';
    }
    // #endregion

    // #region ฟังก์ชัน renderTags 
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
    // #endregion

    // #region ฟังก์ชัน removeTag 
    function removeTag(tagText) {
        currentTags = currentTags.filter(tag => tag !== tagText);
        renderTags();
    }
    // #endregion

    // #region ฟังก์ชัน addTag 
    function addTag(tagText) {
        const cleanTag = tagText.trim();
        if (cleanTag === "") return;

        // เช็คว่าซ้ำหรือไม่
        const lowerCaseTag = cleanTag.toLowerCase();
        const existingTagsLower = currentTags.map(t => t.toLowerCase());
        if (existingTagsLower.includes(lowerCaseTag)) {
            alert("คุณเพิ่มแท็กนี้ไปแล้ว");
            tagInput.value = '';
            hideSuggestions();
            return;
        }

        // เช็คลิมิตของแท็ก
        if (currentTags.length < MAX_TAGS) {
            currentTags.push(cleanTag);
            renderTags();
        }

        tagInput.value = '';
        hideSuggestions();
    }
    // #endregion

    // #region ฟังก์ชัน showSuggestions 
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

            item.addEventListener('click', function () {
                tagInput.value = tagText;
                hideSuggestions();
                tagInput.focus();
            });

            suggestionsContainer.appendChild(item);
        });

        suggestionsContainer.style.display = 'block';
    }
    // #endregion

    // #endregion ----- ฟังก์ชันหลัก (Core Functions) -----

    // #region ----- EventListeners  ----- 
    // #region เมื่อพิมพ์ช่องเพิ่ม Tags 
    tagInput.addEventListener('keyup', function () {
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
    // #endregion

    // #region เมื่อคลิก ปุ่ม + 
    addTagBtn.addEventListener('click', function () {
        addTag(tagInput.value);
    });
    // #endregion

    // #region เมื่อกด "Enter"
    tagInput.addEventListener('keydown', function (event) {
        if (event.key === 'Enter') {
            event.preventDefault();
            addTag(tagInput.value);
        }
    });
    // #endregion

    // #region คลิกที่อื่น
    document.addEventListener('click', function (event) {
        if (!event.target.closest('.tag-input-container')) {
            hideSuggestions();
        }
    });
    // #endregion
    // #endregion ----- EventListeners -----

    // --- สั่งให้ทำงานครั้งแรก ---
    renderTags();

    // #endregion ======== จบ Tag Input สำหรับแท็ก User ==========
});