# Deployment guide — ElectronicCigarettes

คู่มือสั้นเพื่อดีพลอย backend (Express) และ frontend (static web-build)
คำสั่งทั้งหมดเป็นแบบ PowerShell-friendly (Windows). ทำตามทีละข้อแล้วแจ้งผลลัพธ์ที่ได้ หากติดปัญหาผมจะช่วยต่อ

---

## 1) ทดสอบและรัน backend บนเครื่องของคุณ

1. เปิด PowerShell แล้วเข้าโฟลเดอร์ backend:

```powershell
cd C:\Users\Sakareeya\ElectronicCigarettes\backend
npm install
```

2. รัน server แบบ local เพื่อยืนยันว่า `/news/thaihealth` กับ `/thumb` ทำงาน

```powershell
# รันเซิร์ฟเวอร์
npm start

# ทดสอบ endpoint (show JSON)
Invoke-RestMethod -Uri 'http://localhost:3001/news/thaihealth' | ConvertTo-Json -Depth 5

# ทดสอบ thumbnail proxy (headers)
& curl.exe --http1.1 -I "http://localhost:3001/thumb?url=https://www.thaihealth.or.th/wp-content/uploads/2025/03/ตัวอย่าง.jpg"
```

หากได้ JSON และ status 200 ของ /thumb แปลว่า backend พร้อมสำหรับดีพลอย

---

## 2) Push โค้ดขึ้น GitHub (ถ้ายังไม่ push)

1. สร้าง repo บน GitHub (เว็บ) แล้วเชื่อม remote ในเครื่อง

```powershell
cd C:\Users\Sakareeya\ElectronicCigarettes
git add .
git commit -m "Prepare backend for deploy"
# เปลี่ยน <username> และ <repo> เป็นของคุณ
git remote add origin https://github.com/<username>/<repo>.git
git push -u origin master
```

ถ้า repo มีอยู่แล้ว ให้แค่ push คอมมิตล่าสุด

---

## 3) Deploy backend ไปที่ Render (แนะนำ) — ใช้ GitHub integration

1. ไปที่ https://render.com และล็อกอิน/สมัคร
2. New -> Web Service -> Connect GitHub -> เลือก repo ของคุณ
3. ในหน้าตั้งค่า service:
   - Root Directory: ให้ใส่ `backend` (เพราะเป็น monorepo)
   - Branch: `master` (หรือ branch ที่คุณใช้)
   - Build Command: leave empty หรือ `npm install`
   - Start Command: `npm start`
   - Environment: เลือก Node 16+ (default)
4. Create Service แล้วรอ deploy เสร็จ
5. เมื่อสำเร็จ จะได้ URL เช่น `https://your-backend.onrender.com`

ตรวจ logs ใน Render ถ้ามี error (permissions, missing deps)

---

## 4) ทดสอบ backend ที่ deploy แล้ว

ใน PowerShell บนเครื่องของคุณ:

```powershell
Invoke-RestMethod -Uri 'https://your-backend.onrender.com/news/thaihealth' | ConvertTo-Json -Depth 5

& curl.exe --http1.1 -I "https://your-backend.onrender.com/thumb?url=https://www.thaihealth.or.th/wp-content/uploads/2025/03/ตัวอย่าง.jpg"
```

ถ้าได้ผลลัพธ์ OK (200) ทั้งสอง ให้ไปต่อที่ frontend

---

## 5) ตั้งค่า frontend ให้ชี้ไป backend ที่ deploy แล้ว

ตัวแปรสำคัญ: `NEWS_ENDPOINT`

สองวิธีหลัก:

- Build-time (ง่าย): ตั้ง ENV ก่อน build แล้ว `npm run build` ของ frontend

```powershell
$env:NEWS_ENDPOINT='https://your-backend.onrender.com/news/thaihealth'
# ตัวอย่าง build (ปรับคำสั่งตามโปรเจคของคุณ)
npm run build
```

หลัง build ให้ deploy โฟลเดอร์ `web-build` ไปที่ hosting (Firebase/Netlify/Vercel)

- Runtime config (ไม่ต้อง build ใหม่): สร้าง `config.json` ที่ public root และให้ client โหลดค่า NEWS_ENDPOINT ตอนเริ่ม

ถ้าต้องการตัวอย่างโค้ดโหลด `config.json` ตอนเริ่ม ผมช่วยเพิ่มให้ได้

---

## 6) Deploy frontend (Firebase Hosting ตัวอย่าง)

1. ติดตั้ง Firebase CLI:

```powershell
npm install -g firebase-tools
firebase login
```

2. จาก project root:

```powershell
cd C:\Users\Sakareeya\ElectronicCigarettes
# ตรวจว่า web-build มีไฟล์ production แล้ว
firebase deploy --only hosting
```

3. เปิด URL ที่ Firebase ให้มาและตรวจ network tab ว่า fetch `/news/thaihealth` ไปยัง backend ที่ deploy แล้วหรือไม่

---

## 7) Troubleshooting ที่พบบ่อย

- ถ้า `/thumb` คืนค่า error: ดู logs ของ backend (Render logs) — มักเป็น timeout หรือ upstream blocked
- หาก cache folder ไม่เขียนได้: บาง host ให้ disk ephemeral — ให้ใช้ S3 หรือ persistent disk ของ provider
- ถ้ารูปไม่ขึ้นเฉพาะบางไฟล์ (HTTP/2 error): เราใช้ proxy `/thumb` เพื่อแก้ปัญหานี้แล้ว — ตรวจว่า frontend เรียกภาพผ่าน `/thumb` หรือไม่

---

## 8) ถ้าต้องการผมช่วยแบบ interactive

ผมช่วยได้ 2 แบบ:
- A: เตรียม `README_DEPLOY.md` (ไฟล์นี้) และคำสั่งทั้งหมดให้คุณรันทีละบรรทัดบนเครื่อง — คุณรันแล้วส่งผลลัพธ์มา ผมช่วยแก้ปัญหาเฉพาะจุด
- B: ผมสร้างตัวช่วยใน repo (เช่น `deploy-scripts.ps1`) ที่รันคำสั่งสำคัญได้อัตโนมัติ แล้วคุณรันสคริปต์เดียว — ถ้าต้องการผมจะเพิ่ม

บอกผมว่าคุณต้องการวิธีไหนและถ้าต้องการผมจะเพิ่มสคริปต์หรือไฟล์ config ให้ทันที

---

ขอบคุณ — บอกผมเมื่อพร้อมจะเริ่มขั้นตอนแรก (run `npm install` และ `npm start` ใน `backend`) หรือให้ผมเพิ่มสคริปต์อัตโนมัติให้

