// app.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, collection, addDoc, doc, setDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { auth, db, provider } from './config.js'; // Vẫn giữ config của bạn

// --- CẤU HÌNH CƠ BẢN ---
const allowedTeacherEmails = ['nguyentinh52009@gmail.com', 'nguyentinh011009@gmail.com', 'tomizy09icloud@gmail.com'];
const pageType = document.body.getAttribute('data-page');

// --- CÁC NÚT ĐĂNG NHẬP/ĐĂNG XUẤT ---
const btnLogin = document.getElementById('btnLogin');
const btnLogout = document.getElementById('btnLogout'); // Của học sinh
const btnSidebarLogout = document.getElementById('btnSidebarLogout'); // Của giáo viên

if (btnLogin) btnLogin.addEventListener('click', () => signInWithPopup(auth, provider));
if (btnLogout) btnLogout.addEventListener('click', () => signOut(auth));
if (btnSidebarLogout) btnSidebarLogout.addEventListener('click', () => signOut(auth));

// ==========================================
// 1. KIỂM TRA TRẠNG THÁI ĐĂNG NHẬP (CHẠY CHO CẢ 2 TRANG)
// ==========================================
onAuthStateChanged(auth, (user) => {
    const loginSection = document.getElementById('login-section');
    const appSection = document.getElementById('app-section');

    if (user) {
        // NẾU LÀ TRANG GIÁO VIÊN
        if (pageType === 'teacher') {
            if (allowedTeacherEmails.includes(user.email)) {
                if (loginSection) loginSection.classList.add('hidden');
                if (appSection) appSection.classList.remove('hidden');
                document.getElementById('userEmail').innerText = "Giáo viên: " + user.email;
                
                // GỌI HÀM REAL-TIME ĐỂ TẢI DANH SÁCH HỌC SINH
                loadStudentsRealtime(); 
            } else {
                alert("Bạn không có quyền truy cập trang Giáo viên!");
                signOut(auth);
            }
        } 
        // NẾU LÀ TRANG HỌC SINH
        else if (pageType === 'student') {
            if (loginSection) loginSection.classList.add('hidden');
            if (appSection) appSection.classList.remove('hidden');
            document.getElementById('studentName').innerText = "Xin chào, " + user.displayName;
        }
    } else {
        // CHƯA ĐĂNG NHẬP HOẶC ĐÃ ĐĂNG XUẤT
        if (loginSection) loginSection.classList.remove('hidden');
        if (appSection) appSection.classList.add('hidden');
    }
});

// ==========================================
// 2. LOGIC DÀNH RIÊNG CHO GIÁO VIÊN
// ==========================================
if (pageType === 'teacher') {

    // A. CHUYỂN TAB
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            if(e.target.id === 'btnSidebarLogout') return;
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            e.target.classList.add('active');
            
            const targetId = e.target.getAttribute('data-target');
            if(targetId) document.getElementById(targetId).classList.add('active');
        });
    });

    // B. CHỌN MÔN HỌC
    const subjectSelect = document.getElementById('subject');
    if (subjectSelect) {
        subjectSelect.addEventListener('change', (e) => {
            document.getElementById('otherSubject').classList.toggle('hidden', e.target.value === 'Tiếng Anh');
        });
    }

    // C. THÊM PHẦN (SECTIONS)
    let sectionCount = 0;
    const btnAddSection = document.getElementById('btnAddSection');
    if (btnAddSection) {
        btnAddSection.addEventListener('click', () => {
            sectionCount++;
            const isEng = document.getElementById('subject').value === 'Tiếng Anh';
            const options = isEng 
                ? `<option value="tn">Trắc nghiệm</option><option value="tl">Writing/Rewrite (Tự luận)</option>`
                : `<option value="tn">Trắc nghiệm</option><option value="ds">Đúng - Sai</option><option value="tn_ngan">Trả lời ngắn (4 ký tự)</option><option value="tl">Tự luận</option>`;
            
            const html = `
                <div class="card section-item" style="border-left: 4px solid var(--primary-color);">
                    <h4>Phần ${sectionCount}</h4>
                    <input type="text" class="form-control section-name" placeholder="Tên phần (VD: Phần I)" style="margin: 10px 0;">
                    <select class="form-control section-type" style="margin-bottom: 10px;">${options}</select>
                    <textarea class="form-control raw-text" placeholder="Dán đề thô vào đây... (Chú ý: Đáp án đúng có dấu * trước chữ cái)"></textarea>
                </div>
            `;
            document.getElementById('sections-container').insertAdjacentHTML('beforeend', html);
        });
    }

    // D. HÀM CẮT ĐỀ (PARSER)
    function parseExamText(rawText, type) {
        let questions = [];
        let blocks = rawText.split(/(?:Câu|Question)\s+\d+\s*:/i).filter(b => b.trim().length > 0);

        blocks.forEach((block, index) => {
            let qObj = { id: index + 1, content: "", type: type };

            if (type === 'tn' || type === 'ds') {
                let splitByOptions = block.split(/(?=\*?[A-D|a-d]\.)/);
                qObj.content = splitByOptions[0].trim(); 
                qObj.options = [];
                qObj.correctAnswer = [];

                for (let i = 1; i < splitByOptions.length; i++) {
                    let optText = splitByOptions[i].trim();
                    let isCorrect = optText.startsWith('*');
                    if (isCorrect) optText = optText.substring(1); 
                    qObj.options.push(optText);
                    if (isCorrect) qObj.correctAnswer.push(optText.charAt(0).toUpperCase()); 
                }
            } 
            else if (type === 'tn_ngan') {
                let match = block.match(/\[(.*?)\]/);
                qObj.content = block.replace(/\[.*?\]/, '').trim();
                qObj.correctAnswer = match ? match[1].trim() : "";
            } 
            else if (type === 'tl') {
                qObj.content = block.trim();
            }
            questions.push(qObj);
        });
        return questions;
    }

    // E. LƯU ĐỀ THI LÊN FIREBASE
    const btnSaveExam = document.getElementById('btnSaveExam');
    if (btnSaveExam) {
        btnSaveExam.addEventListener('click', async () => {
            const subject = document.getElementById('subject').value === 'Khác' 
                            ? document.getElementById('otherSubject').value 
                            : 'Tiếng Anh';

            const sectionsData = Array.from(document.querySelectorAll('.section-item')).map(item => {
                const raw = item.querySelector('.raw-text').value;
                const type = item.querySelector('.section-type').value;
                return {
                    name: item.querySelector('.section-name').value,
                    type: type,
                    questions: parseExamText(raw, type)
                };
            });

            const examData = {
                subject: subject,
                grade: document.getElementById('grade').value,
                name: document.getElementById('examName').value,
                type: document.getElementById('examType').value,
                createdAt: new Date(),
                sections: sectionsData
            };

            try {
                await addDoc(collection(db, "exams"), examData);
                alert("Lưu đề thành công!");
                // Clear form
                document.getElementById('examName').value = "";
                document.getElementById('sections-container').innerHTML = "";
                sectionCount = 0;
            } catch (error) {
                alert("Lỗi lưu đề: " + error.message);
            }
        });
    }

    // F. THÊM HỌC SINH VÀ TẢI DANH SÁCH REAL-TIME
    const btnAddStudent = document.getElementById('btnAddStudent');
    if (btnAddStudent) {
        btnAddStudent.addEventListener('click', async () => {
            const email = document.getElementById('stuEmail').value.trim();
            if(!email) return alert("Vui lòng nhập Email học sinh!");

            const studentData = {
                email: email,
                name: document.getElementById('stuName').value,
                class: document.getElementById('stuClass').value,
                phone: document.getElementById('stuPhone').value,
                dob: document.getElementById('stuDob').value,
                gender: document.getElementById('stuGender').value
            };

            try {
                await setDoc(doc(db, "students", email), studentData);
                alert("Lưu thông tin học sinh thành công!");
                // Clear form
                document.getElementById('stuEmail').value = "";
                document.getElementById('stuName').value = "";
            } catch (e) {
                alert("Lỗi lưu học sinh: " + e.message);
            }
        });
    }

    // HÀM REAL-TIME CHO TAB 4 (TỰ ĐỘNG CẬP NHẬT KHI CÓ DATA MỚI)
    function loadStudentsRealtime() {
        onSnapshot(collection(db, "students"), (snapshot) => {
            const tbody = document.getElementById('studentListTable');
            if(!tbody) return;
            
            tbody.innerHTML = ""; // Xóa dữ liệu cũ
            snapshot.forEach((doc) => {
                let data = doc.data();
                tbody.innerHTML += `
                    <tr>
                        <td style="padding: 8px;">${data.email}</td>
                        <td style="padding: 8px;">${data.name}</td>
                        <td style="padding: 8px;">${data.class}</td>
                        <td style="padding: 8px;">${data.phone}</td>
                    </tr>
                `;
            });
        }, (error) => {
            console.error("Lỗi tải danh sách học sinh: ", error);
        });
    }
}
