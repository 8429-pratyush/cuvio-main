# Cuvio System Architecture & Technical Specifications

## 1. Executive Summary
Cuvio is a healthcare queue intelligence and hospital transparency network designed for Tier-1, Tier-2, and Tier-3 Indian healthcare ecosystems. The application bridges outpatient departments (OPDs), emergency ambulance fleets, and patients through synchronized real-time state machines, eliminating physical queues and bringing upfront pricing clarity to Indian healthcare.

---

## 2. Core Architecture Topology

```
┌─────────────────────────────────────────────────────────────┐
│                       Client Tier                           │
│  React 18 SPA + Vite + Tailwind CSS + Lucide + Three.js     │
│                                                             │
│  ┌────────────────┐  ┌────────────────┐  ┌───────────────┐  │
│  │ Patient Portal │  │ Hospital Admin │  │ Driver Fleet  │  │
│  └───────┬────────┘  └───────┬────────┘  └───────┬───────┘  │
└──────────┼───────────────────┼───────────────────┼──────────┘
           │                   │                   │
           ▼                   ▼                   ▼
┌─────────────────────────────────────────────────────────────┐
│                 Application & Security Tier                 │
│              Express Node.js / Serverless Proxy             │
│                                                             │
│  • Phone OTP & Verified Auth Management                     │
│  • Role-Based Access Control (RBAC)                         │
│  • Gemini AI Clinical Proxy (/api/gemini & /api/ai)         │
│  • Rate Limiting & Input Sanitization                       │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                        Data Layer                           │
│              Google Cloud Firestore + Storage               │
│                                                             │
│  • /users/{uid}             • /hospitals/{hospitalId}       │
│  • /bookings/{bookingId}    • /ambulanceBookings/{ambId}    │
│  • /doctors/{doctorId}      • /messages/{messageId}         │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. Data Entities & Firestore Collections

| Collection | Schema Keys | Access Rules |
|---|---|---|
| `users` | `uid`, `role`, `name`, `phone`, `insuranceProvider`, `approved` | Read/write restricted to owner `request.auth.uid == uid` |
| `hospitals` | `id`, `name`, `location`, `startsAt`, `currentQueueWait`, `charges` | Public read; write restricted to authenticated hospital admins |
| `doctors` | `id`, `hospitalId`, `name`, `specialty`, `fee`, `availability` | Public read; write restricted to hospital admin of `hospitalId` |
| `bookings` | `id`, `patientName`, `doctorId`, `hospitalId`, `tokenNumber`, `status` | Read by patient owner & hospital admin; updated on doctor call |
| `ambulanceBookings` | `id`, `pickupLocation`, `destinationId`, `status`, `driverName` | Read/write by requester, assigned hospital, and driver |
| `messages` | `id`, `clinicId`, `patientId`, `text`, `from`, `createdAt` | Real-time 2-way chat between patient and clinic desk |

---

## 4. Security Hardening & Zero-Trust Principles
1. **No Client-Side Secrets**: Gemini API keys and sensitive credentials run exclusively on the Express backend / serverless layer (`/api/gemini/*`). No raw keys are sent to the browser.
2. **Strict Firestore Rules**: Role-based access ensures patients cannot modify queue counters or clinic fee tariffs; hospitals cannot alter other clinics' records.
3. **DPDP Act 2023 Compliance**: Patient phone numbers and consultation transcripts are encrypted in transit and stored with consent logs.
