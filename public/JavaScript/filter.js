document.addEventListener("DOMContentLoaded", function() {

    // --- 1. หาองค์ประกอบหลัก (Modal, Overlay, Buttons) ---
    const filterModal = document.getElementById('filter-modal');
    const overlay = document.getElementById('overlay');
    const openBtn = document.getElementById('filter-open-btn');
    const closeBtn = document.getElementById('filter-close-btn');
    const filterForm = document.getElementById('filter-form');
    
    // (ป้องกันกรณีไม่มีองค์ประกอบเหล่านี้ในหน้าอื่น)
    if (!filterModal || !overlay || !openBtn || !closeBtn || !filterForm) {
        return;
    }

    // --- 2. ฟังก์ชัน เปิด/ปิด Modal ---
    function openFilterModal() {
        filterModal.classList.add('active');
        overlay.classList.add('active');
        // (คำสั่งหยุดเลื่อน body)
        document.body.classList.add('sidebar-is-open'); 
    }

    function closeFilterModal() {
        filterModal.classList.remove('active');
        overlay.classList.remove('active');
        document.body.classList.remove('sidebar-is-open');
    }

    // --- 3. สั่งให้ปุ่มทำงาน ---
    openBtn.addEventListener('click', openFilterModal);
    closeBtn.addEventListener('click', closeFilterModal);
    
    // (เราต้องเช็คว่า Overlay ที่คลิก ไม่ได้เป็นการเปิด Sidebar)
    overlay.addEventListener('click', function() {
        // ปิด Filter เฉพาะตอนที่มันเปิดอยู่เท่านั้น
        if (filterModal.classList.contains('active')) {
            closeFilterModal();
        }
    });

    // --- 4. ตรรกะการ "เลือก Tag" (Toggle) ---
    const allTagButtons = document.querySelectorAll('.filter-tag-cloud .tag');
    allTagButtons.forEach(button => {
        button.addEventListener('click', () => {
            button.classList.toggle('active');
        });
    });

    // --- 5. (ขั้นสูง) ตรรกะ "ค้นหา Tag/สถานที่" ---
    function setupTagSearch(inputId, cloudId) {
        const searchInput = document.getElementById(inputId);
        const tagCloud = document.getElementById(cloudId);
        if (!searchInput || !tagCloud) return;

        searchInput.addEventListener('keyup', function() {
            const filterValue = searchInput.value.toLowerCase();
            const tags = tagCloud.querySelectorAll('.tag');
            
            tags.forEach(tag => {
                const text = tag.textContent.toLowerCase();
                if (text.includes(filterValue)) {
                    tag.style.display = 'inline-block'; // ถ้าตรง ให้แสดง
                } else {
                    tag.style.display = 'none'; // ถ้าไม่ตรง ให้ซ่อน
                }
            });
        });
    }
    // สั่งให้ช่องค้นหา 2 ช่องทำงาน
    setupTagSearch('filter-location-search', 'location-tag-cloud');
    setupTagSearch('filter-tag-search', 'tag-tag-cloud');


    // --- 6. ตรรกะการ "ส่งฟอร์ม" (Submit) ---
    filterForm.addEventListener('submit', function(event) {
        // 6.1. หยุดการส่งฟอร์มแบบดั้งเดิม
        event.preventDefault(); 

        // 6.2. รวบรวม "Tag ที่ถูกเลือก"
        const selectedLocations = [];
        document.querySelectorAll('#location-tag-cloud .tag.active').forEach(tag => {
            selectedLocations.push(tag.dataset.value);
        });
        
        const selectedTags = [];
        document.querySelectorAll('#tag-tag-cloud .tag.active').forEach(tag => {
            selectedTags.push(tag.dataset.value);
        });

        // 6.3. อัปเดตค่าใน Hidden Input
        document.getElementById('selected-locations').value = selectedLocations.join(',');
        document.getElementById('selected-tags').value = selectedTags.join(',');

        // 6.4. รวบรวมข้อมูลฟอร์มทั้งหมด (ตอนนี้มี hidden inputs แล้ว)
        const formData = new FormData(filterForm);

        // (ตัวอย่าง) พิมพ์ข้อมูลทั้งหมดออกมาดูใน Console
        console.log("----- Filter Data -----");
        for (let [key, value] of formData.entries()) {
            console.log(`${key}: ${value}`);
        }

        // 6.5. ปิด Modal
        closeFilterModal();

        // 6.6. (ในอนาคต) ส่ง formData นี้ไปที่เซิร์ฟเวอร์ด้วย fetch()
        // fetch('/search-filter', { method: 'POST', body: formData })
        //   .then(response => response.json())
        //   .then(data => {
        //       console.log('Search results:', data);
        //       // (อัปเดตหน้า .rooms-List ด้วยข้อมูลใหม่)
        //   });
    });

});