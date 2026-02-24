# Software Requirements Specification (SRS)
## VoteNext Voting System

---

## 1. ภาพรวมระบบ (System Overview)

### 1.1 วัตถุประสงค์
VoteNext เป็นระบบโหวตออนไลน์สำหรับการแข่งขันที่รองรับการโหวตหลายรูปแบบ ได้แก่:
- การโหวตออนไลน์ผ่านอีเมล
- การโหวตผ่านอุปกรณ์ (Remote Device)
- การจัดการการแข่งขันและรอบการโหวต
- การแสดงผลลัพธ์แบบ Real-time

### 1.2 ขอบเขตระบบ
ระบบประกอบด้วย:
- **Admin Panel**: สำหรับผู้ดูแลระบบจัดการการแข่งขัน ผู้เข้าแข่งขัน และรอบการโหวต
- **Public Voting Interface**: สำหรับผู้ใช้ทั่วไปโหวตผ่านเว็บ
- **Remote Device Integration**: สำหรับอุปกรณ์โหวต
- **Real-time Updates**: การอัปเดตผลการโหวตแบบสด

### 1.3 คำจำกัดความ
- **Show**: การแข่งขันหนึ่งรายการ
- **Round**: รอบการโหวตภายในการแข่งขัน
- **Contestant**: ผู้เข้าแข่งขัน
- **Public Slug**: URL สาธารณะสำหรับการโหวต
- **Vote Token**: JWT Token สำหรับยืนยันสิทธิ์การโหวต

### 1.4 บริบทของระบบ
ระบบถูกออกแบบมาสำหรับ:
- การจัดการการประกวด/แข่งขันที่ต้องการระบบโหวต
- รองรับผู้ใช้จำนวนมากพร้อมการทำงานแบบ Real-time
- ความปลอดภัยในการโหวตผ่านการยืนยันอีเมลและ Token

---

## 2. สถาปัตยกรรมระบบ (System Architecture)

### 2.1 โครงสร้างระดับสูง
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Client Side   │    │   Server Side   │    │   Database      │
│   (React SPA)   │◄──►│   (Express.js)  │◄──►│   (PostgreSQL)  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │
         │              ┌─────────────────┐
         │              │  WebSocket      │
         └──────────────►│  (Real-time)    │
                        └─────────────────┘
```

### 2.2 การแบ่ง Component

#### Client Side (vote_next_client)
- **Frontend Framework**: React 18.3.1 + Vite
- **Routing**: React Router DOM 6.30.2
- **State Management**: React Hooks + Context
- **HTTP Client**: Axios 1.13.2
- **Real-time**: Socket.io Client 4.8.3
- **UI Components**: React Icons 5.5.0, React Toastify 11.0.5

#### Server Side (vote_next_server)
- **Backend Framework**: Express.js 4.18.2
- **Database**: PostgreSQL 16 ผ่าน pg 8.11.1
- **Authentication**: JWT (jsonwebtoken 9.0.2)
- **File Upload**: Multer 2.0.2
- **Real-time**: Socket.io 4.8.3 + WebSocket (ws 8.19.0)
- **Rate Limiting**: express-rate-limit 7.1.5

### 2.3 Data Flow
1. **Admin Flow**: Login → Create Show → Add Contestants → Create Rounds → Manage Voting
2. **Public Flow**: Access Public URL → Verify Email → Receive Vote Token → Submit Vote
3. **Device Flow**: Device Registration → Sync Active Poll → Submit Remote Vote
4. **Real-time Flow**: Vote Submission → Broadcast Update → Live Ranking Update

### 2.4 โครงสร้างการ Deploy
- **Containerization**: Docker Compose
- **Services**: 
  - PostgreSQL Database (Port 5432)
  - Express.js Server (Port 4000)
  - React Client (Port 5173)
- **Production**: Deploy บน Render (Backend) และ Vercel (Frontend)

---

## 3. ความต้องการเชิงหน้าที่ (Functional Requirements)

### FR-001: การจัดการผู้ดูแลระบบ (Admin Management)
- **FR-001.1**: Admin สามารถ Login ด้วย Email และ Password
- **FR-001.2**: Admin สามารถ Reset Password ได้
- **FR-001.3**: Admin สามารถอัปเดต Profile ได้
- **FR-001.4**: Admin สามารถอัปโหลดรูปโปรไฟล์ได้

### FR-002: การจัดการการแข่งขัน (Show Management)
- **FR-002.1**: Admin สามารถสร้าง Show ใหม่ได้
- **FR-002.2**: Show ประกอบด้วย Title, Description, และ Created By
- **FR-002.3**: Admin สามารถดูรายการ Show ทั้งหมดได้
- **FR-002.4**: Show สามารถมีหลาย Round ได้

### FR-003: การจัดการผู้เข้าแข่งขัน (Contestant Management)
- **FR-003.1**: Admin สามารถเพิ่มผู้เข้าแข่งขันได้
- **FR-003.2**: Contestant ประกอบด้วย Stage Name, Description, Image URL, Order Number
- **FR-003.3**: Admin สามารถอัปโหลดรูปผู้เข้าแข่งขันได้
- **FR-003.4**: Admin สามารถแก้ไขข้อมูลผู้เข้าแข่งขันได้

### FR-004: การจัดการรอบการโหวต (Round Management)
- **FR-004.1**: Admin สามารถสร้าง Round ใหม่ได้
- **FR-004.2**: Round มี Vote Mode: online, remote
- **FR-004.3**: Round มี Counter Type: manual, auto
- **FR-004.4**: Round มีสถานะ: pending, voting, closed
- **FR-004.5**: Round มี Public Slug สำหรับการเข้าถึงสาธารณะ
- **FR-004.6**: Auto Counter Round ต้องมี Start Time และ End Time

### FR-005: การโหวตออนไลน์ (Online Voting)
- **FR-005.1**: ผู้ใช้สามารถเข้าถึงหน้าโหวตผ่าน Public Slug ได้
- **FR-005.2**: ผู้ใช้ต้องยืนยันอีเมลก่อนโหวต
- **FR-005.3**: ระบบตรวจสอบความถูกต้องของอีเมล (Hunter.io API)
- **FR-005.4**: ผู้ใช้ได้รับ Vote Token หลังยืนยันอีเมล (อายุ 15 นาที)
- **FR-005.5**: ผู้ใช้สามารถโหวตได้ครั้งเดียวต่อ Show
- **FR-005.6**: ระบบบันทึกการโหวตพร้อม Timestamp

### FR-006: การโหวตด้วยอุปกรณ์รีโมท (Remote Voting)
- **FR-006.1**: อุปกรณ์สามารถ Register ได้
- **FR-006.2**: อุปกรณ์สามารถ Sync สถานะ Poll ที่ Active ได้
- **FR-006.3**: อุปกรณ์สามารถส่งคะแนนโหวตได้
- **FR-006.4**: อุปกรณ์สามารถโหวตได้ครั้งเดียวต่อ Round

### FR-007: การจัดการคะแนน (Scoring Management)
- **FR-007.1**: ระบบรองรับคะแนนจากกรรมการ (Judge Scores)
- **FR-007.2**: ระบบคำนวณคะแนนรวมจาก Online Votes, Remote Votes, และ Judge Scores
- **FR-007.3**: ระบบแสดงผลลัพธ์เป็น Percentage และ Final Score
- **FR-007.4**: Admin สามารถดูผลลัพธ์แบบ Real-time ได้

### FR-008: การอัปเดตแบบ Real-time (Real-time Updates)
- **FR-008.1**: ระบบ Broadcast การอัปเดตคะแนนผ่าน WebSocket
- **FR-008.2**: หน้า Admin แสดงการอัปเดตคะแนนแบบสด
- **FR-008.3**: หน้า Public แสดงอันดับแบบสด
- **FR-008.4**: อุปกรณ์รีโมทรับการอัปเดตสถานะแบบสด

---

## 4. ความต้องการไม่เชิงหน้าที่ (Non-Functional Requirements)

### 4.1 ความปลอดภัย
- **NFR-001**: การเข้าสู่ระบบ Admin ใช้ JWT Token
- **NFR-002**: Vote Token มีอายุ 15 นาทีเพื่อป้องกันการโหวตซ้ำ
- **NFR-003**: การตรวจสอบอีเมลผ่าน Hunter.io API
- **NFR-004**: CORS Configuration จำกัด Origin ที่อนุญาต
- **NFR-005**: Rate Limiting สำหรับป้องกันการโจมตี
- **NFR-006**: Input Validation และ Sanitization

### 4.2 ประสิทธิภาพ
- **NFR-007**: การตอบสนอง API ไม่เกิน 2 วินาที
- **NFR-008**: รองรับผู้ใช้พร้อมกัน 1,000 คน
- **NFR-009**: Database Indexing สำหรับ Query ที่ใช้บ่อย
- **NFR-010**: Connection Pooling สำหรับ PostgreSQL
- **NFR-011**: WebSocket Connection สำหรับ Real-time Updates

### 4.3 การรองรับการขยายระบบ
- **NFR-012**: Microservices Architecture พร้อมการแยก Frontend/Backend
- **NFR-013**: Container-based Deployment ผ่าน Docker
- **NFR-014**: Database Migration System สำหรับ Version Control
- **NFR-015**: Environment-based Configuration

### 4.4 ความพร้อมใช้งาน
- **NFR-016**: System Uptime 99.5%
- **NFR-017**: Error Handling และ Logging
- **NFR-018**: Health Check Endpoint (/health)
- **NFR-019**: Graceful Error Recovery
- **NFR-020**: Database Connection Error Handling

### 4.5 ความสามารถในการบำรุงรักษา
- **NFR-021**: Structured Logging พร้อม Timestamp
- **NFR-022**: Modular Code Structure
- **NFR-023**: Environment Configuration Management
- **NFR-024**: API Documentation ผ่าน Code Comments

---

## 5. รายละเอียด API

### 5.1 Admin APIs

#### POST /api/admin/login
- **Description**: Admin Login
- **Request**: `{ email, password }`
- **Response**: `{ success: true, token, admin }`
- **Error**: 400/401/500

#### POST /api/admin/reset-password
- **Description**: Reset Admin Password
- **Request**: `{ email, newPassword }`
- **Response**: `{ success: true, message }`
- **Error**: 400/404/500

#### POST /api/admin/update-profile
- **Description**: Update Admin Profile
- **Request**: `{ fullName, profileImg }`
- **Response**: `{ success: true, admin }`
- **Error**: 400/500

#### POST /api/admin/polls/open
- **Description**: Open Poll for Voting
- **Request**: `{ roundId }`
- **Response**: `{ success: true }`
- **Error**: 400/404/500

#### POST /api/admin/polls/close
- **Description**: Close Poll
- **Request**: `{ roundId }`
- **Response**: `{ success: true }`
- **Error**: 400/404/500

### 5.2 Room APIs

#### GET /api/rooms
- **Description**: Get All Rooms
- **Response**: `{ success: true, data: [] }`
- **Error**: 500

#### POST /api/rooms
- **Description**: Create New Room
- **Request**: `{ title, description, vote_mode, contestants[] }`
- **Response**: `{ success: true, data: { show, round, contestants } }`
- **Error**: 400/500

#### PATCH /api/rooms/:id
- **Description**: Update Room
- **Request**: `{ poll, contestants }`
- **Response**: `{ success: true, message }`
- **Error**: 400/404/500

#### DELETE /api/rooms/:id
- **Description**: Delete Room
- **Response**: `{ success: true, message }`
- **Error**: 404/500

### 5.3 Public APIs

#### GET /api/public/vote/:slug
- **Description**: Get Public Voting Page
- **Response**: `{ success: true, data: {...}, server_now }`
- **Error**: 404/500

#### POST /api/public/vote/:publicSlug/verify-email
- **Description**: Verify Email for Voting
- **Request**: `{ email }`
- **Response**: `{ success: true, voteToken }`
- **Error**: 400/500

#### POST /api/public/vote
- **Description**: Submit Vote
- **Request**: `{ contestantId, voteToken }`
- **Headers**: `Authorization: Bearer <voteToken>`
- **Response**: `{ success: true }`
- **Error**: 400/401/500

#### GET /api/public/vote/:publicSlug/rank
- **Description**: Get Live Ranking
- **Response**: `{ success: true, data }`
- **Error**: 400/500

#### POST /api/public/vote/:publicSlug/check-voted
- **Description**: Check if User Voted
- **Request**: `{ email, voteToken }`
- **Response**: `{ success: true, hasVoted }`
- **Error**: 400/500

### 5.4 Device APIs

#### WebSocket /ws/device?deviceId=<id>
- **Description**: Device WebSocket Connection
- **Messages**: 
  - `{ type: "get_active", showId }`
  - `{ type: "active", payload }`
  - `{ type: "connected", deviceId }`

---

## 6. โครงสร้างฐานข้อมูล

### 6.1 Tables

#### admins
```sql
- id (UUID, Primary Key)
- email (VARCHAR(255), Unique)
- password_hash (VARCHAR(255))
- full_name (VARCHAR(255))
- profile_img (TEXT)
- created_at (TIMESTAMP)
```

#### shows
```sql
- id (UUID, Primary Key)
- title (VARCHAR(255))
- description (TEXT)
- created_by (UUID, FK → admins.id)
- created_at (TIMESTAMP)
```

#### rounds
```sql
- id (UUID, Primary Key)
- show_id (UUID, FK → shows.id)
- round_name (VARCHAR(255))
- description (TEXT)
- start_time (TIMESTAMP)
- end_time (TIMESTAMP)
- status (VARCHAR(50)) -- pending, voting, closed
- vote_mode (VARCHAR(20)) -- online, remote
- public_slug (VARCHAR(50), Unique)
- counter_type (VARCHAR(20)) -- manual, auto
- created_by (UUID, FK → admins.id)
- created_at (TIMESTAMP)
```

#### contestants
```sql
- id (UUID, Primary Key)
- show_id (UUID, FK → shows.id)
- stage_name (VARCHAR(255))
- description (TEXT)
- image_url (TEXT)
- order_number (INTEGER)
- created_at (TIMESTAMP)
```

#### round_contestants
```sql
- id (UUID, Primary Key)
- round_id (UUID, FK → rounds.id)
- contestant_id (UUID, FK → contestants.id)
- score (NUMERIC(5,2))
- created_at (TIMESTAMP)
```

#### votes
```sql
- id (UUID, Primary Key)
- show_id (UUID, FK → shows.id)
- email (VARCHAR(255))
- created_at (TIMESTAMP)
- Unique(show_id, email)
```

#### online_votes
```sql
- id (UUID, Primary Key)
- round_id (UUID, FK → rounds.id)
- contestant_id (UUID, FK → contestants.id)
- voter_email (VARCHAR(255))
- created_at (TIMESTAMP)
- Unique(round_id, voter_email)
```

#### remote_votes
```sql
- id (UUID, Primary Key)
- round_id (UUID, FK → rounds.id)
- contestant_id (UUID, FK → contestants.id)
- remote_device_id (UUID, FK → remote_devices.id)
- created_at (TIMESTAMP)
- Unique(round_id, remote_device_id)
```

#### judge_scores
```sql
- id (UUID, Primary Key)
- round_id (UUID, FK → rounds.id)
- contestant_id (UUID, FK → contestants.id)
- score (NUMERIC(5,2))
- created_at (TIMESTAMP)
- Unique(round_id, contestant_id)
```

#### remote_devices
```sql
- id (UUID, Primary Key)
- device_id (VARCHAR(255), Unique)
- owner_label (VARCHAR(255))
- created_at (TIMESTAMP)
```

### 6.2 Indexes
- `idx_rounds_public_slug` ON rounds(public_slug)
- `idx_rounds_show_id` ON rounds(show_id)
- `idx_contestants_show_id` ON contestants(show_id)
- `idx_round_contestants_round_id` ON round_contestants(round_id)
- `idx_votes_show_id` ON votes(show_id)
- `idx_votes_email` ON votes(email)

### 6.3 Constraints
- Foreign Key Constraints พร้อม ON DELETE CASCADE
- Unique Constraints สำหรับป้องกันข้อมูลซ้ำ
- Check Constraints สำหรับ validation (status, vote_mode, counter_type)

---

## 7. ลำดับการทำงาน (Sequence Flow)

### 7.1 Authentication Flow
```
1. Admin → POST /api/admin/login
2. Server → Validate credentials
3. Server → Generate JWT Token
4. Server → Return token and admin data
5. Client → Store token in localStorage
6. Client → Include token in Authorization header
```

### 7.2 Business Flow: Creating Voting Poll
```
1. Admin → Login to system
2. Admin → Create Show (title, description)
3. Admin → Add Contestants (stage_name, image, description)
4. Admin → Create Round (round_name, vote_mode, counter_type)
5. Admin → Assign Contestants to Round
6. System → Generate Public Slug
7. Admin → Open Poll for voting
```

### 7.3 Public Voting Flow
```
1. User → Access /vote/:publicSlug
2. System → Display voting page with contestants
3. User → Enter email for verification
4. System → Verify email via Hunter.io API
5. System → Generate Vote Token (15 min expiry)
6. User → Select contestant and submit vote
7. System → Validate token and check duplicate vote
8. System → Record vote in online_votes table
9. System → Broadcast update via WebSocket
10. System → Update live ranking
```

### 7.4 Remote Device Voting Flow
```
1. Device → Connect to WebSocket /ws/device?deviceId=<id>
2. Device → Request active poll: { type: "get_active", showId }
3. Server → Return active poll data
4. Device → Display contestants for voting
5. Device → Submit vote via HTTP API
6. Server → Validate device and record vote
7. Server → Broadcast update via WebSocket
```

### 7.5 Validation Flow
```
1. Input Validation → Check required fields
2. Email Validation → Hunter.io API verification
3. Token Validation → JWT signature and expiry check
4. Duplicate Check → Prevent multiple votes per show
5. Business Rules → Round status, voting window
6. Database Constraints → Foreign keys, unique constraints
```

---

## 8. Assumptions

### 8.1 ข้อสมมติที่ชัดเจน
- **ASS-001**: ผู้ใช้มีอีเมลที่ถูกต้องและสามารถรับการยืนยันได้
- **ASS-002**: Hunter.io API มี quota เพียงพอสำหรับการตรวจสอบอีเมล
- **ASS-003**: อุปกรณ์ระยะไกลมีการเชื่อมต่ออินเทอร์เน็ตที่เสถียร
- **ASS-004**: ผู้ใช้เข้าใจว่า Vote Token มีอายุ 15 นาที
- **ASS-005**: Admin มีความรู้ในการจัดการการแข่งขัน

### 8.2 ข้อจำกัดที่ไม่ชัดเจน
- **LIM-001**: ไม่มีข้อมูลเกี่ยวกับจำนวนผู้ใช้สูงสุดที่รองรับ
- **LIM-002**: ไม่มีข้อมูลเกี่ยวกับ Backup/Recovery Policy
- **LIM-003**: ไม่มีข้อมูลเกี่ยวกับ Monitoring และ Alerting
- **LIM-004**: ไม่มีข้อมูลเกี่ยวกับ Data Retention Policy
- **LIM-005**: ไม่มีข้อมูลเกี่ยวกับ Audit Trail สำหรับการเปลี่ยนแปลงข้อมูล

### 8.3 สิ่งที่ต้องการข้อมูลเพิ่มเติม
- **REQ-001**: นโยบายการเก็บรักษาข้อมูลผู้ใช้ (GDPR/Privacy)
- **REQ-002**: ความต้องการด้าน Security Audit
- **REQ-003**: ความต้องการด้าน Performance Monitoring
- **REQ-004**: ความต้องการด้าน Disaster Recovery
- **REQ-005**: ความต้องการด้าน Multi-language Support

---

## 9. Technical Specifications

### 9.1 Environment Variables
- **DATABASE_URL**: PostgreSQL connection string
- **JWT_SECRET**: JWT signing secret
- **HUNTER_API_KEY**: Hunter.io API key for email verification
- **NODE_ENV**: Environment (development/production)

### 9.2 File Structure
```
vote_next_client/
├── src/
│   ├── api/          # API calls
│   ├── components/   # React components
│   ├── pages/        # Page components
│   ├── services/     # Business logic
│   └── routes/       # Router configuration

vote_next_server/
├── src/
│   ├── config/       # Configuration
│   ├── db/           # Database migrations
│   ├── modules/      # Feature modules
│   ├── middleware/   # Express middleware
│   ├── realtime/     # WebSocket handlers
│   └── utils/        # Utility functions
```

### 9.3 Deployment Architecture
- **Development**: Docker Compose with hot reload
- **Production**: 
  - Backend: Render (Node.js)
  - Frontend: Vercel (React)
  - Database: PostgreSQL (Render)

---

## 10. Conclusion

เอกสาร SRS นี้ครอบคลุมความต้องการทั้งหมดของระบบ VoteNext ตามที่พบใน codebase ปัจจุบัน ระบบถูกออกแบบมาเพื่อรองรับการโหวตหลายรูปแบบ พร้อมความปลอดภัยและประสิทธิภาพที่เหมาะสมสำหรับการใช้งานจริง การพัฒนาควรดำเนินการตามข้อกำหนดที่ระบุไว้เพื่อให้แน่ใจว่าระบบตรงตามความต้องการของผู้ใช้และมีคุณภาพสูง
