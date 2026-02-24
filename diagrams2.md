# VoteNext System Diagrams (Mermaid Only)

## 1) System Context Diagram

```mermaid
graph TB
    subgraph "External Actors"
        A[Admin]
        B[Public User]
        C[Remote Device]
    end
    
    subgraph "External Services"
        D[Hunter.io API]
    end
    
    subgraph "Hosting Platform"
        E[Vercel - Frontend]
        F[Render - Backend]
        G[PostgreSQL Database]
    end
    
    subgraph "VoteNext System"
        H[VoteNext Voting System]
    end
    
    A --> H
    B --> H
    C --> H
    H --> D
    H --> E
    H --> F
    H --> G
```

## 2) High-Level Architecture Diagram

```mermaid
graph TB
    subgraph "Client Layer"
        A[React SPA]
        B[Admin Panel]
        C[Public Voting Interface]
        D[Remote Device Client]
    end
    
    subgraph "Server Layer"
        E[Express.js API]
        F[WebSocket Server]
        G[Authentication Middleware]
        H[CORS Middleware]
    end
    
    subgraph "Data Layer"
        I[PostgreSQL Database]
        J[File Storage]
    end
    
    A --> E
    B --> E
    C --> E
    D --> F
    
    E --> G
    E --> H
    E --> I
    E --> J
    
    F --> I
```

## 3) Use Case Diagram

```mermaid
graph TB
    subgraph "Actors"
        A[Admin]
        B[Public User]
        C[Remote Device]
    end
    
    subgraph "Admin Use Cases"
        UC1[Login]
        UC2[Create Show]
        UC3[Add Contestants]
        UC4[Create Round]
        UC5[Open Poll]
        UC6[Close Poll]
        UC7[View Results]
        UC8[Manage Profile]
    end
    
    subgraph "Public User Use Cases"
        UC9[Access Voting Page]
        UC10[Verify Email]
        UC11[Submit Vote]
        UC12[View Rankings]
    end
    
    subgraph "Remote Device Use Cases"
        UC13[Connect Device]
        UC14[Sync Active Poll]
        UC15[Submit Remote Vote]
    end
    
    A --> UC1
    A --> UC2
    A --> UC3
    A --> UC4
    A --> UC5
    A --> UC6
    A --> UC7
    A --> UC8
    
    B --> UC9
    B --> UC10
    B --> UC11
    B --> UC12
    
    C --> UC13
    C --> UC14
    C --> UC15
```

## 4) ER Diagram

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

## 5) Sequence Diagrams

### 5.1) Admin Login Flow

```mermaid
sequenceDiagram
    participant Admin as Admin Panel
    participant API as Express API
    participant DB as PostgreSQL
    
    Admin->>API: POST /api/admin/login
    Note over Admin,API: { email, password }
    
    API->>DB: SELECT * FROM admins WHERE email = ?
    DB-->>API: Admin record
    
    API->>API: Verify password hash
    API->>API: Generate JWT token
    
    API-->>Admin: { success: true, token, admin }
    Note over Admin: Store JWT token
```

### 5.2) Public Voting Flow

```mermaid
sequenceDiagram
    participant User as Public User
    participant API as Express API
    participant Hunter as Hunter.io API
    participant DB as PostgreSQL
    participant WS as WebSocket
    
    User->>API: GET /api/public/vote/:slug
    API->>DB: Get round data
    DB-->>API: Round info
    API-->>User: Voting page
    
    User->>API: POST /api/public/vote/verify-email
    Note over User,API: { email }
    
    API->>Hunter: Verify email
    Hunter-->>API: Email validation result
    
    API->>API: Generate vote token (15 min)
    API-->>User: { success: true, voteToken }
    
    User->>API: POST /api/public/vote
    Note over User,API: { contestantId, voteToken }
    
    API->>API: Verify JWT token
    API->>DB: Check duplicate vote
    API->>DB: INSERT online_votes
    
    API->>WS: Broadcast vote update
    WS-->>API: Update sent
    
    API-->>User: { success: true }
```

### 5.3) Remote Device Voting Flow

```mermaid
sequenceDiagram
    participant Device as Remote Device
    participant WS as WebSocket
    participant API as Express API
    participant DB as PostgreSQL
    
    Device->>WS: Connect /ws/device?deviceId=<id>
    WS-->>Device: { type: "connected", deviceId }
    
    Device->>WS: { type: "get_active", showId }
    WS->>API: Get active poll
    API->>DB: SELECT active rounds
    DB-->>API: Active poll data
    API-->>WS: Poll info
    WS-->>Device: { type: "active", payload }
    
    Device->>API: POST /api/device/vote
    Note over Device,API: { contestantId, deviceId }
    
    API->>DB: Validate device
    API->>DB: INSERT remote_votes
    
    API->>WS: Broadcast vote update
    WS-->>Device: Vote confirmation
    
    API-->>Device: { success: true }
```

## 6) Activity Diagram - Online Voting

```mermaid
flowchart TD
    A[Start] --> B[Access Voting Page]
    B --> C[Display Contestants]
    C --> D[User Enters Email]
    D --> E{Email Valid?}
    
    E -->|No| F[Show Error]
    F --> D
    
    E -->|Yes| G[Call Hunter.io API]
    G --> H{Email Verified?}
    
    H -->|No| I[Show Verification Error]
    I --> D
    
    H -->|Yes| J[Generate Vote Token]
    J --> K[Send Token to User]
    K --> L[User Selects Contestant]
    L --> M[Submit Vote]
    
    M --> N{Token Valid?}
    N -->|No| O[Token Expired Error]
    O --> P[User Re-verifies Email]
    P --> J
    
    N -->|Yes| Q{Already Voted?}
    Q -->|Yes| R[Duplicate Vote Error]
    R --> S[End]
    
    Q -->|No| T[Record Vote]
    T --> U[Broadcast Update]
    U --> V[Show Success Message]
    V --> S
```

## 7) Deployment Diagram

```mermaid
graph TB
    subgraph "Production"
        subgraph "Frontend"
            A[Vercel - React SPA]
        end
        
        subgraph "Backend"
            B[Render - Express.js]
            C[Render - PostgreSQL]
            D[Render - WebSocket]
        end
        
        subgraph "External"
            E[Hunter.io API]
            F[Cloudinary CDN]
        end
    end
    
    subgraph "Development"
        G[Docker Compose]
        H[Local PostgreSQL]
        I[Node.js Dev Server]
        J[React Dev Server]
    end
    
    A --> B
    B --> C
    B --> D
    B --> E
    B --> F
    
    G --> H
    G --> I
    G --> J
    I --> H
    J --> I
```
