import React, { useEffect, useMemo, useRef, useState } from "react";
import { FiMoreVertical, FiSearch } from "react-icons/fi";
import { useNavigate } from "react-router-dom";

import Sidebar from "../../components/layout/Sidebar";
import Navbar from "../../components/layout/Navbar";
import Footer from "../../components/layout/Footer";

import Modal from "../../components/common/Modal";
import ConfirmDialog from "../../components/common/ConfirmDialog";
import { ToastAlert, useToastAlert } from "../../components/common/ToastAlert";
import useClickOutside from "../../lib/useClickOutside";
import useAuthGuard from "../../lib/useAuthGuard";
import { Spinner } from "../../components/common/Spinner";

// Stores
import useDisputesStore from "../../store/disputesStore";          // TABLE ONLY
import useDisputeChatStore from "../../store/disputeChatStore";     // CHAT ONLY (Firebase)

const BRAND_RGB = "rgb(77, 52, 144)";

/* ---------------- Drawer ---------------- */
const Drawer = ({ open, title, onClose, children, footer }) => {
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && open && onClose?.();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <>
      <div
        className={`fixed inset-0 bg-black/30 transition-opacity z-[60] ${open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
        onClick={onClose}
      />
      <aside
        className={`fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl z-[61] transform transition-transform duration-300 ${open ? "translate-x-0" : "translate-x-full"}`}
        aria-hidden={!open}
      >
        <div className="flex items-center justify-between px-4 h-14 border-b">
          <h3 className="font-semibold">{title}</h3>
          <button className="px-3 py-1 rounded border hover:bg-gray-50" onClick={onClose}>
            Close
          </button>
        </div>
        <div className="p-0 overflow-auto h-[calc(100%-3.5rem-64px)]">{children}</div>
        <div className="px-4 py-3 border-t bg-white">{footer}</div>
      </aside>
    </>
  );
};

/* ---------- small UI helpers ---------- */
const StatusPill = ({ value }) => {
  const v = String(value || "").toLowerCase();
  const cls =
    v === "resolved"
      ? "bg-green-50 text-green-700 border-green-200"
      : "bg-yellow-50 text-yellow-700 border-yellow-200";
  const label = v ? v[0].toUpperCase() + v.slice(1) : "";
  return (
    <span className={`inline-flex px-2 py-0.5 text-[11px] rounded-full border font-medium ${cls}`}>{label}</span>
  );
};

const Tabs = ({ value, onChange }) => {
  const tabs = [
    { key: "pending", label: "Pending" },
    { key: "resolved", label: "Resolved" },
  ];
  return (
    <div className="border-b border-gray-200 flex items-center justify-between">
      <div className="flex gap-2">
        {tabs.map((t) => {
          const active = value === t.key;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => onChange(t.key)}
              aria-current={active ? "page" : undefined}
              className={`relative -mb-px px-4 py-2 text-sm font-semibold transition-colors ${active ? "border-b-4" : "border-b-2"} border-b`}
              style={{
                color: active ? BRAND_RGB : "#374151",
                borderBottomColor: active ? BRAND_RGB : "#D1D5DB",
                backgroundColor: "transparent",
              }}
            >
              {t.label}
            </button>
          );
        })}
      </div>
    </div>
  );
};

const ThreeDotsMenu = ({ items = [] }) => {
  const [open, setOpen] = useState(false);
  const boxRef = useRef(null);
  useClickOutside(boxRef, () => setOpen(false));
  const safeItems = Array.isArray(items) ? items : [];
  return (
    <div className="relative inline-block text-left" ref={boxRef}>
      <button
        type="button"
        className="p-2 rounded hover:bg-gray-100"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <FiMoreVertical className="w-4 h-4" />
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-44 origin-top-right rounded-md border border-gray-200 bg-white shadow-lg z-20">
          {safeItems.map((item, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => {
                setOpen(false);
                item.onClick?.();
              }}
              className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const DetailsList = ({ items }) => {
  const safe = Array.isArray(items) ? items : [];
  return (
    <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
      {safe.map((item) => (
        <div key={item.label} className="space-y-1">
          <dt className="text-xs uppercase tracking-wide text-gray-500">{item.label}</dt>
          <dd className="text-sm font-medium text-gray-900">
            {typeof item.value === "object" ? item.value : (item.value || "")}
          </dd>
        </div>
      ))}
    </dl>
  );
};

const TableShell = ({ children, footerLeft, footerRight, showOverlay }) => (
  <div className="relative rounded-xl border border-gray-200 overflow-hidden bg-white shadow-sm">
    <div className="overflow-auto">{children}</div>

    {showOverlay && (
      <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
        <span className="inline-flex items-center gap-2 text-sm text-gray-700">
          <Spinner className="!text-gray-700" /> Loading…
        </span>
      </div>
    )}

    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 px-4 py-3 bg-gray-50 border-t border-gray-200">
      <div className="text-sm text-gray-600">{footerLeft}</div>
      <div>{footerRight}</div>
    </div>
  </div>
);

/* ---------- avatar helpers ---------- */
const initials = (name = "") =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join("") || "•";

const Avatar = ({ src, name, size = 28 }) => (
  <div
    className="flex items-center justify-center rounded-full overflow-hidden bg-gray-200 text-[11px] font-semibold text-gray-600"
    style={{ width: size, height: size }}
    title={name}
  >
    {src ? <img src={src} alt={name} className="w-full h-full object-cover" /> : initials(name)}
  </div>
);

const AvatarStack = ({ participants = [] }) => (
  <div className="flex -space-x-2">
    {participants.slice(0, 4).map((p) => (
      <div key={p.id} className="inline-block ring-2 ring-white rounded-full">
        <Avatar src={p.avatarUrl} name={p.name} size={28} />
      </div>
    ))}
  </div>
);

const Disputes = () => {
  const navigate = useNavigate();
  useAuthGuard(navigate);
  const toast = useToastAlert();

  // ===== TABLE STORE
  const disputes = useDisputesStore((s) => s.disputes);
  const meta = useDisputesStore((s) => s.meta);
  const loading = useDisputesStore((s) => s.loading);
  const fetchDisputes = useDisputesStore((s) => s.fetchDisputes);
  const getDispute = useDisputesStore((s) => s.getDispute);
  const updateDispute = useDisputesStore((s) => s.updateDispute);

  // ===== CHAT STORE
  const {
    chatLoading, chatError, activeChatId, chatMessages, participants,
    openChat, closeChat, sendMessage
  } = useDisputeChatStore();

  const safeDisputes = Array.isArray(disputes) ? disputes : [];
  const safeMeta = meta ?? { current_page: 1, last_page: 1, per_page: 10, total: 0 };
  const safeChatMessages = Array.isArray(chatMessages) ? chatMessages : [];
  const safeParticipants = Array.isArray(participants) ? participants : [];

  // ===== UI state
  const [tab, setTab] = useState("pending");
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");

  const [viewOpen, setViewOpen] = useState(false);
  const [viewRecord, setViewRecord] = useState(null);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmBusy, setConfirmBusy] = useState(false);
  const [confirmPayload, setConfirmPayload] = useState(null);

  // Drawer (chat)
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [draft, setDraft] = useState("");

  // Fetch list strictly on tab/page
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await fetchDisputes({ status: tab, page });
      } catch (e) {
        if (!cancelled)
          toast.add({
            type: "error",
            title: "Failed",
            message: e?.message || "Could not load disputes.",
          });
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, page]);

  // derived rows (search)
  const filteredRows = useMemo(() => {
    if (!search.trim()) return safeDisputes;
    const q = search.trim().toLowerCase();
    return safeDisputes.filter((d) =>
      [d.providerName, d.clientName, d.serviceName, d.initiatedBy, d.status]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q))
    );
  }, [safeDisputes, search]);

  const total = Number(safeMeta?.total || 0);
  const currentPage = Number(safeMeta?.current_page || page || 1);
  const lastPage = Number(safeMeta?.last_page || Math.max(1, currentPage));

  const footerLeft =
    total === 0
      ? "No records"
      : `Showing page ${currentPage} of ${lastPage} • Total ${total} record${total > 1 ? "s" : ""}`;

  const footerRight = (
    <div className="flex items-center gap-2">
      <button
        disabled={currentPage <= 1}
        onClick={() => setPage((p) => Math.max(1, p - 1))}
        className={`px-3 py-1.5 rounded-lg border ${currentPage <= 1 ? "text-gray-400 border-gray-200" : "border-gray-300 hover:bg-gray-50"}`}
      >
        Prev
      </button>
      <span className="text-sm text-gray-600">Page {currentPage} / {lastPage}</span>
      <button
        disabled={currentPage >= lastPage}
        onClick={() => setPage((p) => Math.min(lastPage, p + 1))}
        className={`px-3 py-1.5 rounded-lg border ${currentPage >= lastPage ? "text-gray-400 border-gray-200" : "border-gray-300 hover:bg-gray-50"}`}
      >
        Next
      </button>
    </div>
  );

  const normStatus = (v, fallback) => {
    const s = String(v || "").toLowerCase();
    if (s === "pending" || s === "resolved") return s;
    return fallback;
  };

  const safeMerge = (prev, next) => {
    const out = { ...(prev || {}) };
    Object.entries(next || {}).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "") out[k] = v;
    });
    return out;
  };

  // view details
  const openView = async (row) => {
    setViewRecord(row);
    setViewOpen(true);
    try {
      const full = await getDispute(row.id);
      setViewRecord((prev) => safeMerge(prev, full));
    } catch (e) {
      toast.add({ type: "error", title: "Failed", message: e?.message || "Could not open dispute." });
    }
  };

  // status updates
  const askResolve = (row) => {
    setConfirmPayload({ id: row.id, action: "resolve" });
    setConfirmOpen(true);
  };
  const askReopen = (row) => {
    setConfirmPayload({ id: row.id, action: "reopen" });
    setConfirmOpen(true);
  };

  const handleConfirm = async () => {
    if (!confirmPayload) return;
    setConfirmBusy(true);
    try {
      const payload = confirmPayload.action === "resolve" ? { resolve_status: "CLOSED" } : { resolve_status: "OPEN" };
      await updateDispute(confirmPayload.id, payload);
      toast.add({
        type: "success",
        title: "Updated",
        message: confirmPayload.action === "resolve" ? "Dispute marked as resolved." : "Dispute reopened.",
      });
      setConfirmOpen(false);
      setConfirmPayload(null);
    } catch (e) {
      toast.add({ type: "error", title: "Failed", message: e?.message || "Update failed." });
    } finally {
      setConfirmBusy(false);
    }
  };

  /* ---------------- CHAT DRAWER ---------------- */

  const extractParticipants = (rec) => {
    const raw = rec?._raw || {};
    const provider = raw.provider || raw.creator || raw.bookings?.service?.creator || {};
    const client   = raw.client   || raw.user    || raw.bookings?.user || {};

    const provId   = provider?.id ?? raw.provider_id ?? raw.creator_id;
    const provName = [provider?.first_name, provider?.last_name].filter(Boolean).join(" ") || provider?.name || rec?.providerName || "Provider";
    const provPic  = provider?.avatar || provider?.photo || provider?.profile_picture || provider?.image || raw.provider_avatar || raw.creator_avatar || null;

    const cliId    = client?.id ?? raw.client_id ?? raw.user_id;
    const cliName  = [client?.first_name, client?.last_name].filter(Boolean).join(" ") || client?.name || rec?.clientName || "Client";
    const cliPic   = client?.avatar || client?.photo || client?.profile_picture || client?.image || raw.client_avatar || raw.user_avatar || null;

    const admin = { id: "soundhive_admin", name: "SoundHive Support", avatarUrl: null, role: "admin" };

    const result = [];
    if (cliId != null)  result.push({ id: String(cliId),  name: cliName,  avatarUrl: cliPic,  role: "client" });
    if (provId != null) result.push({ id: String(provId), name: provName, avatarUrl: provPic, role: "provider" });
    result.push(admin);
    return result;
  };

  // ChatId rules: prefer explicit chatId; fallback "dispute_<id>"; else clientId_providerId
  const buildChatId = (rec) => {
    if (!rec) return "";
    const direct = rec._raw?.chatId || rec._raw?.chat_id || rec.chatId || rec.chat_id;
    if (direct) return String(direct);
    if (rec.id != null) return `dispute_${rec.id}`;
    const raw = rec._raw || {};
    const clientId =
      raw?.bookings?.user?.id || raw?.client?.id || raw?.user?.id || raw?.client_id || rec.clientId || rec.client_id;
    const providerId =
      raw?.bookings?.service?.creator?.id ||
      raw?.provider?.id ||
      raw?.creator?.id ||
      raw?.provider_id ||
      rec.providerId ||
      rec.provider_id;
    if (clientId != null && providerId != null) return `${clientId}_${providerId}`;
    return "";
  };

  const joinConversation = (row) => {
    setDraft("");
    setDrawerOpen(true);
    const chatId = buildChatId(row);
    if (!chatId) {
      toast.add({ type: "error", title: "Missing chat", message: "No chatId found for this dispute." });
      return;
    }
    const people = extractParticipants(row);
    // Open the chat stream; this never clears on send
    openChat(chatId, people).catch((e) =>
      toast.add({ type: "error", title: "Chat error", message: e?.message || "Could not open conversation." })
    );
  };

  // Auto-scroll when messages arrive
  const scrollerRef = useRef(null);
  useEffect(() => {
    if (!drawerOpen) return;
    const el = scrollerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [safeChatMessages, drawerOpen]);

  const hasRows = safeDisputes.length > 0;
  const showOverlay = !!loading && hasRows;

  // Send
  const canSend = Boolean(draft.trim());
  const handleSend = async (e) => {
    e.preventDefault();
    const txt = draft.trim();
    if (!txt) return;
    try {
      await sendMessage(txt); // optimistic inside store
      setDraft("");
    } catch (e2) {
      toast.add({ type: "error", title: "Send failed", message: e2?.message || "Message not sent." });
    }
  };

  // helpers to show avatars in bubbles
  const byId = Object.fromEntries(safeParticipants.map((p) => [String(p.id), p]));
  const who = (senderId) =>
    byId[String(senderId)] ||
    (senderId === "soundhive_admin"
      ? { id: "soundhive_admin", name: "SoundHive Support" }
      : { id: senderId, name: senderId });

  return (
    <main>
      <ToastAlert toasts={toast.toasts || []} remove={toast.remove} />

      <div className="overflow-x-hidden flex bg-gray-50">
        <Sidebar />
        <div id="app-layout-content" className="relative min-h-screen w-full min-w-[100vw] md:min-w-0 ml-[15.625rem] [transition:margin_0.25s_ease-out]">
          <Navbar />

          <div className="px-6 pb-20 pt-6">
            {/* Header */}
            <div className="flex items-center mb-6 justify-between -mx-6 border-b border-gray-200 pb-4 bg-white px-6">
              <p className="inline-block text-lg leading-5 font-semibold">Disputes</p>
            </div>

            {/* Tabs + Search */}
            <div className="mb-4 bg-white rounded-xl border border-gray-200 px-4 py-3 shadow-sm">
              <div className="flex items-center justify-between gap-4">
                <Tabs value={tab} onChange={(key) => { setTab(key); setPage(1); }} />
                <div className="relative w-72">
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search provider, client, service…"
                    autoComplete="off"
                    aria-label="Search for name"
                    className="w-full rounded-lg border border-gray-300 bg-white pl-9 pr-3 py-2 text-sm font-normal text-gray-700 placeholder:text-gray-400 outline-none focus:ring-2 focus:ring-[#4D3490] focus:border-[#4D3490]"
                    style={{ fontFamily: "inherit" }}
                  />
                  <FiSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 z-10" />
                </div>
              </div>
            </div>

            {/* Table */}
            <div className="space-y-4">
              <TableShell footerLeft={footerLeft} footerRight={footerRight} showOverlay={showOverlay}>
                <table className="w-full text-sm">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="text-left px-4 py-3 font-semibold">Service</th>
                      <th className="text-left px-4 py-3 font-semibold">Provider</th>
                      <th className="text-left px-4 py-3 font-semibold">Client</th>
                      <th className="text-left px-4 py-3 font-semibold">Initiated by</th>
                      <th className="text-left px-4 py-3 font-semibold">Date initiated</th>
                      <th className="text-left px-4 py-3 font-semibold">Status</th>
                      <th className="text-right px-4 py-3 font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {safeDisputes.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-10 text-center text-gray-500">
                          {loading ? (
                            <span className="inline-flex items-center gap-2">
                              <Spinner className="!text-gray-500" /> Loading…
                            </span>
                          ) : (
                            "No disputes found."
                          )}
                        </td>
                      </tr>
                    ) : (
                      (filteredRows || []).map((row) => (
                        <tr key={row.id} className="border-t border-gray-100">
                          <td className="px-4 py-3">{row.serviceName || ""}</td>
                          <td className="px-4 py-3">{row.providerName || ""}</td>
                          <td className="px-4 py-3">{row.clientName || ""}</td>
                          <td className="px-4 py-3">{row.initiatedBy || ""}</td>
                          <td className="px-4 py-3">{row.createdAtReadable || ""}</td>
                          <td className="px-4 py-3"><StatusPill value={normStatus(row.status, tab)} /></td>
                          <td className="px-4 py-3 text-right">
                            <ThreeDotsMenu
                              items={[
                                { label: "View", onClick: () => openView(row) },
                                { label: "Join conversation", onClick: () => joinConversation(row) },
                                ...(normStatus(row.status, tab) === "pending"
                                  ? [{ label: "Mark as resolved", onClick: () => askResolve(row) }]
                                  : [{ label: "Reopen", onClick: () => askReopen(row) }]),
                              ]}
                            />
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </TableShell>
            </div>
          </div>

          {/* View Modal */}
          <Modal
            open={viewOpen}
            title="Dispute details"
            onClose={() => setViewOpen(false)}
            footer={
              <div className="flex justify-end">
                <button onClick={() => setViewOpen(false)} className="px-4 py-2 rounded-lg border border-gray-300">
                  Close
                </button>
              </div>
            }
            size="lg"
          >
            {viewRecord ? (
              <DetailsList
                items={[
                  { label: "Service", value: viewRecord.serviceName },
                  { label: "Provider", value: viewRecord.providerName },
                  { label: "Client", value: viewRecord.clientName },
                  { label: "Initiated by", value: viewRecord.initiatedBy },
                  { label: "Status", value: <StatusPill value={normStatus(viewRecord.status, tab)} /> },
                  { label: "Date initiated", value: viewRecord.createdAtReadable },
                ]}
              />
            ) : (
              <div className="flex items-center justify-center py-10">
                <span className="inline-flex items-center gap-2 text-sm text-gray-700">
                  <Spinner className="!text-gray-700" /> Loading details…
                </span>
              </div>
            )}
          </Modal>

          {/* Chat Drawer */}
          <Drawer
            open={drawerOpen}
            title={`Dispute conversation${activeChatId ? ` • ${activeChatId}` : ""}`}
            onClose={() => {
              setDrawerOpen(false);
              closeChat();
            }}
            footer={
              <form onSubmit={handleSend} className="flex gap-2">
                <input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="Type something…"
                  className="flex-1 border rounded-lg px-3 py-2 text-sm outline-none focus:ring"
                />
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg text-white disabled:opacity-50"
                  style={{ backgroundColor: BRAND_RGB }}
                  disabled={!canSend}
                  title={!canSend ? "Type a message" : undefined}
                >
                  Send
                </button>
              </form>
            }
          >
            {/* Participants header */}
            <div className="p-4 border-b bg-white">
              <div className="flex items-center gap-3">
                <AvatarStack participants={safeParticipants} />
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-gray-900">Dispute conversation</div>
                  <div className="text-xs text-gray-500 truncate">
                    {safeParticipants.map((p) => p.name).join(" • ")}
                  </div>
                </div>
              </div>
            </div>

            {/* Message list */}
            <div ref={scrollerRef} className="p-4 space-y-3 h-[calc(100%-4rem-64px)] overflow-y-auto">
              {chatLoading && (
                <div className="text-xs text-gray-500 inline-flex items-center gap-2">
                  <Spinner className="!text-gray-500" /> Loading conversation…
                </div>
              )}
              {chatError && <div className="text-xs text-red-600">{chatError}</div>}

              {(safeChatMessages || []).map((m) => {
                const mine = m.senderId === "soundhive_admin";
                const sender = who(m.senderId);
                const bubbleClass = mine ? "bg-[rgb(77,52,144)] text-white" : "bg-gray-100 text-gray-800";
                return (
                  <div key={m.id} className={`flex items-start gap-2 ${mine ? "justify-end" : "justify-start"}`}>
                    {!mine && <Avatar src={sender.avatarUrl} name={sender.name} />}
                    <div className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm leading-5 ${bubbleClass}`}>
                      <div className={`text-[11px] ${mine ? "text-white/90" : "text-gray-600"} mb-1`}>
                        {sender.name}
                      </div>
                      <div>{m.text || "[no text]"}</div>
                      {m.timestamp && (
                        <div className={`text-[10px] mt-1 ${mine ? "text-white/70" : "text-gray-500"}`}>
                          {new Date(m.timestamp).toLocaleString()}
                        </div>
                      )}
                    </div>
                    {mine && <Avatar src={sender.avatarUrl} name={sender.name} />}
                  </div>
                );
              })}

              {!chatLoading && !safeChatMessages.length && (
                <div className="text-xs text-gray-500">No messages yet.</div>
              )}
            </div>
          </Drawer>

          <Footer />
        </div>
      </div>
    </main>
  );
};

export default Disputes;
