# Cuvio Horizontal & Vertical Scaling Blueprint

## 1. Workload Characteristics
- **Peak Hours**: 08:00 - 12:00 IST (Morning OPD registration surge) and 16:00 - 19:00 IST (Evening clinics).
- **Read-Heavy vs Write-Heavy**:
  - Read: 85% (patients refreshing queue position, viewing hospital tariffs, checking doctor availability).
  - Write: 15% (token allocation, doctor "Call Next", ambulance dispatches).

---

## 2. Infrastructure Scaling Strategy

### A. Frontend Layer (Edge CDN Delivery)
- Deployed via Vercel Edge Network or Cloudflare Pages.
- Dynamic caching of static assets (JS chunks, 3D body models, images) with `stale-while-revalidate`.
- Client bundle code-splitting: `React.lazy` on `PatientDashboard`, `AdminPanel`, and `AmbulanceDriverPanel`.

### B. Real-Time Queue Tier (Firestore & WebSockets)
- Firestore real-time listeners (`onSnapshot`) scoped with strict `limit()` and composite indexes (`hospitalId`, `date`, `status`).
- Dedicated queue partition keys per doctor/cabin (`kolkataDate_docId`) to avoid hot-spotting document writes.

### C. Backend API & AI Microservices
- Autoscaling serverless endpoints on Vercel Functions / Google Cloud Run (min instances: 2 during peak hours, 0 during night).
- Redis / Cloud Memorystore for caching AI clinical responses and hospital procedure pricing lookups.

---

## 3. Disaster Recovery & Failover
- Automated daily Firestore database export to Cloud Storage buckets with lifecycle retention (30 days).
- Offline-first cache fallback: LocalStorage replica enables patients and staff to view existing tokens during intermittent network dropouts.
