# 3. System Architecture

## 3.1 Overall High-Level System Architecture (C4 Model)

The Office Management System (OMS) employs a modern, decoupled, multi-tiered micro-service ready architecture. The application separates client rendering, stateless RESTful API orchestration, real-time WebSocket communication, caching layers, and persistence mechanisms.

```mermaid
C4Context
    title High-Level System Context Diagram for OMS

    Person(emp, "OMS User", "Employee, Manager, HR Admin, Executive")
    System(oms_ui, "OMS Frontend Web App", "React.js, Tailwind CSS, Vite, Socket.io Client")
    System(oms_api, "OMS Core Backend API", "Node.js, Express.js, JWT, Winston")
    SystemDb(mongodb, "MongoDB Primary Database", "Document database for application data")
    SystemDb(redis, "Redis In-Memory Cache & Pub/Sub", "Session cache, Rate limits, Socket adapter")
    System(push_service, "Web Push Service", "FCM / Apple Push / VAPID WebPush API")

    Rel(emp, oms_ui, "Interacts via Web Browser / Mobile Web", "HTTPS/WSS")
    Rel(oms_ui, oms_api, "Makes REST API calls & Socket Connections", "HTTPS / WSS")
    Rel(oms_api, mongodb, "Reads & Writes Data", "Mongoose ODM / TCP 27017")
    Rel(oms_api, redis, "Caches Data, Checks Sessions & Publishes Events", "ioredis / TCP 6379")
    Rel(oms_api, push_service, "Dispatches Background Web Push Notifications", "HTTPS / VAPID")
```

---

## 3.2 Frontend Architecture

The frontend is built using React.js (Vite build engine) utilizing functional components, custom hooks, and centralized state management via React Context API alongside specialized providers.

```mermaid
graph TD
    SubGraph_Frontend[React.js Single Page Application]
    App[App.jsx Main Component] --> AuthProvider[AuthContext - User State & Token Lifecycle]
    App --> SocketProvider[SocketContext - Real-time WebSocket Connection]
    App --> PermProvider[PermissionContext - Dynamic Role & Action Matrix]
    App --> ThemeProvider[ThemeContext - Dark/Light Glassmorphism Theme]
    
    AuthProvider --> Router[React Router v6 Protected Routes]
    PermProvider --> Guard[PermissionGuard Component]
    
    Guard --> Pages[Application Pages / Views]
    Pages --> Comp[Design System Components & Modals]
    Pages --> Services[Axios HTTP Service Layer with Interceptors]
    Services --> Interceptor[Request/Response JWT Auto-Refresh Interceptor]
```

---

## 3.3 Backend Architecture

The backend architecture follows Domain-Driven Modular Design pattern. Each domain module encapsulates its own routes, controllers, services, validation schemas, and database models.

```mermaid
graph TD
    ClientReq[HTTP Client Request] --> ExpressApp[Express Server Engine]
    ExpressApp --> Helmet[Security Headers - Helmet Middleware]
    ExpressApp --> RateLimiter[Redis Rate Limiter Middleware]
    ExpressApp --> CORS[CORS Origin Filter]
    ExpressApp --> AuthMiddleware[JWT Authentication & Bearer Verification]
    AuthMiddleware --> RBACMiddleware[Dynamic Permission Matrix Check]
    RBACMiddleware --> Router[Domain Module Route Handlers]
    
    Router --> AuthMod[Auth Module]
    Router --> EmpMod[Employee Module]
    Router --> AttMod[Attendance Module]
    Router --> PayMod[Payroll Module]
    Router --> KpiMod[KPI Module]
    Router --> TaskMod[Task & Project Module]
    
    AuthMod --> Controllers[Controllers & Business Logic]
    Controllers --> ServiceLayer[Service & Utility Layers]
    ServiceLayer --> MongooseODM[Mongoose Document Models]
    MongooseODM --> MongoDB[(MongoDB Cluster)]
```

---

## 3.4 Real-Time & Event Architecture (Socket.io & Redis Flow)

To ensure low-latency real-time synchronization across multi-instance backend deployments, OMS leverages Socket.io backed by Redis Pub/Sub Adapter.

```mermaid
sequenceDiagram
    autonumber
    participant ClientA as Client Web App A
    participant API1 as Backend Server Instance 1
    participant RedisPubSub as Redis Pub/Sub Broker
    participant API2 as Backend Server Instance 2
    participant ClientB as Client Web App B

    ClientA->>API1: Emit 'task:status_changed' (TaskId, NewStatus)
    API1->>API1: Validate & Update Task in MongoDB
    API1->>RedisPubSub: PUBLISH 'socket.io#room_project_101'
    RedisPubSub->>API2: Receive Event Notification
    API2->>ClientB: Broadcast 'task:updated' via WebSocket
    ClientB->>ClientB: UI updates Kanban board automatically
```

---

## 3.5 Authentication & Authorization Security Flow

OMS uses a dual-token authentication scheme (Access Token + Refresh Token) combined with an in-memory Redis token revocation list.

```mermaid
sequenceDiagram
    autonumber
    participant User as User Browser
    participant API as Express API Server
    participant Redis as Redis Cache
    participant DB as MongoDB

    User->>API: POST /api/v1/auth/login { email, password }
    API->>DB: Query User & Compare Password Hash (bcrypt)
    DB-->>API: Valid User Record & Permissions
    API->>API: Generate Access Token (15m) & Refresh Token (7d)
    API->>Redis: Store Refresh Token & Session Metadata
    API-->>User: Set Refresh Token HTTP-Only Cookie + Return Access Token JSON

    Note over User, API: Subsequent API Requests
    User->>API: GET /api/v1/employees (Header: Bearer AccessToken)
    API->>API: Verify JWT Signature & Expiry
    API->>API: Check Permission Matrix (e.g. 'employees:read')
    API->>DB: Execute Query
    DB-->>API: Result Payload
    API-->>User: 200 OK Response
```

---

## 3.6 Web Push & Real-Time Notification Pipeline

```mermaid
graph LR
    Trigger[Business Event e.g. Leave Approved / Task Assigned] --> EvtHandler[Notification Engine]
    EvtHandler --> DBWrite[Save In-App Notification to MongoDB]
    EvtHandler --> SocketCheck{User Connected on Socket?}
    
    SocketCheck -- Yes --> SocketEmit[Emit Real-time WebSocket Event to Browser]
    SocketCheck -- No / Background --> PushCheck{VAPID Subscription Exists?}
    
    PushCheck -- Yes --> WebPush[Dispatch Web Push payload via VAPID / FCM]
    WebPush --> OSNotif[Browser / OS System Notification Popup]
```
