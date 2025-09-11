// Chat drawer store – Firebase RTDB only. No auth / no table state here.
import { create } from "zustand";
import { initializeApp, getApps } from "firebase/app";
import {
  getDatabase,
  ref,
  onChildAdded,
  off,
  push,
  set,
  get as dbGet,        // ← rename to avoid name collision with Zustand's get()
  query,
  limitToLast,
  serverTimestamp,
} from "firebase/database";

/* -------- Firebase init -------- */
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const _app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
// passing the URL is fine (explicit)
const _db = getDatabase(_app, import.meta.env.VITE_FIREBASE_DATABASE_URL);

const ADMIN = {
  id: "soundhive_admin",
  name: "SoundHive Support",
  avatarUrl: null,
  role: "admin",
};

const normalize = (v = {}) => {
  const text =
    v.text ?? v.message ?? v.body ?? v.content ?? v.systemText ?? v.disputeTitle ?? "";
  const senderId =
    v.senderId ?? v.senderUID ?? v.userId ?? v.uid ?? v.from ?? (v.isSystem ? "system" : "unknown");
  const senderName = v.senderName ?? v.name ?? v.userName ?? (v.isSystem ? "System" : "");
  const timestamp = v.timestamp ?? v.createdAt ?? v.date ?? new Date().toISOString();
  return { text, senderId, senderName, timestamp, isSystem: !!v.isSystem };
};

const sortByTime = (arr) =>
  [...arr].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

const useDisputeChatStore = create((set, get) => ({
  chatLoading: false,
  chatError: null,
  activeChatId: null,
  chatMessages: [],         // [{id, text, senderId, senderName, timestamp, isSystem}]
  _chatListener: null,      // { ref, cb }
  _idIndex: {},             // { [id]: true } for de-dupe
  participants: [],         // [{id, name, avatarUrl, role}]

  openChat: async (chatId, participants = []) => {
    // Detach any previous listener
    const prev = get()._chatListener;
    if (prev?.ref && prev?.cb) off(prev.ref, "child_added", prev.cb);

    // Build unique participants incl. ADMIN
    const map = {};
    [...participants, ADMIN]
      .filter(Boolean)
      .forEach((p) => {
        const id = String(p.id ?? "");
        if (!id) return;
        map[id] = {
          id,
          name: p.name || id,
          avatarUrl: p.avatarUrl || null,
          role: p.role || "user",
        };
      });

    // Reset only the chat slice (do NOT touch other UI slices)
    set({
      chatLoading: true,
      chatError: null,
      chatMessages: [],
      _idIndex: {},
      activeChatId: chatId,
      participants: Object.values(map),
    });

    // Constrain to last 500 for sanity; RTDB will still replay existing children
    const listRef = query(ref(_db, `chats/${chatId}/messages`), limitToLast(500));

    // Single handler used for both prime + live stream
    const handleChild = (snap) => {
      const id = snap.key;
      if (!id) return;
      const idx = get()._idIndex;
      if (idx[id]) return; // already have it (optimistic or previous)
      const v = normalize(snap.val() || {});
      set((s) => ({
        chatMessages: sortByTime([...s.chatMessages, { id, ...v }]),
        _idIndex: { ...s._idIndex, [id]: true },
      }));
    };

    try {
      // PRIME (read existing children once) – fixed to use dbGet
      const primeSnap = await dbGet(listRef);
      if (primeSnap.exists()) {
        primeSnap.forEach((child) => handleChild(child));
      }
    } catch (e) {
      // not fatal; we'll still attach live listener
      console.warn("[Chat:WARN] prime failed:", e?.message || e);
    }

    // LIVE stream of new children (and any missed)
    onChildAdded(listRef, handleChild, (err) => {
      set({ chatError: err?.message || String(err) });
    });

    set({ _chatListener: { ref: listRef, cb: handleChild }, chatLoading: false });
  },

  closeChat: () => {
    const l = get()._chatListener;
    if (l?.ref && l?.cb) off(l.ref, "child_added", l.cb);
    set({
      _chatListener: null,
      activeChatId: null,
      chatMessages: [],
      _idIndex: {},
      chatError: null,
      chatLoading: false,
      participants: [],
    });
  },

  // Optimistic send
  sendMessage: async (text) => {
    const chatId = get().activeChatId;
    if (!chatId) throw new Error("No active chat.");
    const t = (text || "").trim();
    if (!t) return;

    const listRef = ref(_db, `chats/${chatId}/messages`);
    const newMsgRef = push(listRef);
    const id = newMsgRef.key;

    // Prepare message (include server timestamp for ordering)
    const message = {
      text: t,
      senderId: ADMIN.id,
      senderName: ADMIN.name,
      isSystem: false,
      timestamp: new Date().toISOString(), // human-readable fallback
      serverTime: serverTimestamp(),        // RTDB ordering hint
    };

    // Optimistic update – never clears previous messages
    set((s) => ({
      chatMessages: sortByTime([...s.chatMessages, { id, ...message }]),
      _idIndex: { ...s._idIndex, [id]: true },
    }));

    // Persist
    await set(newMsgRef, message);

    // Update chat summary fields (compatible with existing schema)
    await set(ref(_db, `chats/${chatId}/lastMessage`), {
      ...message,
    });
    await set(ref(_db, `chats/${chatId}/lastRead/${ADMIN.id}`), new Date().toISOString());
  },
}));

export default useDisputeChatStore;
