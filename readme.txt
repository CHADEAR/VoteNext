# VoteNext
### Real-time Digital Voting System

VoteNext คือระบบลงคะแนนเสียงรูปแบบดิจิทัลที่มุ่งเน้นความรวดเร็ว แม่นยำ และการแสดงผลแบบเรียลไทม์ ตัวระบบถูกพัฒนาขึ้นโดยแบ่งส่วนการทำงาน (Decoupled Architecture) เพื่อให้ง่ายต่อการขยายระบบและการบำรุงรักษา

---

## 📋 ความต้องการของระบบ (Prerequisites)

เพื่อให้ระบบสามารถทำงานได้อย่างสมบูรณ์ โปรดตรวจสอบสภาพแวดล้อมในการติดตั้งดังนี้:
* **Node.js**: แนะนำเวอร์ชัน 18.x LTS ขึ้นไป
* **Docker & Docker Compose**: สำหรับจัดการ Service พื้นฐานและฐานข้อมูล
* **Package Manager**: npm หรือ yarn

---

## 🚀 ขั้นตอนการเริ่มใช้งาน (Getting Started)

### 1. สำหรับการพัฒนา (Development Mode)
ใช้สำหรับการแก้ไขโค้ดและทดสอบระบบบนเครื่อง Local

**ขั้นตอนการเตรียมระบบพื้นฐาน (Docker):**
```bash
# เริ่มการทำงานของ Database และ Services ที่จำเป็น
docker-compose -f docker-compose.dev.yml up -d

ขั้นตอนการเริ่มทำงานส่วน Backend:

cd vote_next_server
npm install
npm run dev

ขั้นตอนการเริ่มทำงานส่วน Frontend:

cd vote_next_client
npm install
npm run dev
