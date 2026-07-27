# 6. Workflow & UI Specifications

## 6.1 Enterprise End-to-End Workflows

This section provides visual flowcharts and sequence diagrams detailing the 12 core application workflows executed in OMS.

### 6.1.1 Geo-Fenced Web Attendance Punching Workflow
```mermaid
flowchart TD
    Start([Employee Clicks Punch In/Out]) --> Geo[Browser fetches HTML5 Geolocation]
    Geo --> IPCheck[Express Backend validates Request IP against Office IP Whitelist]
    IPCheck -- Valid IP --> RadiusCheck[Check Coordinates against Office Geofence Radius]
    IPCheck -- Invalid IP & Geo required --> RejectIP[Reject Punch: Unauthorized Location]
    
    RadiusCheck -- Within Radius --> ShiftRule[Evaluate Punch Time against Employee Shift Schedule]
    RadiusCheck -- Outside Radius --> RejectGeo[Reject Punch: Outside Geofence Boundary]
    
    ShiftRule -- Before Grace Period --> MarkPresent[Set Status: PRESENT]
    ShiftRule -- After Grace Period --> MarkLate[Set Status: LATE]
    ShiftRule -- Beyond Half-Day threshold --> MarkHalfDay[Set Status: HALF_DAY]
    
    MarkPresent --> Save[Save Attendance Record to MongoDB]
    MarkLate --> Save
    MarkHalfDay --> Save
    
    Save --> SocketBroadcast[Emit Real-time 'attendance:updated' Socket Event]
    SocketBroadcast --> End([UI Updates Status Badge])
```

---

### 6.1.2 Multi-Tier Leave Request & Approval Workflow
```mermaid
sequenceDiagram
    autonumber
    participant Emp as Employee Browser
    participant API as OMS Backend API
    participant Mgr as Department Manager
    participant HR as HR Admin
    participant Socket as Socket.io Server

    Emp->>API: POST /api/v1/leaves { type, startDate, endDate, reason }
    API->>API: Validate Leave Balance Sandbox & Working Days
    API->>API: Create Leave Document (Status: PENDING_MANAGER)
    API->>Socket: Dispatch Notification to Manager
    Socket-->>Mgr: Push In-App Alert: New Leave Request

    alt Manager Approves
        Mgr->>API: PATCH /api/v1/leaves/:id/approve-manager
        API->>API: Update Status: PENDING_HR
        API->>Socket: Dispatch Notification to HR
        Socket-->>HR: Push In-App Alert: Pending Final HR Approval
        
        alt HR Approves
            HR->>API: PATCH /api/v1/leaves/:id/approve-hr
            API->>API: Deduct Leave Balance & Update Status: APPROVED
            API->>Socket: Notify Employee (Status: APPROVED)
            Socket-->>Emp: Push Notification: Leave Approved
        else HR Rejects
            HR->>API: PATCH /api/v1/leaves/:id/reject
            API->>API: Update Status: REJECTED
            API->>Socket: Notify Employee (Status: REJECTED)
        end
    else Manager Rejects
        Mgr->>API: PATCH /api/v1/leaves/:id/reject
        API->>API: Update Status: REJECTED
        API->>Socket: Notify Employee (Status: REJECTED)
    end
```

---

### 6.1.3 Monthly Automated Payroll Calculation Workflow
```mermaid
flowchart TD
    Cron([Cron Job Triggers on 1st of Month 00:00]) --> ActiveEmp[Fetch All Active Employees]
    ActiveEmp --> Loop[Loop Through Each Employee]
    
    Loop --> SalaryStruct[Fetch Base Salary & Allowance Structure]
    SalaryStruct --> AttSummary[Aggregate Past Month Attendance & Approved Leaves]
    AttSummary --> UnpaidDays[Calculate Unpaid Absent Days]
    
    UnpaidDays --> Deduction[Compute Daily Salary Deduction = BaseSalary / DaysInMonth * UnpaidDays]
    Deduction --> TaxCompute[Apply Statutory Tax Slabs & PF/ESI Deductions]
    TaxCompute --> NetPay[Compute Net Salary = Base + Allowances - Deductions]
    
    NetPay --> CreatePayslip[Create Payroll Record in MongoDB Status: GENERATED]
    CreatePayslip --> RenderPDF[Asynchronously Generate Downloadable PDF Payslip]
    RenderPDF --> NextEmp{More Employees?}
    
    NextEmp -- Yes --> Loop
    NextEmp -- No --> HRReview[Notify HR Admin: Payroll Generation Complete]
    HRReview --> ApprovePayroll[HR Reviews & Approves Payroll Disbursement]
```

---

## 6.2 UI Screen Specifications

OMS features a responsive, high-contrast, accessibility-compliant user interface built with React, Tailwind CSS, and glassmorphism styling patterns.

### 6.2.1 Core Screens Inventory

| Screen ID | Screen Name | Key UI Components | Buttons & Controls | Primary API Endpoint |
| :--- | :--- | :--- | :--- | :--- |
| `SCR-01` | **Login View** | Card Container, Brand Logo, Login Form, Password Visibility Toggle, MFA Input Modal | `Sign In`, `Forgot Password?`, `Submit MFA` | `POST /api/v1/auth/login` |
| `SCR-02` | **Executive Dashboard** | Metric Cards, Revenue vs Cost Chart, Attendance Pie Chart, Active Projects Table | `Date Range Filter`, `Export PDF`, `Refresh Data` | `GET /api/v1/dashboard/executive` |
| `SCR-03` | **Employee Directory** | Filter Drawer, Search Bar, Grid/List Toggle, Employee Table, Action Menu | `+ Add Employee`, `Filter`, `Export CSV`, `View Profile` | `GET /api/v1/employees` |
| `SCR-04` | **Web Punch Portal** | Live Digital Clock, Geo-location Status Indicator, Action Card, Today's Punch Timeline | `Check In Now`, `Check Out`, `Request Correction` | `POST /api/v1/attendance/check-in` |
| `SCR-05` | **Leave Management** | Quota Summary Widgets, Application Form Modal, Approval Timeline, Leave History Table | `+ Apply Leave`, `Approve`, `Reject`, `Cancel` | `GET /api/v1/leaves` |
| `SCR-06` | **Kanban Task Board** | Drag-and-Drop Columns (`To Do`, `In Progress`, `Review`, `Done`), Task Cards, Member Avatars | `+ Create Task`, `Filter by Assignee`, `Sort Priority` | `GET /api/v1/tasks` |
| `SCR-07` | **Payroll Processing** | Salary Summary Bar, Status Badge, Bulk Approval Checkboxes, Payslip Drawer | `Process Month Payroll`, `Download Payslip PDF`, `Approve All` | `POST /api/v1/payroll/process` |
| `SCR-08` | **Roles & Permission Matrix**| Dynamic Grid Matrix (Roles vs Resources), Checkbox Toggles, Audit History | `Save Changes`, `Add Custom Role`, `Reset Defaults` | `PUT /api/v1/roles/permission-matrix` |
