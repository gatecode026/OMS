# 7. Security, Testing, Deployment & Operations

## 7.1 Security Architecture & Defense Matrix

OMS implements a Defense-in-Depth security framework satisfying enterprise compliance standards (ISO 27001, SOC2, GDPR).

```mermaid
graph TD
    Client[Incoming Client Request] --> TLS[TLS 1.3 Encryption Node]
    TLS --> RateLimit[Redis Distributed Rate Limiter - 100 req/min per IP]
    RateLimit --> WAF[Security Headers - Helmet, CORS, CSP]
    WAF --> InputSanitizer[Express Sanitizer - Mongo Injection & XSS Strip]
    InputSanitizer --> AuthGuard[JWT Verification & RSA Signature Check]
    AuthGuard --> RBACGuard[Dynamic Permission Matrix Interceptor]
    RBACGuard --> FieldDecrypt[Field-Level Decryption - AES-256-GCM]
    FieldDecrypt --> Controller[Business Logic Execution]
    Controller --> AuditLog[Write Event to Immutable Security Audit Log]
```

### 7.1.1 Core Security Enforcement Policies
1. **JWT & Session Management**: RSA256 signed access tokens (15-minute validity). Refresh tokens stored in HTTP-Only, SameSite=Strict, Secure cookies with automatic revocation lists stored in Redis.
2. **Role-Based Access Control (RBAC)**: Least Privilege enforcement using resource-action checking middleware (`checkPermission('payroll:process')`).
3. **Data Encryption**: AES-256-GCM field-level encryption for sensitive attributes (bank accounts, tax IDs, salary amounts).
4. **API Protection**: Redis token bucket rate limiting preventing brute force attacks; strict CORS whitelist origin checks.
5. **Input Validation & Sanitization**: Strict schema validation using `express-validator` and string escaping via `DOMPurify`.

---

## 7.2 Testing Strategy & Test Suites

The application mandates strict quality gates before code merging:

```mermaid
graph LR
    Unit[Unit Tests - Jest 85% Code Coverage] --> Integration[Integration Tests - Supertest API Specs]
    Integration --> E2E[End-to-End Tests - Cypress / Playwright]
    E2E --> Perf[Performance Tests - k6 Load Testing]
    Perf --> Sec[Security Audit - OWASP ZAP Automated Scan]
```

### 7.2.1 Automated Test Suites Summary
- **Unit Testing**: Jest for business services, financial calculation helpers, and utility formatters. Target coverage >= 85%.
- **Integration Testing**: Supertest for REST endpoint verification against a isolated MongoDB Memory Server instance.
- **E2E Testing**: Cypress running against automated Docker container setup testing critical paths (Login -> Punch Attendance -> Apply Leave -> Approve).
- **Performance Load Testing**: k6 script simulating 500 concurrent WebSocket connections and 1,000 requests/sec API throughput.

---

## 7.3 Deployment & DevOps Operations Guide

### 7.3.1 Environment Configuration (`.env`)
```ini
# Server Configuration
PORT=5000
NODE_ENV=production
APP_URL=https://oms.company.com

# Database Configurations
MONGO_URI=mongodb://mongodb_user:secure_password@mongo-primary:27017/oms_db?authSource=admin
REDIS_URI=redis://:redis_password@redis-cluster:6379

# Security & Secrets
JWT_SECRET=super_secret_rsa_private_key_pem_encoded
JWT_EXPIRES_IN=15m
REFRESH_TOKEN_SECRET=refresh_secret_key_string
ENCRYPTION_KEY=32_byte_hex_encoded_aes_key

# WebPush VAPID Keys
VAPID_PUBLIC_KEY=BEl62iUY...
VAPID_PRIVATE_KEY=z8Yp...
VAPID_SUBJECT=mailto:admin@company.com
```

### 7.3.2 Docker Production Deployment

```dockerfile
# Multi-stage build for OMS Backend
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app ./
EXPOSE 5000
USER node
CMD ["node", "server.js"]
```

### 7.3.3 Production Architecture Setup
1. **Nginx Reverse Proxy**: Terminate SSL (Certbot / Let's Encrypt), proxy HTTP requests to Node API (`port 5000`) and WebSocket connections (`/socket.io/`).
2. **PM2 Cluster Mode**: Run backend instances matching physical CPU core count (`pm2 start server.js -i max --name oms-backend`).
3. **MongoDB Replica Set**: 3-node replica set with automated failover and daily encrypted backup snapshots.

---

## 7.4 Troubleshooting & Diagnostic Guide

| Failure Scenario | Root Cause Analysis | Resolution Action Steps |
| :--- | :--- | :--- |
| **`401 Unauthorized` on all requests** | JWT Access Token expired or RSA public key mismatch. | Verify client refresh token endpoint call; check server system time synchronization (NTP). |
| **Socket Connection Failed (`Transport unknown`)** | Nginx missing WebSocket upgrade headers. | Add `proxy_set_header Upgrade $http_upgrade;` and `proxy_set_header Connection "Upgrade";` in Nginx config. |
| **`429 Too Many Requests`** | Redis rate limiter block triggered by client burst. | Inspect client API retry loops; flush IP key in Redis if verified administrator false positive. |
| **Attendance Punch Geo Error** | Client HTML5 geolocation denied or coordinates outside geofence. | Verify browser location permissions; check office radius configuration in Company Settings. |
| **Database Connection Timeout** | MongoDB replica set election in progress or connection pool exhausted. | Increase `maxPoolSize` in Mongoose connection string; verify network security group port 27017. |

---

## 7.5 Version History & Changelog

| Version | Release Date | Summary of Changes | Author / Approver |
| :--- | :--- | :--- | :--- |
| **v1.0.0** | 2025-01-15 | Initial Enterprise Release (Auth, Employees, Attendance, Basic Payroll) | OMS Architecture Team |
| **v1.5.0** | 2025-06-10 | Added Project & Task Kanban Boards, Socket.io Real-time engine | Lead Engineer |
| **v2.0.0** | 2025-11-20 | Integrated Dynamic Permission Matrix, Web Push API, KPI Appraisals | Solution Architect |
| **v2.5.0** | 2026-04-01 | Added Redis Distributed Caching, Multi-tenant Company Settings, Audit Logs | DevOps & Security Lead |

---

## 7.6 Enterprise Roadmap & Future Expansion

1. **Microservices Migration**: Refactor monolithic Express modules into independent containerized services (Auth Service, HCM Service, Payroll Service, Realtime Service) connected via gRPC.
2. **AI-Powered Analytics**: Implement LLM-assisted daily work report summarization, automated attendance anomaly detection, and predictive employee churn analytics.
3. **Offline Mobile Native Apps**: Deploy React Native mobile builds with offline SQLite storage and background synchronization.
