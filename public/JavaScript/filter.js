// filter.js
import { loadRooms } from './home-room-loader.js';
import { loadMyCreatedRooms } from './created-room-loader.js';
import { loadMyHistoryRooms } from './history-room-loader.js';

document.addEventListener("DOMContentLoaded", function () {
    // 1. ประกาศตัวแปรหลัก
    const filterModal = document.getElementById('filter-modal');
    const openBtn = document.getElementById('filter-open-btn');
    const closeBtn = document.getElementById('filter-close-btn');
    const overlay = document.getElementById('overlay');

    const mainSearchInput = document.getElementById('search-input');
    const mainSearchBtn = document.querySelector('.search-bar .material-symbols-outlined');
    const filterForm = document.getElementById('filter-form');

    let allLocations = [];
    let allTags = [];

    // 2. ฟังก์ชันเปิด/ปิด Modal
    function openFilterModal() {
        if (filterModal) filterModal.classList.add('active');
        if (overlay) overlay.classList.add('active');
    }
    function closeFilterModal() {
        if (filterModal) filterModal.classList.remove('active');
        if (overlay) overlay.classList.remove('active');
    }
    if (openBtn) openBtn.addEventListener('click', openFilterModal);
    if (closeBtn) closeBtn.addEventListener('click', closeFilterModal);
    if (overlay) overlay.addEventListener('click', closeFilterModal);

    // ---------------------------------------------------------
    // ฟังก์ชันช่วย: รวบรวมค่า Filter ทั้งหมด
    // ---------------------------------------------------------
    function getAllFilters() {
        const params = {};

        // 1. ดึงจาก Search Bar ด้านบน
        if (mainSearchInput && mainSearchInput.value.trim() !== "") {
            params['search'] = mainSearchInput.value.trim();
        }

        // 2. ดึงจาก Filter Modal
        if (filterForm) {
            const formData = new FormData(filterForm);
            for (const [key, value] of formData.entries()) {
                if (value.trim() !== "") {
                    let paramName = key;
                    if (key === 'filter_date') paramName = 'date';
                    if (key === 'filter_start_time') paramName = 'start_time';
                    if (key === 'filter_end_time') paramName = 'end_time';
                    if (key === 'roomLocation') paramName = 'locations';
                    if (key === 'selected_tags') paramName = 'tags';

                    params[paramName] = value;
                }
            }
        }
        return params;
    }

    function performSearch() {
        const params = getAllFilters(); // ฟังก์ชันดึงค่าจาก input ของคุณ
        console.log("Performing search with:", params);

        // เช็ค URL ว่าอยู่หน้าไหน
        if (window.location.pathname.includes('created-room')) {
            loadMyCreatedRooms(params);
        } 
        else if (window.location.pathname.includes('history-page')) { // 2. เพิ่มเงื่อนไขนี้
            loadMyHistoryRooms(params);
        } 
        else {
            loadRooms(params);
        }
    }

    // Event Listeners สำหรับ Search Bar ด้านบน
    if (mainSearchBtn) {
        mainSearchBtn.addEventListener('click', performSearch);
    }
    if (mainSearchInput) {
        mainSearchInput.addEventListener('keypress', (event) => {
            if (event.key === 'Enter') {
                performSearch();
            }
        });
    }

    // ---------------------------------------------------------
    // Unified Manager (จัดการ Tag/Location)
    // ---------------------------------------------------------
    function createUnifiedManager(options) {
        const { inputId, containerId, hiddenInputId, dataProvider, btnId } = options;
        const input = document.getElementById(inputId);
        const container = document.getElementById(containerId);
        const hiddenInput = document.getElementById(hiddenInputId);
        const addBtn = document.getElementById(btnId);
        let selectedItems = [];

        function render(filterText = "") {
            if (!container) return;
            container.innerHTML = '';
            if (hiddenInput) hiddenInput.value = selectedItems.join(',');

            // --- ส่วนที่ 1: รายการที่เลือกแล้ว (Selected) ---
            selectedItems.forEach(item => {
                const tagBtn = document.createElement('div');
                tagBtn.className = 'tag active'; // สีส้ม
                tagBtn.textContent = item;

                // กดซ้ำเพื่อ "ลบออก" (Toggle Off)
                tagBtn.addEventListener('click', () => removeItem(item));

                container.appendChild(tagBtn);
            });

            // --- ส่วนที่ 2: รายการแนะนำ (Suggestions) ---
            const allData = dataProvider();
            const lowerFilter = filterText.toLowerCase();
            const suggestions = allData.filter(item => {
                const matchesFilter = item.toLowerCase().includes(lowerFilter);
                const notSelected = !selectedItems.includes(item);
                return matchesFilter && notSelected;
            }).slice(0, 10);

            if (suggestions.length === 0 && selectedItems.length === 0 && filterText !== "") {
                container.innerHTML += '<span style="font-size:12px; color:#999; width:100%;">ไม่พบข้อมูลที่ค้นหา</span>';
            }

            suggestions.forEach(item => {
                const tagBtn = document.createElement('div');
                tagBtn.className = 'tag'; // สีเทา
                tagBtn.textContent = item;

                // กดเพื่อ "เลือก" (Toggle On) - ส่ง item ตรงๆ (ตัวพิมพ์ถูกต้อง)
                tagBtn.addEventListener('click', () => addItem(item));

                container.appendChild(tagBtn);
            });
        }

        // ฟังก์ชัน addItem รองรับ Case Insensitive
        function addItem(name) {
            if (!name) return;
            const cleanName = name.trim();
            if (cleanName === "") return;

            const allData = dataProvider();

            // ค้นหาตัวจริงใน Database แบบไม่สนตัวพิมพ์
            const match = allData.find(item => item.toLowerCase() === cleanName.toLowerCase());

            if (!match) {
                alert(`ไม่พบ "${cleanName}" ในระบบ`);
                return;
            }

            if (!selectedItems.includes(match)) {
                selectedItems.push(match);
                input.value = '';
                render("");
                input.focus();
            }
        }

        function removeItem(name) {
            selectedItems = selectedItems.filter(i => i !== name);
            render(input.value);
        }

        function clearAll() {
            selectedItems = [];
            if (input) input.value = '';
            render("");
        }

        if (input) {
            // 1. กัน Form Submit ตอนกด Enter (ใช้ keydown)
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                }
            });

            // 2. ตอนพิมพ์ (keyup) ให้กรองแถบแนะนำอย่างเดียว ไม่ Add Item
            input.addEventListener('keyup', (e) => {
                if (e.key === 'Enter') {
                    // ❌ ตัด addItem(input.value) ออกตามที่ขอ
                    return;
                } else {
                    render(input.value);
                }
            });

            input.addEventListener('focus', () => render(input.value));

            // ปุ่ม + เท่านั้นที่เรียก addItem
            if (addBtn) addBtn.addEventListener('click', () => addItem(input.value));
        }
        return { render, clearAll };
    }

    let locManager, tagManager;

    // --- Fetch Data & Init ---
    async function initData() {
        try {
            const [locRes, tagRes] = await Promise.all([
                fetch('/api/locations'),
                fetch('/api/tags')
            ]);
            const locData = await locRes.json();
            allLocations = locData.map(l => l.LOCATION_NAME);
            allTags = await tagRes.json();

            // Init Managers
            locManager = createUnifiedManager({
                inputId: 'filter-location-input',
                containerId: 'location-suggestion-container',
                hiddenInputId: 'filter-locations-hidden',
                btnId: 'filter-add-location-btn',
                dataProvider: () => allLocations
            });

            tagManager = createUnifiedManager({
                inputId: 'filter-tag-search',
                containerId: 'filter-tag-suggestions',
                hiddenInputId: 'selected-tags-hidden',
                btnId: 'filter-add-tag-btn',
                dataProvider: () => allTags
            });

            locManager.render("");
            tagManager.render("");

        } catch (err) {
            console.error("Error loading filter data", err);
        }
    }
    initData();

    // Submit Filter Form
    if (filterForm) {
        filterForm.addEventListener('submit', (e) => {
            e.preventDefault();
            performSearch();
            closeFilterModal();
        });
    }

    // Clear Button
    const clearBtn = document.querySelector('.filter-clear-btn');
    if (clearBtn) {
        clearBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (filterForm) filterForm.reset();
            if (locManager) locManager.clearAll();
            if (tagManager) tagManager.clearAll();
            if (mainSearchInput) mainSearchInput.value = '';

            performSearch();
            closeFilterModal();
        });
    }
});