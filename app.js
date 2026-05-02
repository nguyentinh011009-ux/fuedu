// app.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, collection, addDoc, doc, setDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { auth, db, provider } from './config.js'; 

const allowedTeacherEmails = ['nguyentinh52009@gmail.com', 'nguyentinh011009@gmail.com', 'tomizy09icloud@gmail.com'];
const pageType = document.body.getAttribute('data-page');

let allExams = []; // Mảng toàn cục lưu đề thi

// ==========================================
// HÀM TẢI ĐỀ THI (CÓ BẮT LỖI ĐỂ BÁO LÊN MÀN HÌNH)
// ==========================================
function loadExamsRealtime() {
    const selectSetting = document.getElementById('selectExamSetting');
    const selectManage = document.getElementById('selectExamManage');
    
    if(!selectSetting || !selectManage) return;

    selectSetting.innerHTML = '<option value="">Đang kết nối tới máy chủ...</option>';

    onSnapshot(collection(db, "exams"), (snapshot) => {
        selectSetting.innerHTML = '<option value="">-- Chọn đề thi --</option>';
        selectManage.innerHTML = '<option value="">-- Chọn đề thi --</option>';
        allExams = []; 

        if (snapshot.empty) {
            selectSetting.innerHTML = '<option value="">Chưa có đề thi nào trong CSDL (Hãy tạo đề)</option>';
            return;
        }

        snapshot.forEach((doc) => {
            let data = doc.data();
            allExams.push({ id: doc.id, ...data }); 
            let examName = data.name || "Đề không tên";
            let optionHTML = `<option value="${doc.id}">[Khối ${data.grade}] ${examName} - ${data.subject}</option>`;
            
            selectSetting.innerHTML += optionHTML;
            selectManage.innerHTML += optionHTML;
        });
    }, (error) => {
        // NẾU BỊ LỖI QUYỀN TRUY CẬP SẼ BÁO Ở ĐÂY
        console.error("Firebase Error: ", error);
        selectSetting.innerHTML = '<option value="">LỖI: KHÔNG CÓ QUYỀN ĐỌC DỮ LIỆU!</option>';
        alert("Lỗi tải đề thi từ Firebase!\nNguyên nhân: Bạn chưa cài đặt 'Rules' (Quy tắc) trong Firestore.\nHãy vào Firebase để sửa Rules.");
    });
}

function loadStudentsRealtime() {
    const tbody = document.getElementById('studentListTable');
    if(!tbody) return;

    onSnapshot(collection(db, "students"), (snapshot) => {
        tbody.innerHTML = ""; 
        snapshot.forEach((doc) => {
            let data = doc.data();
            tbody.innerHTML += `
                <tr style="border-bottom: 1px solid #ddd;">
                    <td style="padding: 10px;">${data.email}</td>
                    <td style="padding: 10px;">${data.name}</td>
                    <td style="padding: 10px;">${data.class}</td>
                    <td style="padding: 10px;">${data.phone}</td>
                </tr>
            `;
        });
    }, (error) => {
        tbody.innerHTML = `<tr><td colspan="4" style="color:red; text-align:center;">Lỗi không thể tải Học sinh: ${error.message}</td></tr>`;
    });
}

// ==========================================
// KIỂM TRA ĐĂNG NHẬP
// ==========================================
const btnLogin = document.getElementById('btnLogin');
const btnLogout = document.getElementById('btnLogout'); 
const btnSidebarLogout = document.getElementById('btnSidebarLogout'); 

if (btnLogin) btnLogin.addEventListener('click', () => signInWithPopup(auth, provider));
if (btnLogout) btnLogout.addEventListener('click', () => signOut(auth));
if (btnSidebarLogout) btnSidebarLogout.addEventListener('click', () => signOut(auth));

onAuthStateChanged(auth, (user) => {
    const loginSection = document.getElementById('login-section');
    const appSection = document.getElementById('app-section');

    if (user) {
        if (pageType === 'teacher') {
            if (allowedTeacherEmails.includes(user.email)) {
                if (loginSection) loginSection.classList.add('hidden');
                if (appSection) appSection.classList.remove('hidden');
                document.getElementById('userEmail').innerText = "Giáo viên: " + user.email;
                
                // KHI LOGIN THÀNH CÔNG THÌ GỌI 2 HÀM NÀY
                loadStudentsRealtime(); 
                loadExamsRealtime(); 
            } else {
                alert("Bạn không có quyền truy cập trang Giáo viên!");
                signOut(auth);
            }
        } 
        else if (pageType === 'student') {
            if (loginSection) loginSection.classList.add('hidden');
            if (appSection) appSection.classList.remove('hidden');
            document.getElementById('studentName').innerText = "Xin chào, " + user.displayName;
        }
    } else {
        if (loginSection) loginSection.classList.remove('hidden');
        if (appSection) appSection.classList.add('hidden');
    }
});

// ==========================================
// CÁC TÍNH NĂNG CHỨC NĂNG (TAB 1, 2, 4)
// ==========================================
if (pageType === 'teacher') {

    // CHUYỂN TAB
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

    // MÔN HỌC (TAB 1)
    const subjectSelect = document.getElementById('subject');
    if (subjectSelect) {
        subjectSelect.addEventListener('change', (e) => {
            document.getElementById('otherSubject').classList.toggle('hidden', e.target.value === 'Tiếng Anh');
        });
    }

    // THÊM PHẦN (TAB 1)
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

    // PARSER (CẮT ĐỀ)
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

    // LƯU ĐỀ THI
    const btnSaveExam = document.getElementById('btnSaveExam');
    if (btnSaveExam) {
        btnSaveExam.addEventListener('click', async () => {
            const subject = document.getElementById('subject').value === 'Khác' 
                            ? document.getElementById('otherSubject').value : 'Tiếng Anh';
            const examName = document.getElementById('examName').value;
            if(!examName) return alert("Vui lòng nhập tên đề thi!");

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
                name: examName,
                type: document.getElementById('examType').value,
                createdAt: new Date().toISOString(),
                sections: sectionsData
            };

            btnSaveExam.innerText = "Đang lưu...";
            try {
                await addDoc(collection(db, "exams"), examData);
                alert("Lưu đề thành công! Hãy sang Tab Cài đặt để quản lý.");
                document.getElementById('examName').value = "";
                document.getElementById('sections-container').innerHTML = "";
                sectionCount = 0;
            } catch (error) {
                alert("LỖI KHÔNG THỂ LƯU ĐỀ: " + error.message + "\nHãy kiểm tra lại Rules Firebase!");
            } finally {
                btnSaveExam.innerText = "Nhận diện & Lưu Đề";
            }
        });
    }

    // XUẤT PDF (TAB 2)
    const btnExportPDF = document.getElementById('btnExportPDF');
    if (btnExportPDF) {
        btnExportPDF.addEventListener('click', () => {
            const examId = document.getElementById('selectExamSetting').value;
            if (!examId) return alert("Vui lòng chọn 1 đề thi ở danh sách bên trên để xuất PDF!");

            const exam = allExams.find(e => e.id === examId);
            if(!exam) return alert("Không tìm thấy dữ liệu đề thi!");

            let htmlContent = `
                <div style="padding: 20px; font-family: 'Times New Roman', serif; color: black; line-height: 1.5;">
                    <div style="text-align: center; margin-bottom: 20px;">
                        <h2 style="margin: 0; font-size: 20px;">HỆ THỐNG ÔN TẬP FUEDU</h2>
                        <h1 style="margin: 5px 0; font-size: 22px; text-transform: uppercase;">${exam.name}</h1>
                        <p style="margin: 0; font-style: italic;">Môn: ${exam.subject} - Khối: ${exam.grade}</p>
                    </div>
                    <hr style="border: 1px solid black; margin-bottom: 20px;">
            `;

            exam.sections.forEach(sec => {
                htmlContent += `<h3 style="font-size: 18px; margin-top: 15px;">${sec.name}</h3>`;
                sec.questions.forEach(q => {
                    htmlContent += `<div style="margin-bottom: 10px;"><span style="font-weight: bold;">Câu ${q.id}:</span> ${q.content}<div style="margin-top: 5px; padding-left: 15px;">`;
                    if (q.options && q.options.length > 0) {
                        q.options.forEach((opt, idx) => {
                            htmlContent += `<div style="display: inline-block; width: 48%; margin-bottom: 5px;"><b>${String.fromCharCode(65 + idx)}.</b> ${opt}</div>`;
                        });
                    }
                    htmlContent += `</div></div>`;
                });
            });

            htmlContent += `</div>`;

            let opt = {
                margin: 10, filename: `${exam.name}.pdf`,
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: { scale: 2 },
                jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
            };
            
            btnExportPDF.innerText = "Đang tạo PDF...";
            html2pdf().set(opt).from(htmlContent).save().then(() => btnExportPDF.innerText = "Xuất PDF");
        });
    }

    // THÊM HỌC SINH (TAB 4)
    const btnAddStudent = document.getElementById('btnAddStudent');
    if (btnAddStudent) {
        btnAddStudent.addEventListener('click', async () => {
            const email = document.getElementById('stuEmail').value.trim();
            if(!email) return alert("Vui lòng nhập Email học sinh!");

            const studentData = {
                email: email, name: document.getElementById('stuName').value,
                class: document.getElementById('stuClass').value, phone: document.getElementById('stuPhone').value
            };

            try {
                await setDoc(doc(db, "students", email), studentData);
                alert("Lưu thông tin học sinh thành công!");
                document.getElementById('stuEmail').value = ""; document.getElementById('stuName').value = "";
            } catch (e) {
                alert("Lỗi lưu học sinh: " + e.message);
            }
        });
    }
}
