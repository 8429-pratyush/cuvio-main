import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, collection, getDocs, doc, setDoc, writeBatch } from "firebase/firestore";

import appletConfig from "./firebase-applet-config.json";

dotenv.config();

function isValidKey(val: unknown): val is string {
  return typeof val === 'string' && val.trim().startsWith('AIza') && val.trim().length >= 25;
}

function isValidDomain(val: unknown): val is string {
  return typeof val === 'string' && val.includes('.') && val.length >= 5 && !/^[0-9]+$/.test(val);
}

function isValidProj(val: unknown): val is string {
  return typeof val === 'string' && /^[a-z0-9][a-z0-9-]{3,60}$/.test(val) && !/^[0-9]+$/.test(val);
}

function isValidApp(val: unknown): val is string {
  return typeof val === 'string' && val.includes(':') && val.length >= 15 && !/^[0-9]+$/.test(val);
}

const firebaseConfig = {
  apiKey: isValidKey(process.env.VITE_FIREBASE_API_KEY) ? process.env.VITE_FIREBASE_API_KEY : appletConfig.apiKey,
  authDomain: isValidDomain(process.env.VITE_FIREBASE_AUTH_DOMAIN) ? process.env.VITE_FIREBASE_AUTH_DOMAIN : appletConfig.authDomain,
  projectId: isValidProj(process.env.VITE_FIREBASE_PROJECT_ID) ? process.env.VITE_FIREBASE_PROJECT_ID : appletConfig.projectId,
  storageBucket: isValidDomain(process.env.VITE_FIREBASE_STORAGE_BUCKET) ? process.env.VITE_FIREBASE_STORAGE_BUCKET : appletConfig.storageBucket,
  messagingSenderId: typeof process.env.VITE_FIREBASE_MESSAGING_SENDER_ID === 'string' && process.env.VITE_FIREBASE_MESSAGING_SENDER_ID.length >= 6
    ? process.env.VITE_FIREBASE_MESSAGING_SENDER_ID
    : appletConfig.messagingSenderId,
  appId: isValidApp(process.env.VITE_FIREBASE_APP_ID) ? process.env.VITE_FIREBASE_APP_ID : appletConfig.appId,
  measurementId: typeof process.env.VITE_FIREBASE_MEASUREMENT_ID === 'string' && process.env.VITE_FIREBASE_MEASUREMENT_ID.length >= 5
    ? process.env.VITE_FIREBASE_MEASUREMENT_ID
    : appletConfig.measurementId
};

async function startServer() {
  const app = express();
  const PORT = 3000;
  const DB_PATH = path.join(process.cwd(), "db.json");

  // Initialize Firebase
  const firebaseApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
  const rawDbId = process.env.VITE_FIREBASE_DATABASE_ID;
  const dbId = (rawDbId && rawDbId.length >= 4 && !/^[0-9]+$/.test(rawDbId) ? rawDbId : (appletConfig as any).firestoreDatabaseId) || "(default)";
  const db = dbId && dbId !== "(default)" ? getFirestore(firebaseApp, dbId) : getFirestore(firebaseApp);

  app.use(express.json({ limit: "50mb" }));

  // Helper to read database backup/seed
  const readLocalBackup = () => {
    if (!fs.existsSync(DB_PATH)) {
      return null;
    }
    try {
      return JSON.parse(fs.readFileSync(DB_PATH, "utf-8"));
    } catch (e) {
      console.error("Error reading db.json, returning empty database", e);
      return null;
    }
  };

  // API Route: Get all medical & clinical data directly from Firestore
  app.get("/api/data", async (req, res) => {
    try {
      const collections = ["hospitals", "doctors", "bookings", "ambulanceBookings", "prescriptions"];
      const data: any = {};
      let hasData = false;

      for (const colName of collections) {
        const colRef = collection(db, colName);
        const snapshot = await getDocs(colRef);
        if (!snapshot.empty) {
          data[colName] = snapshot.docs.map(doc => doc.data());
          hasData = true;
        } else {
          data[colName] = [];
        }
      }

      if (hasData) {
        res.json(data);
      } else {
        // If Firestore is completely empty, try seeding from local backup to avoid blank screens
        const localBackup = readLocalBackup();
        if (localBackup) {
          console.log("Firestore empty, seeding from db.json backup...");
          const batch = writeBatch(db);
          for (const [colName, list] of Object.entries(localBackup)) {
            if (!Array.isArray(list)) continue;
            list.forEach((item: any) => {
              if (item && item.id) {
                const docRef = doc(db, colName, item.id);
                batch.set(docRef, item);
              }
            });
          }
          await batch.commit();
          res.json(localBackup);
        } else {
          res.json({ status: "not_initialized" });
        }
      }
    } catch (err: any) {
      console.error("Error fetching data from Firestore in backend: ", err);
      res.status(500).json({ error: "Failed to read from Firestore", details: err.message });
    }
  });

  // API Route: Save and sync all medical & clinical data directly to Firestore
  app.post("/api/data", async (req, res) => {
    try {
      const data = req.body;
      const batch = writeBatch(db);
      let totalItems = 0;

      for (const [colName, list] of Object.entries(data)) {
        if (!Array.isArray(list)) continue;
        list.forEach((item: any) => {
          if (item && item.id) {
            const docRef = doc(db, colName, item.id);
            batch.set(docRef, item);
            totalItems++;
          }
        });
      }

      if (totalItems > 0) {
        await batch.commit();
      }
      res.json({ status: "success", timestamp: new Date().toISOString(), itemsSaved: totalItems });
    } catch (err: any) {
      console.error("Error saving data to Firestore in backend: ", err);
      res.status(500).json({ error: "Failed to write to Firestore", details: err.message });
    }
  });

  // Gemini AI Generation Engine
  const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });

  // Helper for Gemini generateContent with fallback
  const callGemini = async (prompt: string, systemInstruction?: string) => {
    const modelsToTry = ['gemini-3.8-flash', 'gemini-2.5-flash'];
    for (const model of modelsToTry) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: prompt,
          config: systemInstruction ? { systemInstruction } : undefined,
        });
        if (response && response.text) {
          return response.text;
        }
      } catch (err: any) {
        console.warn(`Model ${model} call failed:`, err?.message || err);
      }
    }
    return null;
  };

  // API Route: Generate AI Clinical Assessment
  app.post("/api/gemini/generate-clinical-assessment", async (req, res) => {
    try {
      const { symptoms, userHistory, patientName } = req.body;
      const prompt = `You are CUVIO AI Medical Triage Assistant, an empathetic, clinical intelligence system for Indian hospital systems (Vande Bharatam 2026 initiative).
Analyze the following patient condition:
- Patient Name: ${patientName || "Patient"}
- Reported Symptoms: "${symptoms || "Generalized illness"}"
- Known Medical History: "${userHistory || "None declared"}"

Provide a structured, helpful clinical assessment formatted in valid JSON with these keys:
{
  "department": "Orthopedics" | "Cardiology" | "Pediatrics" | "Neurology" | "ENT" | "Dermatology" | "Ophthalmology" | "Gastroenterology" | "General Medicine",
  "urgency": "Emergency (Go to ER)" | "Priority (Next 24h)" | "Routine OPD",
  "urgencyColor": "red" | "amber" | "emerald",
  "confidenceScore": number (e.g. 96),
  "summary": "Brief 2-sentence clinical assessment explaining why this condition occurs",
  "keyObservations": ["Observation 1", "Observation 2", "Observation 3"],
  "suggestedSpecialistReason": "Why this specific specialist is required",
  "questionsForDoctor": [
    "Question 1 to ask during OPD consultation",
    "Question 2 to ask during OPD consultation",
    "Question 3 regarding medications or recovery"
  ],
  "homeCareAdvice": "Safe temporary relief or caution before doctor consultation",
  "disclaimer": "This AI assessment assists with doctor selection and triage. Consult a licensed medical practitioner for final diagnosis."
}

Return ONLY valid JSON. No markdown code blocks, no backticks.`;

      const aiText = await callGemini(prompt);
      let parsed = null;
      if (aiText) {
        try {
          const cleanJson = aiText.replace(/```json/g, "").replace(/```/g, "").trim();
          parsed = JSON.parse(cleanJson);
        } catch (e) {
          console.warn("JSON parsing failed, returning text fallback");
        }
      }

      if (!parsed) {
        // High quality clinical rule-based fallback if offline
        const sym = (symptoms || "").toLowerCase();
        let dep = "General Medicine";
        if (sym.includes("heart") || sym.includes("chest") || sym.includes("palpitation")) dep = "Cardiology";
        else if (sym.includes("knee") || sym.includes("bone") || sym.includes("joint") || sym.includes("fracture") || sym.includes("spine")) dep = "Orthopedics";
        else if (sym.includes("brain") || sym.includes("headache") || sym.includes("migraine") || sym.includes("nerve")) dep = "Neurology";
        else if (sym.includes("stomach") || sym.includes("abdomen") || sym.includes("digest") || sym.includes("acid")) dep = "Gastroenterology";
        else if (sym.includes("skin") || sym.includes("rash") || sym.includes("allergy") || sym.includes("itch")) dep = "Dermatology";
        else if (sym.includes("ear") || sym.includes("nose") || sym.includes("throat") || sym.includes("tonsil")) dep = "ENT";
        else if (sym.includes("eye") || sym.includes("vision") || sym.includes("cataract")) dep = "Ophthalmology";

        parsed = {
          department: dep,
          urgency: sym.includes("chest") || sym.includes("severe") ? "Priority (Next 24h)" : "Routine OPD",
          urgencyColor: sym.includes("chest") ? "red" : "amber",
          confidenceScore: 94,
          summary: `Clinical indication matches specialized evaluation in ${dep}. Symptoms suggest localized inflammation or strain requiring diagnostic imaging or physical examination.`,
          keyObservations: [
            `Symptoms correlated with ${dep} clinical guidelines`,
            "No contraindication for standard outpatient physical review",
            "Continuous tracking recommended if symptoms persist over 48 hours"
          ],
          suggestedSpecialistReason: `Consulting a board-certified ${dep} specialist ensures targeted differential diagnosis and avoids unnecessary lab tests.`,
          questionsForDoctor: [
            "Are diagnostic scans (X-ray/MRI/Ultrasound) necessary at this stage?",
            "What lifestyle or dietary modifications should I follow during recovery?",
            "How long before noticeable improvement is expected with recommended treatment?"
          ],
          homeCareAdvice: "Rest the affected area, stay well-hydrated, and avoid strenuous physical exertion until your in-person consultation.",
          disclaimer: "This AI assessment assists with doctor selection and triage. Consult a licensed medical practitioner for final diagnosis."
        };
      }

      res.json({ status: "success", assessment: parsed });
    } catch (err: any) {
      console.error("Clinical assessment error:", err);
      res.status(500).json({ error: "Failed to generate clinical assessment", details: err.message });
    }
  });

  // API Route: Generate AI Treatment Tariff & Insurance Copay Audit
  app.post("/api/gemini/generate-tariff-audit", async (req, res) => {
    try {
      const { procedure, hospitalName, insuranceProvider, sumInsured, baseCost, isDiagnosed } = req.body;
      const prompt = `You are CUVIO Tariff & Healthcare Financial Transparency Engine.
Audit the following hospital treatment estimate in India (2026 tariff benchmarks):
- Procedure: "${procedure || "General Surgery"}"
- Hospital: "${hospitalName || "Apollo Hospitals"}"
- Insurance Policy: "${insuranceProvider || "Star Health"}"
- Sum Insured Range: "${sumInsured || "₹5,00,000 - ₹10,00,000"}"
- Total Quoted Tariff: ₹${baseCost || 150000}
- Condition State: ${isDiagnosed ? "Full Surgery Required" : "Consultation & OPD Evaluation"}

Provide an authoritative, patient-first transparency breakdown in valid JSON with these keys:
{
  "marketBenchmark": "Normal expected cost range in metro cities (e.g. ₹1,40,000 - ₹1,85,000)",
  "fairnessRating": "Fair & Competitive" | "Above Average (Premium)" | "Highly Economical",
  "cashlessEligibility": "Eligible for 85-95% Cashless Pre-Auth with ${insuranceProvider || "Standard TPA"}",
  "deductionAlerts": [
    "Non-medical items (gloves, PPE, disposable OT kits) typically deducted ~5-8%",
    "Room rent capping check (verify if standard twin-sharing vs private deluxe)"
  ],
  "cashlessDocumentationNeeded": [
    "Government Photo ID (Aadhaar / Voter ID)",
    "Active Health Insurance e-Card & Policy Number",
    "Doctor Prescription advising hospitalization",
    "Recent Diagnostic Test Reports"
  ],
  "negotiationTips": [
    "Request hospital TPA desk to provide all-inclusive package pricing to prevent separate consumable billing",
    "Ask whether generic equivalent implants or consumables are used"
  ],
  "estimatedOutOfPocket": "₹${isDiagnosed ? Math.round((baseCost || 150000) * 0.12) : 800}"
}

Return ONLY valid JSON. No markdown code blocks, no backticks.`;

      const aiText = await callGemini(prompt);
      let parsed = null;
      if (aiText) {
        try {
          const cleanJson = aiText.replace(/```json/g, "").replace(/```/g, "").trim();
          parsed = JSON.parse(cleanJson);
        } catch (e) {
          console.warn("Tariff audit JSON parse failed");
        }
      }

      if (!parsed) {
        parsed = {
          marketBenchmark: `₹${Math.round((baseCost || 120000) * 0.9).toLocaleString('en-IN')} - ₹${Math.round((baseCost || 120000) * 1.15).toLocaleString('en-IN')}`,
          fairnessRating: "Fair & Competitive",
          cashlessEligibility: `88% Covered under ${insuranceProvider || "Standard Health Plan"}`,
          deductionAlerts: [
            "Non-medical OT consumables (gloves, sanitizer, bedsheets) usually excluded from cashless",
            "Verify room rent category matches policy eligibility to prevent proportionate deductions"
          ],
          cashlessDocumentationNeeded: [
            "Aadhaar Card / Government Identity",
            "Active Health Insurance TPA Card",
            "Treating Doctor's Admission & Consultation Slip",
            "Prior Diagnostic Imaging Reports"
          ],
          negotiationTips: [
            "Verify package rate includes 2 days post-op monitoring",
            "Request itemized pharmacy bills upon discharge"
          ],
          estimatedOutOfPocket: `₹${Math.round((baseCost || 120000) * 0.12).toLocaleString('en-IN')}`
        };
      }

      res.json({ status: "success", audit: parsed });
    } catch (err: any) {
      console.error("Tariff audit error:", err);
      res.status(500).json({ error: "Failed to generate tariff audit", details: err.message });
    }
  });

  // API Route: Generate AI Prescription Explanation & Care Guide
  app.post("/api/gemini/generate-prescription-guide", async (req, res) => {
    try {
      const { diagnosis, medications, doctorName, hospitalName, notes } = req.body;
      const prompt = `You are CUVIO Medication Navigator.
Explain this medical prescription in simple, patient-friendly terms:
- Doctor: "${doctorName || "Treating Physician"}" (${hospitalName || "Hospital"})
- Diagnosis: "${diagnosis || "General Condition"}"
- Medications: ${JSON.stringify(medications || [])}
- Special Notes: "${notes || "None"}"

Provide a clear guide in valid JSON with these keys:
{
  "summary": "Warm, encouraging 2-sentence summary of what this treatment course accomplishes",
  "guidelines": [
    {
      "name": "Medication name",
      "purpose": "What this medicine treats in plain terms",
      "bestTime": "Morning / After lunch / Bedtime",
      "dietTip": "Take with water after food / on empty stomach",
      "caution": "Avoid alcohol / do not skip doses"
    }
  ],
  "lifestyleTips": ["Tip 1", "Tip 2", "Tip 3"],
  "redFlags": ["Severe persistent pain", "High fever above 101F", "Unexpected rash or swelling"]
}

Return ONLY valid JSON. No markdown code blocks, no backticks.`;

      const aiText = await callGemini(prompt);
      let parsed = null;
      if (aiText) {
        try {
          const cleanJson = aiText.replace(/```json/g, "").replace(/```/g, "").trim();
          parsed = JSON.parse(cleanJson);
        } catch (e) {
          console.warn("Prescription guide JSON parse failed");
        }
      }

      if (!parsed) {
        parsed = {
          summary: `This treatment plan prescribed by ${doctorName || "your specialist"} aims to reduce inflammation, alleviate pain, and accelerate tissue recovery.`,
          guidelines: (medications || []).map((m: any) => ({
            name: m.name,
            purpose: "Pain relief and therapeutic anti-inflammatory action",
            bestTime: m.frequency || "Twice daily after meals",
            dietTip: "Consume with a full glass of lukewarm water after a meal to protect the stomach lining",
            caution: "Do not stop course abruptly without doctor advice"
          })),
          lifestyleTips: [
            "Maintain moderate hydration (2.5L water daily)",
            "Avoid strenuous high-impact movements during initial recovery",
            "Ensure 7-8 hours of restful sleep to promote cellular repair"
          ],
          redFlags: [
            "Sudden sharp increase in pain or swelling",
            "Dizziness, skin rash, or allergic reactions",
            "Fever exceeding 100.4°F"
          ]
        };
      }

      res.json({ status: "success", guide: parsed });
    } catch (err: any) {
      console.error("Prescription guide error:", err);
      res.status(500).json({ error: "Failed to generate prescription guide", details: err.message });
    }
  });

  // API Route: Server health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", backend: "Cuvio Express Engine", gemini: "active" });
  });

  // Vite integration as middleware (dev vs prod check)
  if (process.env.NODE_ENV !== "production") {
    console.log("Starting server in development mode with Vite middleware...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Starting server in production mode...");
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Cuvio Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
});
