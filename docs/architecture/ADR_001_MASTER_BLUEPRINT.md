# ADR 001: OMS Enterprise Calling & AI Collaboration Platform Master Blueprint

* **Status**: **ACCEPTED & CERTIFIED**
* **Date**: 2026-07-22
* **Scope**: All Engineering Teams (Mobile, Web, Backend, AI, DevSecOps, QA, SRE)

---

## 🏛️ Context & Architectural Mandate

The **OMS Enterprise Calling Platform** is a cloud-native, multi-tenant Unified Communications as a Service (UCaaS), Contact Center (CCaaS), AI Intelligence, and Digital Workforce platform built to power high-concurrency enterprise collaboration.

---

## 📋 Core Architectural Decisions

### 1. Mobile & WebRTC Calling Engine (PRD 01, 03, 04, 05)
* Modular state machine (`idle` -> `initiating` -> `ringing` -> `connected` -> `ended`).
* Audio route management (`speaker` vs `earpiece` vs `bluetooth`).
* Native SVG whiteboard (`react-native-svg`), PanResponder drawing, and PDF slide presenter.

### 2. Backend & Zero Trust Security (PRD 02, 07, 08)
* Multi-tenant MongoDB schemas with `runWithTenant(companyId, fn)` isolation.
* JWT Socket.IO handshake authentication, NoSQL/XSS payload sanitization, SRTP/DTLS media encryption.

### 3. AI Intelligence & Model Context Protocol (PRD 10, 16)
* Live subtitle streaming, NLP executive meeting summary generation, and Model Context Protocol (MCP) server exposing OMS Task, Attendance, and Meeting tools.

### 4. Media Recording, Contact Center & UCaaS Federation (PRD 13, 14, 15)
* Cloud storage abstraction layer with HMAC signed 1-hour playback tokens.
* Telephony queue manager with least-busy agent routing and IVR menu execution.
* Inter-organization federation gateway with domain trust verification.

### 5. DevSecOps CI/CD Pipeline (PRD 18, 19)
* GitHub Actions pipeline ([`.github/workflows/ci.yml`](file:///r:/OMS/.github/workflows/ci.yml)) executing linting, TypeScript compilation, SAST security audit, 95% Jest coverage gate, and multi-stage Docker build.
