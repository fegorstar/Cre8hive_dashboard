// src/pages/dashboard/CreatorDetails.jsx
// Full-page details with tabs (Details / KYC & Residency / Services) + paginated services.
// Updates:
//  • Breadcrumb-style caption + "Back to Creators" like InvestmentDetails.
//  • Inner tabs now mimic main page tabs (brand color + thicker active underline).

import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import Sidebar from "../../components/layout/Sidebar";
import Navbar from "../../components/layout/Navbar";
import Footer from "../../components/layout/Footer";

import useCreatorsStore from "../../store/CreatorsStore";
import {
  FiArrowLeft,
  FiExternalLink,
  FiCopy,
  FiPhone,
  FiMail,
} from "react-icons/fi";

import Modal from "../../components/common/Modal";
import { ToastAlert, useToastAlert } from "../../components/common/ToastAlert";
import useAuthGuard from "../../lib/useAuthGuard";
import { Spinner } from "../../components/common/Spinner";

const BRAND_RGB = "rgb(77, 52, 144)";

const toHttpUrl = (v) => {
  const s = String(v || "").trim();
  if (!s) return "";
  return /^https?:\/\//i.test(s) ? s : `https://${s}`;
};
const isImageUrl = (v) => /\.(png|jpe?g|gif|webp|svg)$/i.test(String(v || ""));
const dash = (v) => (v === undefined || v === null || v === "" ? "—" : v);
const fmtDate = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d)) return "—";
  return d.toLocaleString("en-NG", { year: "numeric", month: "short", day: "2-digit" });
};
const getName = (row = {}) => {
  const fn = row.user?.first_name?.trim();
  const ln = row.user?.last_name?.trim();
  if (fn || ln) return [fn, ln].filter(Boolean).join(" ");
  if (row.user?.surname) return row.user.surname;
  return row.name || "";
};
const getStatus = (row = {}) => {
  if (typeof row.active === "boolean") return row.active ? "active" : "inactive";
  const v = String(row.status ?? "").trim().toLowerCase();
  return v === "1" || v === "true" || v === "active" ? "active" : "inactive";
};

const CopyBtn = ({ value }) => {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className="inline-flex items-center gap-1 px-2 py-1 rounded border text-[11px] border-gray-300 hover:bg-gray-50"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(String(value || ""));
          setDone(true);
          setTimeout(() => setDone(false), 1200);
        } catch {}
      }}
      title="Copy"
    >
      <FiCopy className="w-3.5 h-3.5" />
      {done ? "Copied" : "Copy"}
    </button>
  );
};

const LinkField = ({ url, label }) => {
  const href = toHttpUrl(url);
  if (!href)
    return (
      <span className="text-gray-700 text-[13px] break-all" title={label || ""}>
        —
      </span>
    );

  const openBtn = (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 px-2 py-1 rounded border border-gray-300 hover:bg-gray-50 text-[11px]"
      title={label ? `Open ${label}` : "Open in new tab"}
    >
      <FiExternalLink className="w-3.5 h-3.5" />
      Open
    </a>
  );

  if (isImageUrl(href)) {
    return (
      <div className="flex items-center gap-2">
        <a href={href} target="_blank" rel="noopener noreferrer" className="shrink-0">
          <img
            src={href}
            alt={label || "preview"}
            className="h-14 w-14 object-cover rounded border border-gray-200"
          />
        </a>
        <div className="flex items-center gap-2">
          {openBtn}
          <CopyBtn value={href} />
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="max-w-[14rem] truncate text-[12px] text-gray-700" title={href}>
        {href}
      </span>
      {openBtn}
      <CopyBtn value={href} />
    </div>
  );
};

const Field = ({ label, children }) => (
  <div className="space-y-1">
    <div className="text-[11px] uppercase tracking-wide text-gray-500">{label}</div>
    <div className="text-[13px] text-gray-800">{children ?? <span>—</span>}</div>
  </div>
);

const StatusPill = ({ value = "inactive" }) => {
  const active = String(value).toLowerCase() === "active";
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${
        active
          ? "bg-green-50 text-green-700 border border-green-200"
          : "bg-gray-50 text-gray-700 border border-gray-200"
      }`}
    >
      {active ? "Active" : "Inactive"}
    </span>
  );
};

const Toggle = ({ checked, onChange }) => (
  <button
    type="button"
    onClick={() => onChange(!checked)}
    className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
      checked ? "bg-green-500" : "bg-gray-300"
    }`}
    aria-pressed={checked}
  >
    <span
      className={`inline-block h-5 w-5 transform rounded-full bg-white transition ${
        checked ? "translate-x-5" : "translate-x-1"
      }`}
    />
  </button>
);

const TextArea = (props) => (
  <textarea
    {...props}
    className={`min-h-[84px] px-3 py-2 rounded-lg border border-gray-300 outline-none focus:ring-2 text-sm w-full ${
      props.className || ""
    }`}
    style={{ "--tw-ring-color": BRAND_RGB }}
  />
);
const Text = (props) => (
  <input
    {...props}
    className={`h-10 px-3 rounded-lg border border-gray-300 outline-none focus:ring-2 text-sm w-full ${
      props.className || ""
    }`}
    style={{ "--tw-ring-color": BRAND_RGB }}
  />
);
const Select = (props) => (
  <select
    {...props}
    className={`h-10 px-3 rounded-lg border border-gray-300 outline-none focus:ring-2 text-sm w-full ${
      props.className || ""
    }`}
    style={{ "--tw-ring-color": BRAND_RGB }}
  />
);

/* ---------- inner tabs (now styled like main tabs) ---------- */
const SectionTabs = ({ value, onChange }) => {
  const tabs = [
    { key: "details", label: "Details" },
    { key: "kyc", label: "KYC & Residency" },
    { key: "services", label: "Services" },
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
              className={`relative -mb-px px-4 py-2 text-sm font-semibold transition-colors border-solid ${
                active ? "border-b-4" : "border-b-2"
              } border-b rounded-t-lg`}
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

const Card = ({ title, children }) => (
  <div className="rounded-xl border border-gray-200 p-3 space-y-3 bg-white">
    <div className="text-[12px] font-semibold text-gray-700">{title}</div>
    {children}
  </div>
);

/* ---------- service items ---------- */
const ServiceStatusBtn = ({ label, active, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={`px-2.5 py-1 rounded border text-[11px] ${
      active ? "border-[#4D3490] text-white" : "border-gray-300 text-gray-700 hover:bg-gray-50"
    }`}
    style={active ? { backgroundColor: BRAND_RGB } : {}}
  >
    {label}
  </button>
);

const ServiceCard = ({ svc, onSetStatus, busy }) => {
  const img = svc.cover_image;
  const audio = svc.service_audio;
  const link = svc.link;
  const is = (v) => String(svc.status).toUpperCase() === v;

  return (
    <div className="rounded-xl border border-gray-200 p-3 space-y-3 bg-white">
      <div className="flex items-center gap-3">
        {isImageUrl(img) && (
          <img src={toHttpUrl(img)} alt="" className="w-16 h-16 rounded object-cover border" />
        )}
        <div className="min-w-0">
          <div className="font-medium text-sm truncate">{dash(svc.service_name)}</div>
          <div className="text-xs text-gray-600">Rate: {dash(svc.rate)}</div>
          <div className="text-xs text-gray-600">Status: {dash(svc.status)}</div>
          <div className="text-[11px] text-gray-500">Updated: {dash(svc.updatedAtReadable)}</div>
        </div>
        <div className="ml-auto">
          <LinkField url={link} label="service link" />
        </div>
      </div>

      {audio && <audio className="w-full" controls src={toHttpUrl(audio)} />}

      <div className="flex items-center gap-2">
        <ServiceStatusBtn label="Publish" active={is("PUBLISHED")} onClick={() => onSetStatus(svc, "PUBLISHED")} />
        <ServiceStatusBtn label="Pending" active={is("PENDING")} onClick={() => onSetStatus(svc, "PENDING")} />
        <ServiceStatusBtn label="Reject" active={is("REJECTED")} onClick={() => onSetStatus(svc, "REJECTED")} />
        {busy && (
          <span className="inline-flex items-center text-xs text-gray-500 gap-1 ml-2">
            <Spinner className="!text-gray-500" /> updating…
          </span>
        )}
      </div>
    </div>
  );
};

/* ---------- Edit modal (unchanged) ---------- */
const EditCreatorModal = ({ open, data, saving, onClose, onSubmit }) => {
  const [form, setForm] = useState({
    gender: "",
    nin: "",
    id_type: "",
    copy_of_id: "",
    utility_bill: "",
    copy_of_utility_bill: "",
    job_title: "",
    bio: "",
    active: false,
    location: "",
    linkedin: "",
    x: "",
    instagram: "",
  });

  useEffect(() => {
    if (!data) return;
    setForm({
      gender: data.gender || data.user?.gender || "",
      nin: data.nin || data.user?.nin || "",
      id_type: data.id_type || "",
      copy_of_id: data.copy_of_id || "",
      utility_bill: data.utility_bill || "",
      copy_of_utility_bill: data.copy_of_utility_bill || "",
      job_title: data.job_title || "",
      bio: data.bio || "",
      active: typeof data.active === "boolean" ? data.active : getStatus(data) === "active",
      location: data.location || "",
      linkedin: data.linkedin || "",
      x: data.x || "",
      instagram: data.instagram || "",
    });
  }, [data]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <Modal open={open} title={data ? `Edit Creator: ${getName(data) || `#${data.id}`}` : ""} onClose={onClose}>
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <div className="text-xs text-gray-600 mb-1">Gender</div>
            <Select value={form.gender} onChange={(e) => set("gender", e.target.value)}>
              <option value="">—</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </Select>
          </div>
          <div>
            <div className="text-xs text-gray-600 mb-1">NIN</div>
            <Text value={form.nin} onChange={(e) => set("nin", e.target.value)} />
          </div>

          <div>
            <div className="text-xs text-gray-600 mb-1">ID Type</div>
            <Text value={form.id_type} onChange={(e) => set("id_type", e.target.value)} />
          </div>
          <div>
            <div className="text-xs text-gray-600 mb-1">Copy of ID (URL)</div>
            <Text value={form.copy_of_id} onChange={(e) => set("copy_of_id", e.target.value)} />
          </div>

          <div>
            <div className="text-xs text-gray-600 mb-1">Utility bill</div>
            <Text
              placeholder="e.g., electricity_bill"
              value={form.utility_bill}
              onChange={(e) => set("utility_bill", e.target.value)}
            />
          </div>
          <div>
            <div className="text-xs text-gray-600 mb-1">Copy of utility bill (URL)</div>
            <Text
              value={form.copy_of_utility_bill}
              onChange={(e) => set("copy_of_utility_bill", e.target.value)}
            />
          </div>

          <div className="md:col-span-2">
            <div className="text-xs text-gray-600 mb-1">Job title</div>
            <Text value={form.job_title} onChange={(e) => set("job_title", e.target.value)} />
          </div>

          <div className="md:col-span-2">
            <div className="text-xs text-gray-600 mb-1">Bio</div>
            <TextArea value={form.bio} onChange={(e) => set("bio", e.target.value)} />
          </div>

          <div>
            <div className="text-xs text-gray-600 mb-1">Location</div>
            <Text value={form.location} onChange={(e) => set("location", e.target.value)} />
          </div>

          <div>
            <div className="text-xs text-gray-600 mb-1">LinkedIn</div>
            <Text value={form.linkedin} onChange={(e) => set("linkedin", e.target.value)} />
          </div>
          <div>
            <div className="text-xs text-gray-600 mb-1">X</div>
            <Text value={form.x} onChange={(e) => set("x", e.target.value)} />
          </div>
          <div>
            <div className="text-xs text-gray-600 mb-1">Instagram</div>
            <Text value={form.instagram} onChange={(e) => set("instagram", e.target.value)} />
          </div>

          <div className="md:col-span-2">
            <div className="text-xs text-gray-600 mb-1">Active</div>
            <div className="flex items-center gap-2">
              <Toggle checked={!!form.active} onChange={(v) => set("active", v)} />
              <span className="text-sm">{form.active ? "Active" : "Inactive"}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 text-sm"
            disabled={saving}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onSubmit(form)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm text-white"
            style={{ backgroundColor: BRAND_RGB }}
            disabled={saving}
          >
            {saving ? (
              <>
                <Spinner className="!text-white" /> Saving…
              </>
            ) : (
              "Save changes"
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
};

const CreatorDetails = () => {
  const navigate = useNavigate();
  useAuthGuard(navigate);
  const { id } = useParams();

  const toast = useToastAlert();
  const {
    currentCreator,
    fetchCreator,
    toggleCreatorStatus,
    updateCreator,

    // services
    servicesByUser,
    servicesMetaByUser,
    loadingServices,
    fetchServices,
    updateServiceStatus,
  } = useCreatorsStore();

  const [detailsTab, setDetailsTab] = useState("details");
  const [togglingId, setTogglingId] = useState(null);

  // Edit modal
  const [editOpen, setEditOpen] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);

  // Load creator
  useEffect(() => {
    if (!id) return;
    fetchCreator?.(id).catch((e) =>
      toast.add({ type: "error", title: "Failed", message: e?.message || "Could not load creator." })
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const creator = currentCreator;

  // Load first page of services on mount + whenever id changes
  useEffect(() => {
    if (!id) return;
    fetchServices?.({ page: 1, per_page: 10, user_id: id }).catch((e) => {
      toast.add({ type: "error", title: "Failed", message: e?.message || "Could not load services." });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const servicesForView = useMemo(() => {
    if (!id) return [];
    const map = servicesByUser || {};
    return map[Number(id)] || [];
  }, [servicesByUser, id]);

  const servicesMetaForView = useMemo(() => {
    if (!id) return null;
    const map = servicesMetaByUser || {};
    return map[Number(id)] || null;
  }, [servicesMetaByUser, id]);

  const loadServicesPage = (pageNum) => {
    if (!id) return;
    fetchServices?.({ page: pageNum, per_page: 10, user_id: id }).catch((e) => {
      toast.add({ type: "error", title: "Failed", message: e?.message || "Could not load services." });
    });
  };

  const [serviceBusyId, setServiceBusyId] = useState(null);
  const handleUpdateServiceStatus = async (svc, status) => {
    try {
      setServiceBusyId(svc.id);
      await updateServiceStatus?.(svc.id, status);
      toast.add({ type: "success", title: "Service updated", message: `Status set to ${status}` });
      const cur = servicesMetaForView?.currentPage || 1;
      await fetchServices?.({ page: cur, per_page: 10, user_id: id });
    } catch (e) {
      toast.add({ type: "error", title: "Update failed", message: e?.message || "Could not update service." });
      console.error(e);
    } finally {
      setServiceBusyId(null);
    }
  };

  const handleToggleActive = async () => {
    if (!creator) return;
    try {
      setTogglingId(creator.id);
      await toggleCreatorStatus?.(creator.id);
      toast.add({ type: "success", title: "Status updated Successfully" });
      await fetchCreator?.(creator.id);
    } catch (e) {
      toast.add({ type: "error", title: "Failed", message: e?.message || "Status change failed." });
      console.error(e);
    } finally {
      setTogglingId(null);
    }
  };

  const submitEdit = async (values) => {
    if (!creator) return;
    try {
      setSavingEdit(true);

      const creatorPayload = {
        gender: values.gender || undefined,
        nin: values.nin || undefined,
        id_type: values.id_type || undefined,
        copy_of_id: values.copy_of_id || undefined,
        utility_bill: values.utility_bill || undefined,
        copy_of_utility_bill: values.copy_of_utility_bill || undefined,
        job_title: values.job_title || undefined,
        bio: values.bio || undefined,
        active: typeof values.active === "boolean" ? values.active : undefined,
        location: values.location || undefined,
        linkedin: values.linkedin || undefined,
        x: values.x || undefined,
        instagram: values.instagram || undefined,
      };

      await updateCreator?.(creator.id, creatorPayload);
      toast.add({ type: "success", title: "Creator updated Successfully" });
      await fetchCreator?.(creator.id);
      setEditOpen(false);
    } catch (e) {
      toast.add({ type: "error", title: "Update failed", message: e?.message || "Could not update creator." });
      console.error(e);
    } finally {
      setSavingEdit(false);
    }
  };

  const active = getStatus(creator || {}) === "active";
  const avatar = creator?.user?.image;

  return (
    <main>
      <ToastAlert toasts={toast.toasts} remove={toast.remove} />

      <div className="overflow-x-hidden flex bg-gray-50">
        <Sidebar />
        <div
          id="app-layout-content"
          className="relative min-h-screen w-full min-w-[100vw] md:min-w-0 ml-[15.625rem] [transition:margin_0.25s_ease-out]"
        >
          <Navbar />

          <div className="px-6 pb-20 pt-6">
            {/* Breadcrumb-ish caption */}
            <div className="text-xs text-gray-500 mb-2">
              <span className="font-medium text-gray-600">Creators</span>
              <span className="mx-1">/</span>
              <span>Creator details</span>
            </div>

            {/* Top bar with back + status + edit */}
            <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-4 mb-4">
              {!creator ? (
                <div className="text-sm text-gray-600 flex items-center gap-2">
                  <Spinner className="!text-gray-600" /> Loading creator…
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-3">
                    <button
                      className="inline-flex items-center gap-2 px-3 py-2 rounded border hover:bg-gray-50"
                      onClick={() => navigate("/creators")}
                    >
                      <FiArrowLeft /> Back to Creators
                    </button>

                    <div className="flex items-center gap-3">
                      <StatusPill value={getStatus(creator)} />
                      <Toggle checked={active} onChange={handleToggleActive} />
                      {togglingId === creator.id && (
                        <span className="inline-flex items-center text-xs text-gray-500 gap-1">
                          <Spinner className="!text-gray-500" /> updating…
                        </span>
                      )}
                      <button
                        type="button"
                        className="px-3 py-1.5 rounded-lg text-white text-sm"
                        style={{ backgroundColor: BRAND_RGB }}
                        onClick={() => setEditOpen(true)}
                      >
                        Edit
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    {isImageUrl(avatar) && (
                      <img src={toHttpUrl(avatar)} alt="" className="w-12 h-12 rounded-full object-cover border" />
                    )}
                    <div className="min-w-0">
                      <div className="text-lg font-semibold truncate">{dash(getName(creator))}</div>
                      <div className="text-xs text-gray-600">ID: {dash(creator.id)}</div>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Tabs (styled like main page tabs) */}
            <SectionTabs value={detailsTab} onChange={setDetailsTab} />

            {/* CONTENT */}
            <div className="pt-4">
              {/* DETAILS */}
              {detailsTab === "details" && creator && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card title="Personal">
                    <div className="grid grid-cols-1 gap-3">
                      <Field label="First name">{dash(creator.user?.first_name)}</Field>
                      <Field label="Middle name">{dash(creator.user?.middle_name)}</Field>
                      <Field label="Last name">{dash(creator.user?.last_name)}</Field>
                      <Field label="Surname">{dash(creator.user?.surname)}</Field>
                      <Field label="Gender">{dash(creator.gender || creator.user?.gender)}</Field>
                      <Field label="DOB">{dash(creator.user?.dob && fmtDate(creator.user?.dob))}</Field>
                      <Field label="Email">
                        <span className="inline-flex items-center gap-2">
                          <FiMail className="w-4 h-4 text-gray-500" />
                          {dash(creator.user?.email)}
                          <CopyBtn value={creator.user?.email} />
                        </span>
                      </Field>
                      <Field label="Phone">
                        <span className="inline-flex items-center gap-2">
                          <FiPhone className="w-4 h-4 text-gray-500" />
                          {dash(creator.user?.phone_number || creator.phone_number)}
                        </span>
                      </Field>
                      <Field label="Role">{dash(creator.user?.role)}</Field>
                    </div>
                  </Card>

                  <Card title="Account & Profile">
                    <div className="grid grid-cols-1 gap-3">
                      <Field label="Active">
                        <StatusPill value={getStatus(creator)} />
                      </Field>
                      <Field label="Services count">{dash(creator.services_count)}</Field>
                      <Field label="Created">{dash(fmtDate(creator.created_at))}</Field>
                      <Field label="Updated">{dash(fmtDate(creator.updated_at))}</Field>
                      <Field label="Job title">{dash(creator.job_title)}</Field>
                      <Field label="Bio">{dash(creator.bio)}</Field>
                      <Field label="Location">{dash(creator.location)}</Field>
                      <Field label="LinkedIn">
                        <LinkField url={creator.linkedin} label="LinkedIn" />
                      </Field>
                      <Field label="X">
                        <LinkField url={creator.x} label="X" />
                      </Field>
                      <Field label="Instagram">
                        <LinkField url={creator.instagram} label="Instagram" />
                      </Field>
                    </div>
                  </Card>
                </div>
              )}

              {/* KYC & Residency */}
              {detailsTab === "kyc" && creator && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card title="KYC">
                    <div className="grid grid-cols-1 gap-3">
                      <Field label="NIN">{dash(creator.nin || creator.user?.nin)}</Field>
                      <Field label="ID type">{dash(creator.id_type)}</Field>
                      <Field label="Copy of ID">
                        <LinkField url={creator.copy_of_id} label="ID" />
                      </Field>
                      <Field label="Utility bill">{dash(creator.utility_bill)}</Field>
                      <Field label="Copy of utility bill">
                        <LinkField url={creator.copy_of_utility_bill} label="utility bill" />
                      </Field>
                      <Field label="Name on card">{dash(creator.user?.name_on_card)}</Field>
                      <Field label="Verified">{creator.verified ? "Yes" : "No"}</Field>
                    </div>
                  </Card>

                  <Card title="Residency">
                    <div className="grid grid-cols-1 gap-3">
                      <Field label="State of origin">{dash(creator.user?.state_of_origin || creator.state_of_origin)}</Field>
                      <Field label="LGA of origin">{dash(creator.user?.lga_of_origin || creator.lga_of_origin)}</Field>
                      <Field label="State of capture">{dash(creator.state_of_capture)}</Field>
                      <Field label="LGA of capture">{dash(creator.lga_of_capture)}</Field>
                      <Field label="State of residence">{dash(creator.state_of_residence)}</Field>
                      <Field label="LGA of residence">{dash(creator.lga_of_residence)}</Field>
                      <Field label="Marital status">{dash(creator.marital_status)}</Field>
                      <Field label="Enroll bank code">{dash(creator.enroll_bank_code)}</Field>
                      <Field label="Enroll user name">{dash(creator.enroll_user_name)}</Field>
                      <Field label="BVN">{dash(creator.user?.bvn)}</Field>
                      <Field label="BVN reference">{dash(creator.bvn_reference)}</Field>
                      <Field label="Product reference">{dash(creator.product_reference)}</Field>
                      <Field label="Watchlisted">{dash(creator.watchlisted)}</Field>
                      <Field label="Enrollment date">{dash(creator.enrollment_date && fmtDate(creator.enrollment_date))}</Field>
                      <Field label="Branch name">{dash(creator.branch_name)}</Field>
                      <Field label="Landmarks">{dash(creator.landmarks)}</Field>
                      <Field label="Additional info">{dash(creator.additional_info1)}</Field>
                    </div>
                  </Card>
                </div>
              )}

              {/* SERVICES */}
              {detailsTab === "services" && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-semibold">Services</div>
                    <div className="text-xs text-gray-600">
                      {loadingServices ? (
                        <span className="inline-flex items-center gap-1">
                          <Spinner className="!text-gray-600" /> Loading services…
                        </span>
                      ) : (
                        <>
                          Page {servicesMetaForView?.currentPage || 1} / {servicesMetaForView?.lastPage || 1} —{" "}
                          {servicesMetaForView?.total || 0} total
                        </>
                      )}
                    </div>
                  </div>

                  {Array.isArray(servicesForView) && servicesForView.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {servicesForView.map((s) => (
                        <ServiceCard
                          key={s.id}
                          svc={s}
                          busy={serviceBusyId === s.id}
                          onSetStatus={(svc, status) => handleUpdateServiceStatus(svc, status)}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm text-gray-600 py-4">
                      {loadingServices ? " " : "No services for this creator yet."}
                    </div>
                  )}

                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      className={`px-3 py-1.5 rounded-lg border ${
                        (servicesMetaForView?.currentPage || 1) <= 1
                          ? "text-gray-400 border-gray-200"
                          : "border-gray-300 hover:bg-gray-50"
                      }`}
                      disabled={(servicesMetaForView?.currentPage || 1) <= 1 || loadingServices}
                      onClick={() => loadServicesPage(Math.max(1, (servicesMetaForView?.currentPage || 1) - 1))}
                    >
                      Prev
                    </button>
                    <span className="text-sm text-gray-600">
                      Page {servicesMetaForView?.currentPage || 1} / {servicesMetaForView?.lastPage || 1}
                    </span>
                    <button
                      className={`px-3 py-1.5 rounded-lg border ${
                        (servicesMetaForView?.currentPage || 1) >= (servicesMetaForView?.lastPage || 1)
                          ? "text-gray-400 border-gray-200"
                          : "border-gray-300 hover:bg-gray-50"
                      }`}
                      disabled={
                        (servicesMetaForView?.currentPage || 1) >= (servicesMetaForView?.lastPage || 1) || loadingServices
                      }
                      onClick={() =>
                        loadServicesPage(
                          Math.min(servicesMetaForView?.lastPage || 1, (servicesMetaForView?.currentPage || 1) + 1)
                        )
                      }
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Edit modal */}
          <EditCreatorModal
            open={editOpen}
            data={creator}
            saving={savingEdit}
            onClose={() => setEditOpen(false)}
            onSubmit={submitEdit}
          />

          <Footer />
        </div>
      </div>
    </main>
  );
};

export default CreatorDetails;
