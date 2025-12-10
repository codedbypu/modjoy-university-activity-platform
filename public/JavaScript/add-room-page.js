document.addEventListener("DOMContentLoaded", function () {
    // #region ======== ป้องกันการกด Enter เพื่อ submit form ==========
    document.querySelector('.add-room-form').addEventListener('keydown', function (e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            return false;
        }
    });
    // #endregion ======== ป้องกันการกด Enter เพื่อ submit form ==========

    // #region ======== Custom Select สำหรับที่อยู่ (Address) ========== 
    // #region init ตัวแปร หาองค์ประกอบ 
    const addressDisplayInput = document.getElementById("address-input-display");
    const addressHiddenInput = document.getElementById("address-input-hidden");
    const addressOptionsList = document.getElementById("places-listbox");
    let availableAddresses = [];

    // ฟังก์ชันดึงสถานที่จาก Server
    async function fetchLocations() {
        try {
            const res = await fetch('/api/locations');
            const locations = await res.json();
            availableAddresses = locations;
            renderAddressesOption();
        } catch (error) {
            console.error("Error fetching locations:", error);
        }
    }
    fetchLocations(); // เรียกทำงานทันที
    // #endregion

    // #region renderAddressesOption 
    function renderAddressesOption() {
        addressOptionsList.innerHTML = '';

        availableAddresses.forEach(loc => {
            const option = document.createElement('div');
            option.className = 'custom-option';
            option.setAttribute('role', "option")
            option.setAttribute('data-value', loc.LOCATION_ID);
            option.textContent = loc.LOCATION_NAME;

            // #region เมื่อคลิก เลือก Option
            option.addEventListener("click", function () {
                addressDisplayInput.value = this.textContent;       // โชว์ชื่อ
                addressHiddenInput.value = this.getAttribute("data-value"); // เก็บ ID
                addressOptionsList.classList.remove("show");
            });
            addressOptionsList.appendChild(option);
            // #endregion
        });
    }
    // #endregion

    // #region เมื่อ "พิมพ์" ในช่องค้นหา ให้กรอง 
    addressDisplayInput.addEventListener("keyup", function () {
        const filterValue = addressDisplayInput.value.toLowerCase();
        addressOptionsList.classList.add("show");

        const currentOptions = addressOptionsList.querySelectorAll('.custom-option');
        currentOptions.forEach(option => {
            const text = option.textContent.toLowerCase();
            if (text.includes(filterValue)) {
                option.style.display = "block";
            } else {
                option.style.display = "none";
            }
        });
    });
    // #endregion

    // #region เมื่อคลิกที่ช่องค้นหาให้ "เปิด/ปิด" list 
    addressDisplayInput.addEventListener("click", function (e) {
        e.stopPropagation();
        addressOptionsList.classList.toggle("show");

        // เมื่อคลิกเปิด ให้แสดงตัวเลือกทั้งหมด
        const currentOptions = addressOptionsList.querySelectorAll('.custom-option');
        currentOptions.forEach(option => {
            option.style.display = "block";
        });
    });
    // #endregion

    // #region เมื่อคลิก ที่อื่นบนหน้าจอให้ "ปิด" list 
    document.addEventListener("click", function () {
        if (addressOptionsList.classList.contains("show")) {
            addressOptionsList.classList.remove("show");
        }
    });
    // #endregion
    // #endregion ========== Custom Select สำหรับที่อยู่ (Address) ==========

    // #region ======== Tag Input สำหรับแท็กห้อง (Room Tags) ========== 
    // #region init ตัวแปร หาองค์ประกอบ
    let availableTags = [];
    const MAX_TAGS = 5;
    let currentTags = [];

    const tagInput = document.getElementById('room-tag-input');
    const addTagBtn = document.getElementById('add-tag-btn');
    const tagListContainer = document.getElementById('tag-list-display');
    const hiddenInput = document.getElementById('tags-list-hidden');
    const suggestionsContainer = document.getElementById('tag-suggestions');
    // #endregion

    // #region ----- ฟังก์ชันหลัก (Core Functions) ----- 
    // #region ฟังก์ชันดึง Tag ทั้งหมดจาก Server มาใส่ใน Suggestion
    async function fetchAllTags() {
        try {
            const res = await fetch('/api/tags');
            const tags = await res.json();
            availableTags = tags;
        } catch (error) {
            console.error("Error fetching tags:", error);
        }
    }
    fetchAllTags(); // เรียกทำงานทันที
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
            suggestionsContainer.style.display = 'none';
            return;
        }

        // เช็คลิมิตของแท็ก
        if (currentTags.length < MAX_TAGS) {
            currentTags.push(cleanTag);
            renderTags();
        }

        tagInput.value = '';
        suggestionsContainer.style.display = 'none';
    }
    // #endregion

    // #region ฟังก์ชัน showSuggestions 
    function showSuggestions(filteredList) {
        suggestionsContainer.innerHTML = '';
        if (filteredList.length === 0) {
            suggestionsContainer.style.display = 'none';
            return;
        }

        filteredList.forEach(tagText => {
            const item = document.createElement('div');
            item.className = 'suggestion-item';
            item.textContent = tagText;

            item.addEventListener('click', function () {
                tagInput.value = tagText;
                suggestionsContainer.style.display = 'none';
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
            suggestionsContainer.style.display = 'none';
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
            suggestionsContainer.style.display = 'none';
        }
    });
    // #endregion
    // #endregion ----- EventListeners -----

    // --- สั่งให้ทำงานครั้งแรก ---
    renderTags();
    // #endregion ----- จบ Tag Input สำหรับแท็กห้อง (Room Tags) -----

    // #region ======== Profile Image Uploader ==========
    // #region init ตัวแปร หาองค์ประกอบ 
    const imageContainer = document.getElementById('room-image-container');
    const imagePreview = document.getElementById('room-image-preview');
    const fileInput = document.getElementById('room-image-input');
    // #endregion

    // #region updateImagePreview ฟังก์ชันสำหรับอัปเดต UI --- 
    function updateImagePreview(imageUrl) {
        if (imageUrl && imageUrl !== "") {
            imagePreview.src = imageUrl;
            imageContainer.classList.add('has-image');
        } else {
            imagePreview.src = "/Resource/img/bangmod.png";
            imageContainer.classList.remove('has-image');
        }
    }
    // #endregion

    // #region เมื่อผู้ใช้ "เลือกไฟล์ใหม่"
    if (fileInput) {
        fileInput.addEventListener('change', function (event) {
            const file = event.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function (e) {
                    updateImagePreview(e.target.result);
                };
                reader.readAsDataURL(file);
            }
        });
    }

    // #endregion
    // #endregion ======== Profile Image Uploader ==========

    // #region ======== ส่งข้อมูลฟอร์มสร้างห้องกิจกรรม (Submit Form) ==========
    const createForm = document.querySelector('.add-room-form');

    if (createForm) {
        createForm.addEventListener('submit', async function (e) {
            e.preventDefault();

            // --- VALIDATION ZONE (ตรวจสอบความถูกต้อง) ---
            // Tag ต้องมีอย่างน้อย 1 รายการ
            if (currentTags.length === 0) {
                alert('กรุณาเพิ่ม Tag อย่างน้อย 1 รายการ เพื่อให้เพื่อนๆ ค้นหากิจกรรมเจอ');
                return;
            }

            // ตรวจสอบสถานที่ (ต้องมีใน Database)
            const inputLocationName = addressDisplayInput.value.trim();
            const validLocation = availableAddresses.find(loc => loc.LOCATION_NAME === inputLocationName);
            if (!validLocation) {
                alert('กรุณาเลือก "สถานที่" จากรายการที่กำหนดให้เท่านั้น');
                return;
            }
            // ---------------------------------------------

            const submitBtn = createForm.querySelector('button[type="submit"]');
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.innerText = 'กำลังสร้าง...';
            }

            try {
                // มันจะดึงข้อมูลทุกอย่างในฟอร์มมาให้หมด อ้างอิงจาก name attribute และ value
                // เช่น <input name="roomTitle" value="My Room">
                const formData = new FormData(this);
                formData.set('tags', hiddenInput.value); // ใส่ค่าแท็กที่ซ่อนอยู่

                // ส่งไฟล์รูป
                if (fileInput && fileInput.files.length > 0){
                    formData.append('room_image', fileInput.files[0]);
                }
                const response = await fetch('/api/create-room', {
                    method: 'POST',
                    body: formData
                });

                const result = await response.json();
                if (result.success) {
                    alert('สร้างห้องสำเร็จ!');
                    window.location.href = '/home-page.html';
                } else {
                    alert('เกิดข้อผิดพลาด: ' + result.message);
                }
            } catch (error) {
                console.error(error);
                alert('เชื่อมต่อ Server ไม่ได้');
            } finally {
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.innerText = 'ยืนยันการสร้าง';
                }
            }
        });
        // #endregion ======== ส่งข้อมูลฟอร์มสร้างห้องกิจกรรม ==========
    }
});
// #endregion