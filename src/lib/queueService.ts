import {
  collection,
  doc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  runTransaction,
  updateDoc,
  setDoc,
  getDocs,
  getDoc
} from 'firebase/firestore';
import { db } from './firebase';
import { QueueEntry, QueueEntryStatus } from '../types';

/**
 * Returns today's date string YYYY-MM-DD in Asia/Kolkata timezone.
 */
export function getKolkataDateString(): string {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(new Date());
  } catch (e) {
    // Fallback if Intl timeZone is unsupported
    const d = new Date();
    // UTC + 5:30 offset
    const kolkataTime = new Date(d.getTime() + (5.5 * 60 + d.getTimezoneOffset()) * 60000);
    return kolkataTime.toISOString().split('T')[0];
  }
}

/**
 * Assigns an atomic token number to a patient for a doctor on a specific date
 * using runTransaction on doctors/{doctorId}/counters/{date}.
 * Creates an entry in queueEntries without personal data.
 */
export async function assignQueueTokenAndEntry(
  doctorId: string,
  patientId: string,
  targetDate?: string
): Promise<{ tokenNumber: number; queueEntryId: string; date: string }> {
  const date = targetDate || getKolkataDateString();
  const counterRef = doc(db, 'doctors', doctorId, 'counters', date);
  const entryId = `${doctorId}_${date}_${patientId}_${Date.now()}`;
  const entryRef = doc(db, 'queueEntries', entryId);

  let tokenNumber = 1;

  try {
    await runTransaction(db, async (transaction) => {
      const counterDoc = await transaction.get(counterRef);
      const lastToken = counterDoc.exists() ? (counterDoc.data()?.lastToken || 0) : 0;
      tokenNumber = lastToken + 1;

      // Update counter atomically
      transaction.set(counterRef, { lastToken: tokenNumber }, { merge: true });

      // Create queueEntry with NO personal data
      const queueEntryData: QueueEntry = {
        id: entryId,
        patientId,
        doctorId,
        date,
        tokenNumber,
        status: 'waiting',
        createdAt: new Date().toISOString(),
        startedAt: null,
        completedAt: null
      };

      transaction.set(entryRef, queueEntryData);
    });
  } catch (err) {
    console.warn("runTransaction failed on counter, falling back to local counter + direct write:", err);
    // Offline / direct fallback
    const savedLocalCounterKey = `cuvio_counter_${doctorId}_${date}`;
    const localLast = parseInt(localStorage.getItem(savedLocalCounterKey) || '0', 10);
    tokenNumber = localLast + 1;
    localStorage.setItem(savedLocalCounterKey, tokenNumber.toString());

    const queueEntryData: QueueEntry = {
      id: entryId,
      patientId,
      doctorId,
      date,
      tokenNumber,
      status: 'waiting',
      createdAt: new Date().toISOString(),
      startedAt: null,
      completedAt: null
    };

    try {
      await setDoc(entryRef, queueEntryData);
      await setDoc(counterRef, { lastToken: tokenNumber }, { merge: true });
    } catch (e) {
      console.warn("Direct setDoc for queueEntry also queued offline:", e);
    }
  }

  // Backup in localStorage for offline resiliency
  saveLocalQueueEntry(doctorId, date, {
    id: entryId,
    patientId,
    doctorId,
    date,
    tokenNumber,
    status: 'waiting',
    createdAt: new Date().toISOString()
  });

  return { tokenNumber, queueEntryId: entryId, date };
}

/**
 * Subscribes to active entries (waiting or in_consultation) for a doctor and date
 * ordered by tokenNumber asc.
 */
export function subscribeToActiveQueue(
  doctorId: string,
  date: string,
  callback: (entries: QueueEntry[]) => void
): () => void {
  const q = query(
    collection(db, 'queueEntries'),
    where('doctorId', '==', doctorId),
    where('date', '==', date),
    where('status', 'in', ['waiting', 'in_consultation']),
    orderBy('tokenNumber', 'asc')
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const entries: QueueEntry[] = snapshot.docs.map(d => ({
        id: d.id,
        ...(d.data() as Omit<QueueEntry, 'id'>)
      }));
      callback(entries);
    },
    (err) => {
      console.warn("Active queue subscription error, reading local fallback:", err);
      // Return local cache if offline
      const local = getLocalQueueEntries(doctorId, date);
      const active = local.filter(e => e.status === 'waiting' || e.status === 'in_consultation')
                          .sort((a, b) => a.tokenNumber - b.tokenNumber);
      callback(active);
    }
  );
}

/**
 * Calculates doctor average consultation duration based on today's last 10 completed entries.
 * Defaults to 10 minutes if no data.
 */
export function subscribeToDoctorAverageDuration(
  doctorId: string,
  date: string,
  callback: (avgDurationMinutes: number) => void
): () => void {
  const q = query(
    collection(db, 'queueEntries'),
    where('doctorId', '==', doctorId),
    where('date', '==', date),
    where('status', '==', 'completed'),
    orderBy('completedAt', 'desc'),
    limit(10)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const completedEntries = snapshot.docs.map(d => d.data() as QueueEntry);
      if (completedEntries.length === 0) {
        callback(10);
        return;
      }

      let totalDurationMs = 0;
      let count = 0;

      for (const entry of completedEntries) {
        if (entry.startedAt && entry.completedAt) {
          const start = new Date(entry.startedAt).getTime();
          const end = new Date(entry.completedAt).getTime();
          const diff = end - start;
          // Valid consultation duration: between 1 min and 120 mins
          if (diff >= 60000 && diff <= 120 * 60000) {
            totalDurationMs += diff;
            count++;
          }
        }
      }

      if (count === 0) {
        callback(10);
      } else {
        const avg = Math.round((totalDurationMs / count) / 60000);
        callback(Math.max(2, Math.min(60, avg || 10)));
      }
    },
    (err) => {
      console.warn("Average wait time subscription error, using default 10m:", err);
      callback(10);
    }
  );
}

/**
 * Updates a queueEntry status to 'in_consultation' and sets startedAt.
 */
export async function startConsultation(entryId: string): Promise<void> {
  const entryRef = doc(db, 'queueEntries', entryId);
  const startedAt = new Date().toISOString();
  await updateDoc(entryRef, {
    status: 'in_consultation',
    startedAt
  });
  updateLocalQueueEntryStatus(entryId, 'in_consultation', { startedAt });
}

/**
 * Updates a queueEntry status to 'completed' and sets completedAt.
 */
export async function completeConsultation(entryId: string): Promise<void> {
  const entryRef = doc(db, 'queueEntries', entryId);
  const completedAt = new Date().toISOString();
  await updateDoc(entryRef, {
    status: 'completed',
    completedAt
  });
  updateLocalQueueEntryStatus(entryId, 'completed', { completedAt });
}

/**
 * Updates a queueEntry status to 'skipped' and sets completedAt.
 */
export async function skipPatient(entryId: string): Promise<void> {
  const entryRef = doc(db, 'queueEntries', entryId);
  const completedAt = new Date().toISOString();
  await updateDoc(entryRef, {
    status: 'skipped',
    completedAt
  });
  updateLocalQueueEntryStatus(entryId, 'skipped', { completedAt });
}

/**
 * Patient cancels their own queue entry.
 */
export async function cancelQueueEntry(entryId: string): Promise<void> {
  const entryRef = doc(db, 'queueEntries', entryId);
  await updateDoc(entryRef, {
    status: 'cancelled',
    completedAt: new Date().toISOString()
  });
  updateLocalQueueEntryStatus(entryId, 'cancelled', { completedAt: new Date().toISOString() });
}

/**
 * In-App Notification check helper (fires each message only once per patient per doctor per day).
 */
export function checkQueueNotification(
  patientId: string,
  doctorId: string,
  date: string,
  position: number
): { title: string; message: string; type: 'warning' | 'info' } | null {
  if (position === 3) {
    const key = `cuvio_notified_3_${patientId}_${doctorId}_${date}`;
    if (!localStorage.getItem(key)) {
      localStorage.setItem(key, 'true');
      return {
        title: "Almost Your Turn!",
        message: "Almost your turn, 2 patients ahead. Please stay close to the waiting bay.",
        type: 'warning'
      };
    }
  } else if (position === 1) {
    const key = `cuvio_notified_1_${patientId}_${doctorId}_${date}`;
    if (!localStorage.getItem(key)) {
      localStorage.setItem(key, 'true');
      return {
        title: "You Are Next!",
        message: "You are next, please reach the doctor's room.",
        type: 'warning'
      };
    }
  }
  return null;
}

// Local Storage Fallback helpers for zero-flicker offline robustness
function getLocalQueueKey(doctorId: string, date: string): string {
  return `cuvio_queue_entries_${doctorId}_${date}`;
}

export function getLocalQueueEntries(doctorId: string, date: string): QueueEntry[] {
  try {
    const raw = localStorage.getItem(getLocalQueueKey(doctorId, date));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalQueueEntry(doctorId: string, date: string, entry: QueueEntry) {
  try {
    const existing = getLocalQueueEntries(doctorId, date);
    const updated = [entry, ...existing.filter(e => e.id !== entry.id)];
    localStorage.setItem(getLocalQueueKey(doctorId, date), JSON.stringify(updated));
  } catch (e) {
    console.warn("Could not save to localStorage", e);
  }
}

function updateLocalQueueEntryStatus(entryId: string, status: QueueEntryStatus, extras: Partial<QueueEntry> = {}) {
  try {
    // Scan all keys that start with cuvio_queue_entries_
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('cuvio_queue_entries_')) {
        const raw = localStorage.getItem(key);
        if (raw) {
          const list: QueueEntry[] = JSON.parse(raw);
          let modified = false;
          const updated = list.map(item => {
            if (item.id === entryId) {
              modified = true;
              return { ...item, status, ...extras };
            }
            return item;
          });
          if (modified) {
            localStorage.setItem(key, JSON.stringify(updated));
          }
        }
      }
    }
  } catch (e) {
    console.warn("Could not update local queue entry status", e);
  }
}
