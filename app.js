// app.js
import { auth, db, provider, signInWithPopup, signOut, onAuthStateChanged, collection, addDoc } from './config.js';

// --- BIẾN TOÀN CỤC ---
const allowedTeacherEmails = ['nguyentinh52009@gmail.com', 'nguyentinh011009@gmail.com', 'tomizy09icloud@gmail.com'];
const pageType = document.body.getAttribute('data-page'); // Trả về 'teacher' hoặc 'student'

// --- CÁC DOM ELEMENTS CHUNG ---
const btnLogin = document.getElementById('btnLogin');
const btnLogout = document.getElementById('btnLogout');
const loginSection = document.getElementById('login-section');
const appSection = document.getElementById('app-section');

// ==========================================
// 1. XỬ LÝ AUTHENTICATION (ĐĂNG NHẬP/ĐĂNG XUẤT)
// ==========================================
if (btnLogin) {
    btnLogin.addEventListener('click', () => {
        signInWithPopup(auth, provider).catch(err => alert("Lỗi đăng nhập: " + err.message));
    });
}

if (btnLogout) {
    btnLogout.addEventListener('click', () => {
        signOut(auth);
    });
}

// Theo dõi trạng thái đăng nhập
onAuthStateChanged(auth, (user) => {
    if (user) {
        if (pageType === 'teacher') {
            // Kiểm tra quyền Giáo viên
            if (allowedTeacherEmails.includes(user.email)) {
                loginSection.classList.add('hidden');
                appSection.classList.remove('hidden');
                document.getElementById('userEmail').innerText = user.email;
            } else {
                alert("Tài khoản của bạn không có quyền truy cập quản trị Giáo viên!");
                signOut(auth);
            }
        } else if (pageType === 'student') {
            // Quyền Học sinh (Ai cũng vào được, nhưng sau này có thể filter qua DB)
            loginSection.classList.add('hidden');
            appSection.classList.remove('hidden');
            document.getElementById('studentName').innerText = "Xin chào, " + user.displayName;
        }
    } else {
        // Chưa đăng nhập
        loginSection.classList.remove('hidden');
        appSection.classList.add('hidden');
    }
});

// ==========================================
// 2. LOGIC DÀNH RIÊNG CHO TRANG GIÁO VIÊN
// ==========================================
if (pageType === 'teacher') {

    // A. Xử lý chuyển Tabs
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    tabBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            // Xóa active hiện tại
            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            
            // Thêm active cho tab được chọn
            e.target.classList.add('active');
            const targetId = e.target.getAttribute('data-target');
            document.getElementById(targetId).classList.add('active');
        });
    });

    // B. Xử lý chọn Môn học (ẩn/hiện input Khác)
    const subjectSelect = document.getElementById('subject');
    const otherSubjectInput = document.getElementById('otherSubject');
    
    if (subjectSelect && otherSubjectInput) {
        subjectSelect.addEventListener('change', (e) => {
            if (e.target.value === 'Tiếng Anh') {
                otherSubjectInput.classList.add('hidden');
            } else {
                otherSubjectInput.classList.remove('hidden');
            }
        });
    }

    // C. Thêm phần đề (Sections)
    let sectionCount = 0;
    const btnAddSection = document.getElementById('btnAddSection');
    const sectionsContainer = document.getElementById('sections-container');

    if (btnAddSection) {
        btnAddSection.addEventListener('click', () => {
            sectionCount++;
            const isEnglish = document.getElementById('subject').value === 'Tiếng Anh';
            
            // Sinh option dạng câu hỏi tùy theo môn học
            const options = isEnglish 
                ? `<option value="tn">Trắc nghiệm</option>
                   <option value="rw">Rewrite/Writing</option>`
                : `<option value="tn">Trắc nghiệm</option>
                   <option value="ds">Đúng - Sai</option>
                   <option value="tn_ngan">Trả lời ngắn</option>
                   <option value="tl">Tự luận</option>`;
            
            const html = `
                <div class="card section-item" style="background: #f9f9f9; border-left: 4px solid var(--primary-color);">
                    <h4>Phần ${sectionCount}</h4>
                    <input type="text" class="form-control section-name" placeholder="Tên phần (VD: Phần I. Trắc nghiệm...)" style="margin: 10px 0;">
                    <select class="form-control section-type" style="margin-bottom: 10px;">
                        ${options}
                    </select>
                    <textarea class="form-control raw-text" placeholder="Dán đề thô vào đây... (Chú ý: Đáp án đúng có dấu * trước chữ cái)"></textarea>
                </div>
            `;
            sectionsContainer.insertAdjacentHTML('beforeend', html);
        });
    }

    // D. Xử lý Lưu Đề lên Firebase
    const btnSaveExam = document.getElementById('btnSaveExam');
    if (btnSaveExam) {
        btnSaveExam.addEventListener('click', async () => {
            // Gom dữ liệu từ Form
            const subject = document.getElementById('subject').value === 'Khác' 
                ? document.getElementById('otherSubject').value 
                : 'Tiếng Anh';

            const examData = {
                subject: subject,
                grade: document.getElementById('grade').value,
                name: document.getElementById('examName').value,
                type: document.getElementById('examType').value,
                createdAt: new Date(),
                // Thu thập nội dung thô của các phần
                sections: Array.from(document.querySelectorAll('.section-item')).map(item => ({
                    name: item.querySelector('.section-name').value,
                    type: item.querySelector('.section-type').value,
                    rawContent: item.querySelector('.raw-text').value
                }))
            };

            // Lưu lên Firestore
            try {
                const docRef = await addDoc(collection(db, "exams"), examData);
                alert("Đã tạo đề thành công! \nID Đề trên CSDL: " + docRef.id);
                // (Tùy chọn: clear form sau khi lưu)
            } catch (error) {
                alert("Đã xảy ra lỗi khi lưu đề: " + error.message);
            }
        });
    }
}

// ==========================================
// 3. LOGIC DÀNH RIÊNG CHO TRANG HỌC SINH
// ==========================================
if (pageType === 'student') {
    const btnStartTest = document.getElementById('btnStartTest');
    if (btnStartTest) {
        btnStartTest.addEventListener('click', () => {
            alert('Tính năng làm bài đang được phát triển. Dữ liệu đề thi sẽ được parser và đổ ra màn hình này!');
        });
    }
}