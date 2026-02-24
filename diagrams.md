# VoteNext System Diagrams

---

## 1. ER Diagram (Entity-Relationship Diagram)

```mermaid
erDiagram
    admins ||--o{ shows : creates
    admins ||--o{ rounds : creates
    shows ||--o{ rounds : contains
    shows ||--o{ contestants : has
    rounds ||--o{ round_contestants : includes
    contestants ||--o{ round_contestants : participates
    rounds ||--o{ online_votes : receives
    rounds ||--o{ remote_votes : receives
    rounds ||--o{ judge_scores : receives
    contestants ||--o{ online_votes : gets
    contestants ||--o{ remote_votes : gets
    contestants ||--o{ judge_scores : gets
    remote_devices ||--o{ remote_votes : submits
    shows ||--o{ votes : restricts

    admins {
        uuid id PK
        varchar email UK
        varchar password_hash
        varchar full_name
        text profile_img
        timestamp created_at
    }

    shows {
        uuid id PK
        varchar title
        text description
        uuid created_by FK
        boolean finalized
        uuid[] final_lineup
        timestamp created_at
    }

    rounds {
        uuid id PK
        uuid show_id FK
        varchar round_name
        text description
        timestamp start_time
        timestamp end_time
        varchar status
        uuid created_by FK
        timestamp created_at
        varchar vote_mode
        varchar public_slug UK
        varchar counter_type
        boolean results_computed
    }

    contestants {
        uuid id PK
        uuid show_id FK
        varchar stage_name
        text description
        text image_url
        integer order_number
        timestamp created_at
    }

    round_contestants {
        uuid id PK
        uuid round_id FK
        uuid contestant_id FK
        integer score
        integer online_votes
        integer remote_votes
        numeric judge_score
        numeric total_score
        integer rank
        timestamp computed_at
        timestamp created_at
    }

    votes {
        uuid id PK
        uuid show_id FK
        varchar email
        timestamp created_at
    }

    online_votes {
        uuid id PK
        uuid round_id FK
        uuid contestant_id FK
        varchar voter_email
        timestamp created_at
    }

    remote_votes {
        uuid id PK
        uuid round_id FK
        uuid contestant_id FK
        uuid remote_device_id FK
        timestamp created_at
    }

    judge_scores {
        uuid id PK
        uuid round_id FK
        uuid contestant_id FK
        numeric score
        timestamp created_at
    }

    remote_devices {
        uuid id PK
        varchar device_id UK
        varchar owner_label
        timestamp created_at
    }
```

---

## 2. System Architecture Diagram

```mermaid
graph TB
    subgraph "Client Layer"
        A[Admin Panel] --> B[React Frontend]
        C[Public Voting Interface] --> B
        D[Remote Device] --> B
    end

    subgraph "API Gateway"
        E[Express.js Server]
        F[CORS Middleware]
        G[Rate Limiting]
        H[Authentication JWT]
    end

    subgraph "Business Logic Layer"
        I[Admin Service]
        J[Public Service]
        K[Room Service]
        L[Round Service]
        M[Device Service]
        N[Scoring Service]
    end

    subgraph "Real-time Layer"
        O[WebSocket Server]
        P[Socket.io]
        Q[Device WebSocket]
    end

    subgraph "Data Layer"
        R[PostgreSQL Database]
        S[File Storage]
        T[Migration Scripts]
    end

    subgraph "External Services"
        U[Hunter.io API]
        V[Cloudinary CDN]
    end

    B --> E
    E --> F
    F --> G
    G --> H
    H --> I
    H --> J
    H --> K
    H --> L
    H --> M

    I --> R
    J --> R
    K --> R
    L --> R
    M --> R
    N --> R

    J --> U
    K --> V

    O --> P
    O --> Q
    P --> B
    Q --> D

    E --> O
    M --> O

    R --> T
    S --> V
```

---

## 3. Data Flow Diagram

```mermaid
flowchart TD
    A[Admin Login] --> B[JWT Token]
    B --> C[Create Show]
    C --> D[Add Contestants]
    D --> E[Create Round]
    E --> F[Open Poll]
    
    G[Public User] --> H[Access Voting Page]
    H --> I[Verify Email]
    I --> J[Hunter.io API]
    J --> K[Generate Vote Token]
    K --> L[Submit Vote]
    L --> M[Record Online Vote]
    
    N[Remote Device] --> O[Connect WebSocket]
    O --> P[Sync Active Poll]
    P --> Q[Submit Remote Vote]
    Q --> R[Record Remote Vote]
    
    M --> S[Calculate Scores]
    R --> S
    S --> T[Update Rankings]
    T --> U[Broadcast Updates]
    U --> V[Admin Dashboard]
    U --> W[Public Rankings]
    U --> X[Remote Devices]
```

---

## 4. API Flow Diagram

```mermaid
sequenceDiagram
    participant Admin as Admin Panel
    participant API as Express API
    participant DB as PostgreSQL
    participant WS as WebSocket
    participant Public as Public User
    participant Device as Remote Device

    Admin->>API: POST /api/admin/login
    API->>DB: Validate credentials
    DB-->>API: Admin data
    API-->>Admin: JWT Token

    Admin->>API: POST /api/rooms
    API->>DB: Create show & round
    DB-->>API: Show/Round IDs
    API-->>Admin: Success response

    Admin->>API: POST /api/admin/polls/open
    API->>DB: Update round status
    API->>WS: Broadcast poll open
    WS-->>Device: Active poll notification

    Public->>API: GET /api/public/vote/:slug
    API->>DB: Get round data
    DB-->>API: Round info
    API-->>Public: Voting page

    Public->>API: POST /api/public/vote/verify-email
    API->>API: Hunter.io verification
    API-->>Public: Vote token

    Public->>API: POST /api/public/vote
    API->>DB: Record vote
    API->>WS: Broadcast vote update
    WS-->>Admin: Live score update
    WS-->>Public: Live ranking update

    Device->>WS: Connect /ws/device
    Device->>API: Submit remote vote
    API->>DB: Record vote
    API->>WS: Broadcast update
```

---

## 5. Deployment Architecture Diagram

```mermaid
graph TB
    subgraph "Production Environment"
        subgraph "Frontend"
            A[Vercel - React App]
        end
        
        subgraph "Backend"
            B[Render - Node.js Server]
            C[PostgreSQL Database]
            D[Redis Cache]
        end
        
        subgraph "Storage"
            E[Cloudinary - Images]
            F[Render File Storage]
        end
        
        subgraph "Monitoring"
            G[Render Logs]
            H[Error Tracking]
        end
    end

    subgraph "Development Environment"
        I[Docker Compose]
        J[Local PostgreSQL]
        K[Hot Reload Server]
        L[Volume Mounts]
    end

    A --> B
    B --> C
    B --> D
    B --> E
    B --> F
    B --> G
    B --> H

    I --> J
    I --> K
    I --> L
```

---

## 6. Security Architecture Diagram

```mermaid
graph LR
    subgraph "Security Layers"
        A[CORS Configuration]
        B[Rate Limiting]
        C[JWT Authentication]
        D[Input Validation]
        E[Email Verification]
        F[Database Constraints]
    end

    subgraph "Data Protection"
        G[Password Hashing]
        H[Token Expiration]
        I[SQL Injection Prevention]
        J[XSS Protection]
    end

    subgraph "Access Control"
        K[Admin Role]
        L[Public Access]
        M[Device Authentication]
        N[Vote Uniqueness]
    end

    A --> B
    B --> C
    C --> D
    D --> E
    E --> F

    G --> H
    H --> I
    I --> J

    K --> L
    L --> M
    M --> N
```

---

## 7. Component Interaction Diagram

```mermaid
graph TB
    subgraph "Frontend Components"
        A[Admin Dashboard]
        B[Create Poll Form]
        C[Results Display]
        D[Public Voting Page]
        E[Email Verification]
        F[Live Rankings]
    end

    subgraph "Backend Services"
        G[Auth Service]
        H[Room Service]
        I[Vote Service]
        J[Scoring Service]
        K[Notification Service]
    end

    subgraph "Data Models"
        L[Show Model]
        M[Round Model]
        N[Contestant Model]
        O[Vote Model]
        P[Device Model]
    end

    A --> G
    B --> H
    C --> J
    D --> I
    E --> I
    F --> K

    G --> L
    H --> M
    I --> O
    J --> N
    K --> P
```

---

## 8. State Management Diagram

```mermaid
stateDiagram-v2
    [*] --> Pending: Create Round
    Pending --> Voting: Open Poll
    Voting --> Closed: Close Poll
    Voting --> Voting: Submit Vote
    Closed --> [*]: Archive

    state Voting {
        [*] --> EmailVerification: Start Vote
        EmailVerification --> TokenGenerated: Email Verified
        TokenGenerated --> VoteSubmitted: Submit Vote
        VoteSubmitted --> [*]: Vote Complete
    }

    state DeviceFlow {
        [*] --> Connected: Device Connect
        Connected --> SyncPoll: Request Active Poll
        SyncPoll --> VoteSubmitted: Submit Vote
        VoteSubmitted --> [*]: Vote Complete
    }
```

---

## Legend

### Symbols
- `PK`: Primary Key
- `FK`: Foreign Key
- `UK`: Unique Key
- `||--o{`: One-to-Many relationship
- `-->`: Data flow or dependency

### Colors (in rendered diagrams)
- **Blue**: Database entities
- **Green**: API services
- **Orange**: External services
- **Purple**: Real-time components
- **Red**: Security components

### Notes
- All UUID fields use `uuid_generate_v4()` as default
- Timestamps use `TIMESTAMPTZ DEFAULT now()`
- All foreign keys have `ON DELETE CASCADE` where specified
- WebSocket connections use Socket.io for real-time updates
