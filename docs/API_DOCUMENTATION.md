# OMS API & Real-Time Event Contract Specifications

> **Purpose:** Enterprise REST API reference and Socket.IO real-time event specification guide.  
> **Audience:** Backend Engineers, Mobile Developers, QA Automation Engineers.  
> **Owner:** API & Integration Engineering Team.  
> **Last Updated:** July 20, 2026  
> **Related Modules:** `mobile/src/shared/services/apiClient.ts`, `backend/src/modules/`  

---

## 1. Global Request Headers

All HTTP requests sent to the backend MUST include the following headers:

```http
Authorization: Bearer <JWT_TOKEN>
x-tenant-id: <COMPANY_ID>
x-device-id: <INSTALLATION_ID>
x-app-version: 1.0.0
x-platform: ios | android | web
Content-Type: application/json
```

---

## 2. Standard Response Format

Every REST API returns a standardized JSON envelope:

### Success Response Envelope (`HTTP 200 / 201`)
```json
{
  "status": "success",
  "message": "Operation completed successfully",
  "data": { ... }
}
```

### Error Response Envelope (`HTTP 4xx / 5xx`)
```json
{
  "status": "fail",
  "message": "Detailed human-readable error description",
  "errors": {
    "field": "Field specific validation error message"
  }
}
```

---

## 3. Core Endpoint Specifications

### 🔑 Authentication Module

#### `POST /api/v1/auth/login`
Authenticates a user and returns a JWT session token.
- **Request Body:**
  ```json
  {
    "email": "employee@company.com",
    "password": "Password123!",
    "companyCode": "GATECODE"
  }
  ```
- **Response Data (`200 OK`):**
  ```json
  {
    "status": "success",
    "data": {
      "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6...",
      "user": {
        "id": "GATECO-EMP-008",
        "name": "Rahul Kumawat",
        "email": "employee@company.com",
        "role": "employee",
        "companyId": "GATECODE"
      }
    }
  }
  ```

#### `GET /api/v1/employees/:id`
Retrieves employee profile information.
- **Response Data (`200 OK`):**
  ```json
  {
    "status": "success",
    "data": {
      "id": "GATECO-EMP-008",
      "name": "Rahul Kumawat",
      "designation": "Software Engineer",
      "department": "Engineering",
      "workStatus": "online",
      "avatar": "https://ik.imagekit.io/..."
    }
  }
  ```

---

### ⏰ Attendance Module

#### `POST /api/v1/attendance/punch`
Registers a GPS-verified Punch-In or Punch-Out.
- **Request Body:**
  ```json
  {
    "type": "In",
    "latitude": 26.9124,
    "longitude": 75.7873,
    "address": "Tech Park, Jaipur, RJ"
  }
  ```
- **Response Data (`200 OK`):**
  ```json
  {
    "status": "success",
    "data": {
      "date": "2026-07-20",
      "punchIn": "09:30 AM",
      "punchOut": null,
      "status": "Present"
    }
  }
  ```

#### `GET /api/v1/attendance/records?from=YYYY-MM-DD&to=YYYY-MM-DD`
Retrieves historical attendance records for the specified date range.

---

### 💬 Chat & Real-Time Module

#### `GET /api/v1/chat/conversations`
Lists all active threads and direct message conversations for the user.

#### `GET /api/v1/chat/conversations/:id/messages?limit=30`
Retrieves paginated messages for a conversation thread.

#### `POST /api/v1/chat/conversations/:id/messages`
Sends a new text, image, document, or audio voice message.
- **Request Body:**
  ```json
  {
    "type": "text",
    "content": "Hello team, here is the updated build.",
    "attachments": []
  }
  ```

---

## 4. Socket.IO Real-Time Event Contracts

### Client to Server Emitted Events

| Event Name | Payload Schema | Description |
| :--- | :--- | :--- |
| `user_chatscreen_changed` | `{ conversationId: string \| null }` | Emits active thread to disable notification sounds for open screen |
| `user:typing` | `{ conversationId: string }` | Emits typing status to active room participants |
| `user:stopped_typing` | `{ conversationId: string }` | Emits stopped typing event |

### Server to Client Received Events

| Event Name | Payload Schema | Action |
| :--- | :--- | :--- |
| `online_users_list` | `Array<{ id: string, name: string }>` | Populates initial online users map in `presenceStore` |
| `user_online` / `user:online` | `{ userId: string, name: string }` | Marks user as online in `presenceStore` |
| `user_offline` / `user:offline` | `{ userId: string }` | Marks user as offline in `presenceStore` |
| `new_message` | `MessageObject` | Triggers React Query invalidation & appends message |
| `message_read` | `{ messageId: string, readBy: string }` | Updates message read receipt ticks |
