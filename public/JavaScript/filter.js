document.addEventListener("DOMContentLoaded", function () {
    // #region init ตัวแปร 
    const filterModal = document.getElementById('filter-modal');
    const overlay = document.getElementById('overlay');
    const openBtn = document.getElementById('filter-open-btn');
    const closeBtn = document.getElementById('filter-close-btn');
    const filterForm = document.getElementById('filter-form');
    if (!filterModal || !overlay || !openBtn || !closeBtn || !filterForm) return;
    // #endregion    

    // #region ฟังก์ชัน เปิด/ปิด Modal 
    function openFilterModal() {
        filterModal.classList.add('active');
        overlay.classList.add('active');
    }
    function closeFilterModal() {
        filterModal.classList.remove('active');
        overlay.classList.remove('active');
    }
    // #endregion

    // #region สั่งให้ปุ่มทำงาน 
    openBtn.addEventListener('click', openFilterModal);
    closeBtn.addEventListener('click', closeFilterModal);

    overlay.addEventListener('click', function () {
        if (filterModal.classList.contains('active'))
            closeFilterModal();
    });
    // #endregion 

    // #region Logic "เลือก Tag" (Toggle)
    const allTagButtons = document.querySelectorAll('.filter-tag-cloud .tag');
    allTagButtons.forEach(button => {
        button.addEventListener('click', () => {
            button.classList.toggle('active');
        });
    });

    // #region Logic "ค้นหา Tag/สถานที่" 
    function setupTagSearch(inputId, cloudId) {
        const searchInput = document.getElementById(inputId);
        const tagCloud = document.getElementById(cloudId);
        if (!searchInput || !tagCloud) return;

        searchInput.addEventListener('keyup', function () {
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
    // #endregion
    // #endregion

    // #region Logic "ส่งฟอร์ม" (Submit)
    filterForm.addEventListener('submit', function (event) {
        event.preventDefault();

        // รวบรวม "Tag ที่ถูกเลือก"
        const selectedLocations = [];
        document.querySelectorAll('#location-tag-cloud .tag.active').forEach(tag => {
            selectedLocations.push(tag.dataset.value);
        });
        const selectedTags = [];
        document.querySelectorAll('#tag-tag-cloud .tag.active').forEach(tag => {
            selectedTags.push(tag.dataset.value);
        });

        // อัปเดตค่าใน Hidden Input
        document.getElementById('selected-locations').value = selectedLocations.join(',');
        document.getElementById('selected-tags').value = selectedTags.join(',');

        // รวบรวมข้อมูลฟอร์มทั้งหมด (ตอนนี้มี hidden inputs แล้ว)
        const formData = new FormData(filterForm);

        // พิมพ์ข้อมูลทั้งหมดออกมาดูใน Console
        console.log("----- Filter Data -----");
        for (let [key, value] of formData.entries()) {
            console.log(`${key}: ${value}`);
        }

        // ปิด Modal
        closeFilterModal();

        // ส่ง formData นี้ไปที่เซิร์ฟเวอร์ด้วย fetch()
        // fetch('/search-filter', { method: 'POST', body: formData })
        //   .then(response => response.json())
        //   .then(data => {
        //       console.log('Search results:', data);
        //       // (อัปเดตหน้า .rooms-List ด้วยข้อมูลใหม่)
        //   });
    });
    // #endregion
});