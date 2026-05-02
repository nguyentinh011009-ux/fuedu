// app.js
import { auth, db, provider, signInWithPopup, signOut, onAuthStateChanged, collection, addDoc, getDocs, doc, setDoc } from './config.js';

const allowedTeacherEmails = ['nguyentinh52009@gmail.com', 'nguyentinh011009@gmail.com', 'tomizy09icloud@gmail.com'];
const pageType = document.body.getAttribute('data-page');

const btnLogin = document.getElementById('btnLogin');
const btnSidebarLogout = document.getElementById('btnSidebarLogout');

// 1. AUTH LOGIC
if (btnLogin) btnLogin.addEventListener('click', () => signInWithPopup(auth, provider));
if (btnSidebarLogout) btnSidebarLogout.addEventListener('click', () => signOut(auth));

onAuthStateChanged(auth, (user) => {
    if (user) {
        if (pageType === 'teacher') {
            if (allowedTeacherEmails.includes(user.email)) {
                document.getElementById('login-section').classList.add('hidden');
                document.getElementById('app-section').classList.remove('hidden');
                document.getElementById('userEmail').innerText = "Giáo viên: " + user.email;
                loadStudents(); // Tải ds học sinh khi login thành công
            } else {
                alert("Bạn không có quyền Giáo viên!"); signOut(auth);
            }
        }
    } else {
        document.getElementById('login-section').classList.remove('hidden');
        document.getElementById('app-section').classList.add('hidden');
    }
});

// ==========================================
// LOGIC GIÁO VIÊN
// ==========================================
if (pageType === 'teacher') {

    // A. CHUYỂN TAB
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            if(e.target.id === 'btnSidebarLogout') return;
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            e.target.classList.add('active');
            document.getElementById(e.target.getAttribute('data-target')).classList.add('active');
        });
    });

    // B. CHỌN MÔN HỌC
    const subjectSelect = document.getElementById('subject');
    subjectSelect.addEventListener('change', (e) => {
        document.getElementById('otherSubject').classList.toggle('hidden', e.target.value === 'Tiếng Anh');
    });

    // C. THÊM PHẦN (SECTIONS)
    let sectionCount = 0;
    document.getElementById('btnAddSection').addEventListener('click', () => {
        sectionCount++;
        const isEng = subjectSelect.value === 'Tiếng Anh';
        const options = isEng 
            ? `<option value="tn">Trắc nghiệm</option><option value="tl">Writing/Rewrite (Tự luận)</option>`
            : `<option value="tn">Trắc nghiệm (4 đáp án)</option><option value="ds">Đúng - Sai</option><option value="tn_ngan">Trả lời ngắn (4 ký tự)</option><option value="tl">Tự luận</option>`;
        
        const html = `
            <div class="card section-item" style="border-left: 4px solid blue;">
                <h4>Phần ${sectionCount}</h4>
                <input type="text" class="form-control section-name" placeholder="Tên phần" style="margin: 10px 0;">
                <select class="form-control section-type" style="margin-bottom: 10px;">${options}</select>
                <textarea class="form-control raw-text" placeholder="Dán đề thô vào đây... (Ví dụ: Câu 1: ... *A. ... B. ...)"></textarea>
            </div>
        `;
        document.getElementById('sections-container').insertAdjacentHTML('beforeend', html);
    });

    // ==========================================
    // D. THUẬT TOÁN PARSER NHẬN DIỆN ĐỀ (RẤT QUAN TRỌNG)
    // ==========================================
    function parseExamText(rawText, type) {
        let questions = [];
        // Cắt text theo chữ "Câu 1:", "Câu 2:", hoặc "Question 1:"
        let blocks = rawText.split(/(?:Câu|Question)\s+\d+\s*:/i).filter(b => b.trim().length > 0);

        blocks.forEach((block, index) => {
            let qObj = { id: index + 1, content: "", type: type };

            if (type === 'tn' || type === 'ds') {
                // Tách nội dung câu hỏi và các đáp án A, B, C, D (hoặc a, b, c, d)
                // Tìm vị trí chữ A. hoặc *A.
                let splitByOptions = block.split(/(?=\*?[A-D|a-d]\.)/);
                qObj.content = splitByOptions[0].trim(); // Phần đầu tiên là nội dung câu hỏi
                qObj.options = [];
                qObj.correctAnswer = [];

                for (let i = 1; i < splitByOptions.length; i++) {
                    let optText = splitByOptions[i].trim();
                    let isCorrect = optText.startsWith('*');
                    
                    if (isCorrect) optText = optText.substring(1); // Bỏ dấu sao
                    qObj.options.push(optText);
                    
                    if (isCorrect) {
                        qObj.correctAnswer.push(optText.charAt(0).toUpperCase()); // Lưu lại ký tự A, B, C, D
                    }
                }
            } 
            else if (type === 'tn_ngan') {
                // Trả lời ngắn: Bắt nội dung câu hỏi và tìm đáp án trong ngoặc vuông VD: [ABCD]
                let match = block.match(/\[(.*?)\]/);
                qObj.content = block.replace(/\[.*?\]/, '').trim();
                qObj.correctAnswer = match ? match[1].trim() : "";
            } 
            else if (type === 'tl') {
                // Tự luận: Lấy nguyên text
                qObj.content = block.trim();
            }
            questions.push(qObj);
        });
        return questions;
    }

    // E. LƯU ĐỀ THI
    document.getElementById('btnSaveExam').addEventListener('click', async () => {
        const sectionsData = Array.from(document.querySelectorAll('.section-item')).map(item => {
            const raw = item.querySelector('.raw-text').value;
            const type = item.querySelector('.section-type').value;
            return {
                name: item.querySelector('.section-name').value,
                type: type,
                questions: parseExamText(raw, type) // Gọi hàm Parser
            };
        });

        const examData = {
            subject: subjectSelect.value === 'Khác' ? document.getElementById('otherSubject').value : 'Tiếng Anh',
            grade: document.getElementById('grade').value,
            name: document.getElementById('examName').value,
            type: document.getElementById('examType').value,
            createdAt: new Date(),
            sections: sectionsData
        };

        try {
            await addDoc(collection(db, "exams"), examData);
            alert("Đã phân tích và lưu đề thành công!");
            console.log(examData); // Mở F12 -> Console để xem cấu trúc đề đã được bóc tách
        } catch (error) {
            alert("Lỗi lưu đề: " + error.message);
        }
    });

    // ==========================================
    // F. QUẢN LÝ TÀI KHOẢN HỌC SINH (TAB 4)
    // ==========================================
    document.getElementById('btnAddStudent').addEventListener('click', async () => {
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
            // Dùng setDoc để tạo hoặc ghi đè học sinh theo ID là Email của họ
            await setDoc(doc(db, "students", email), studentData);
            alert("Đã cập nhật thông tin học sinh!");
            loadStudents(); // Tải lại bảng
        } catch (e) {
            alert("Lỗi: " + e.message);
        }
    });

    async function loadStudents() {
        const querySnapshot = await getDocs(collection(db, "students"));
        const tbody = document.getElementById('studentListTable');
        tbody.innerHTML = "";
        querySnapshot.forEach((doc) => {
            let data = doc.data();
            tbody.innerHTML += `
                <tr>
                    <td style="padding: 5px;">${data.email}</td>
                    <td style="padding: 5px;">${data.name}</td>
                    <td style="padding: 5px;">${data.class}</td>
                    <td style="padding: 5px;">${data.phone}</td>
                </tr>
            `;
        });
    }
}
