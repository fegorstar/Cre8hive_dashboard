// src/pages/dashboard/Creators.jsx
// Update form now includes ONLY creator fields supported by your update endpoint.
// (gender, nin, id_type, copy_of_id, utility_bill, copy_of_utility_bill,
//  job_title, bio, active, location, linkedin, x, instagram)

import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";

import Sidebar from "../../components/layout/Sidebar";
import Navbar from "../../components/layout/Navbar";
import Footer from "../../components/layout/Footer";

import useCreatorsStore from "../../store/CreatorsStore";
import {
  FiMoreVertical,
  FiSearch,
  FiExternalLink,
  FiCopy,
  FiPhone,
  FiMail,
} from "react-icons/fi";

import Modal from "../../components/common/Modal";
import { ToastAlert, useToastAlert } from "../../components/common/ToastAlert";
import useClickOutside from "../../lib/useClickOutside";
import useAuthGuard from "../../lib/useAuthGuard";
import { Spinner } from "../../components/common/Spinner";

const BRAND_RGB = "rgb(77, 52, 144)";

/* ===========================
   Tiny helpers
   =========================== */
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
  return d.toLocaleString("en-NG", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
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

const classifyType = (row = {}) => {
  const job = String(row.job_title || "").toLowerCase();
  if (
    Number(row.services_count) > 0 ||
    (Array.isArray(row.services) && row.services.length > 0)
  ) {
    return "service_providers";
  }
  if (job.includes("artist") || job.includes("dj") || job.includes("singer"))
    return "artists";
  if (job.includes("asset") || job.includes("assets")) return "assets_creators";
  if (row.is_artist) return "artists";
  if (row.is_service || row.service_provider) return "service_providers";
  if (row.is_asset || row.assets_creator) return "assets_creators";
  return "service_providers";
};

/* ===========================
   3-dots menu
   =========================== */
const ThreeDotsMenu = ({ items }) => {
  const [open, setOpen] = useState(false);
  const safeItems = Array.isArray(items) ? items : [];
  const ref = useRef(null);
  useClickOutside(ref, () => setOpen(false));
  return (
    <div className="relative inline-block text-left" ref={ref}>
      <button
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

/* ===========================
   Read-only helpers
   =========================== */
const CopyBtn = ({ value, small }) => {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className={`inline-flex items-center gap-1 px-2 py-1 rounded border text-[11px] ${
        small ? "" : "ml-2"
      } border-gray-300 hover:bg-gray-50`}
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
          <CopyBtn value={href} small />
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
      <CopyBtn value={href} small />
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

/* ===========================
   Tabs
   =========================== */
const Tabs = ({ value, onChange }) => {
  const tabs = [
    { key: "assets_creators", label: "Assets creators" },
    { key: "service_providers", label: "Service providers" },
    { key: "artists", label: "Artists" },
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

/* ===========================
   Table
   =========================== */
const CreatorsTable = ({
  rows,
  q,
  loadingList,
  onView,
  onEdit,
  onToggle,
  togglingId,
  footerLeft,
  footerRight,
}) => {
  const safeRows = Array.isArray(rows) ? rows : [];
  const emptyText = q ? `No results found for “${q}”` : "No creators yet.";

  return (
    <div className="relative rounded-xl border border-gray-200 overflow-hidden">
      <div className="overflow-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="text-left px-4 py-3 font-semibold">ID</th>
              <th className="text-left px-4 py-3 font-semibold">Name</th>
              <th className="text-left px-4 py-3 font-semibold">Gender</th>
              <th className="text-left px-4 py-3 font-semibold">NIN</th>
              <th className="text-left px-4 py-3 font-semibold">Joined</th>
              <th className="text-left px-4 py-3 font-semibold">Updated</th>
              <th className="text-left px-4 py-3 font-semibold">Status</th>
              <th className="text-right px-4 py-3 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {safeRows.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-gray-500">
                  {loadingList ? (
                    <span className="inline-flex items-center gap-2">
                      <Spinner className="!text-gray-500" /> Loading…
                    </span>
                  ) : (
                    emptyText
                  )}
                </td>
              </tr>
            ) : (
              safeRows.map((row) => {
                const active = getStatus(row) === "active";
                const name = getName(row);
                const isToggling = togglingId === row.id;
                return (
                  <tr key={row.id} className="border-t border-gray-100">
                    <td className="px-4 py-3">{dash(row.id)}</td>
                    <td className="px-4 py-3">{dash(name)}</td>
                    <td className="px-4 py-3 capitalize">
                      {dash(row.gender || row.user?.gender)}
                    </td>
                    <td className="px-4 py-3">{dash(row.nin || row.user?.nin)}</td>
                    <td className="px-4 py-3">
                      {dash(row.createdAtReadable || fmtDate(row.created_at))}
                    </td>
                    <td className="px-4 py-3">
                      {dash(row.updatedAtReadable || fmtDate(row.updated_at))}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <StatusPill value={getStatus(row)} />
                        <Toggle checked={active} onChange={() => onToggle(row)} />
                        {isToggling && (
                          <span className="inline-flex items-center text-xs text-gray-500 gap-1">
                            <Spinner className="!text-gray-500" /> updating…
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <ThreeDotsMenu
                        items={[
                          { label: "View", onClick: () => onView(row) },
                          { label: "Edit", onClick: () => onEdit(row) },
                        ]}
                      />
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 px-4 py-3 bg-white border-t border-gray-200">
        <div className="text-sm text-gray-600">{footerLeft}</div>
        <div>{footerRight}</div>
      </div>
    </div>
  );
};

/* ===========================
   Details Modal (read-only)
   =========================== */
const Card = ({ title, children }) => (
  <div className="rounded-xl border border-gray-200 p-3 space-y-3 bg-white">
    <div className="text-[12px] font-semibold text-gray-700">{title}</div>
    {children}
  </div>
);

const CreatorDetails = ({ data, onToggle, togglingId }) => {
  if (!data) return null;
  const active = getStatus(data) === "active";
  const name = getName(data);
  const avatar = data.user?.image;
  const isToggling = togglingId === data.id;

  const serviceCards = (Array.isArray(data.services) ? data.services : []).map((s) => {
    const bookings = Array.isArray(s.bookings) ? s.bookings : [];
    return (
      <div key={s.id} className="rounded-xl border border-gray-200 p-3 space-y-2 bg-white">
        <div className="flex items-center gap-3">
          {isImageUrl(s.cover_image) && (
            <img
              src={toHttpUrl(s.cover_image)}
              alt=""
              className="w-16 h-16 rounded object-cover border"
            />
          )}
          <div className="min-w-0">
            <div className="font-medium text-sm truncate">{dash(s.service_name)}</div>
            <div className="text-xs text-gray-600">Rate: {dash(s.rate)}</div>
            <div className="text-xs text-gray-600">Status: {dash(s.status)}</div>
          </div>
          <div className="ml-auto">
            <LinkField url={s.link} label="service link" />
          </div>
        </div>

        {bookings.length > 0 && (
          <div className="pt-1">
            <div className="text-[11px] uppercase tracking-wide text-gray-500 mb-1">
              Bookings ({bookings.length})
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs border border-gray-100 rounded">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-2 py-1">ID</th>
                    <th className="text-left px-2 py-1">Dates</th>
                    <th className="text-left px-2 py-1">Status</th>
                    <th className="text-left px-2 py-1">Customer</th>
                  </tr>
                </thead>
                <tbody>
                  {bookings.map((b) => (
                    <tr key={b.id} className="border-t">
                      <td className="px-2 py-1">{dash(b.id)}</td>
                      <td className="px-2 py-1">
                        {Array.isArray(b.date) ? b.date.join(", ") : dash(b.date)}
                      </td>
                      <td className="px-2 py-1">{dash(b.status)}</td>
                      <td className="px-2 py-1">
                        {dash(
                          [b.user?.first_name, b.user?.last_name]
                            .filter(Boolean)
                            .join(" ") || b.user?.email
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    );
  });

  return (
    <div className="space-y-6">
      {/* Header strip */}
      <div className="flex items-center gap-3">
        {isImageUrl(avatar) && (
          <img
            src={toHttpUrl(avatar)}
            alt=""
            className="w-12 h-12 rounded-full object-cover border"
          />
        )}
        <div className="min-w-0">
          <div className="text-lg font-semibold truncate">{dash(name)}</div>
          <div className="text-xs text-gray-600">ID: {dash(data.id)}</div>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <StatusPill value={getStatus(data)} />
          <Toggle checked={active} onChange={() => onToggle(data)} />
          {isToggling && (
            <span className="inline-flex items-center text-xs text-gray-500 gap-1">
              <Spinner className="!text-gray-500" /> updating…
            </span>
          )}
        </div>
      </div>

      {/* Info cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card title="Personal">
          <div className="grid grid-cols-1 gap-3">
            <Field label="First name">{dash(data.user?.first_name)}</Field>
            <Field label="Middle name">{dash(data.user?.middle_name)}</Field>
            <Field label="Last name">{dash(data.user?.last_name)}</Field>
            <Field label="Surname">{dash(data.user?.surname)}</Field>
            <Field label="Gender">{dash(data.gender || data.user?.gender)}</Field>
            <Field label="DOB">{dash(data.user?.dob && fmtDate(data.user?.dob))}</Field>
            <Field label="Email">
              <span className="inline-flex items-center gap-2">
                <FiMail className="w-4 h-4 text-gray-500" />
                {dash(data.user?.email)}
                <CopyBtn value={data.user?.email} />
              </span>
            </Field>
            <Field label="Phone">
              <span className="inline-flex items-center gap-2">
                <FiPhone className="w-4 h-4 text-gray-500" />
                {dash(data.user?.phone_number || data.phone_number)}
              </span>
            </Field>
            <Field label="Role">{dash(data.user?.role)}</Field>
          </div>
        </Card>

        <Card title="KYC">
          <div className="grid grid-cols-1 gap-3">
            <Field label="NIN">{dash(data.nin || data.user?.nin)}</Field>
            <Field label="ID type">{dash(data.id_type)}</Field>
            <Field label="Copy of ID">
              <LinkField url={data.copy_of_id} label="ID" />
            </Field>
            <Field label="Utility bill">{dash(data.utility_bill)}</Field>
            <Field label="Copy of utility bill">
              <LinkField url={data.copy_of_utility_bill} label="utility bill" />
            </Field>
            <Field label="Name on card">{dash(data.user?.name_on_card)}</Field>
            <Field label="Verified">{data.verified ? "Yes" : "No"}</Field>
          </div>
        </Card>

        <Card title="Residency">
          <div className="grid grid-cols-1 gap-3">
            <Field label="Location">{dash(data.location)}</Field>
            <Field label="State of origin">{dash(data.user?.state_of_origin || data.state_of_origin)}</Field>
            <Field label="LGA of origin">{dash(data.user?.lga_of_origin || data.lga_of_origin)}</Field>
            <Field label="State of capture">{dash(data.state_of_capture)}</Field>
            <Field label="LGA of capture">{dash(data.lga_of_capture)}</Field>
            <Field label="State of residence">{dash(data.state_of_residence)}</Field>
            <Field label="LGA of residence">{dash(data.lga_of_residence)}</Field>
            <Field label="Marital status">{dash(data.marital_status)}</Field>
          </div>
        </Card>

        <Card title="Enrollment & Banking">
          <div className="grid grid-cols-1 gap-3">
            <Field label="Enroll bank code">{dash(data.enroll_bank_code)}</Field>
            <Field label="Enroll user name">{dash(data.enroll_user_name)}</Field>
            <Field label="BVN">{dash(data.user?.bvn)}</Field>
            <Field label="BVN reference">{dash(data.bvn_reference)}</Field>
            <Field label="Product reference">{dash(data.product_reference)}</Field>
            <Field label="Watchlisted">{dash(data.watchlisted)}</Field>
            <Field label="Enrollment date">{dash(data.enrollment_date && fmtDate(data.enrollment_date))}</Field>
            <Field label="Branch name">{dash(data.branch_name)}</Field>
            <Field label="Landmarks">{dash(data.landmarks)}</Field>
            <Field label="Additional info">{dash(data.additional_info1)}</Field>
          </div>
        </Card>

        <Card title="Social">
          <div className="grid grid-cols-1 gap-3">
            <Field label="LinkedIn">
              <LinkField url={data.linkedin} label="LinkedIn" />
            </Field>
            <Field label="X">
              <LinkField url={data.x} label="X" />
            </Field>
            <Field label="Instagram">
              <LinkField url={data.instagram} label="Instagram" />
            </Field>
          </div>
        </Card>

        <Card title="Account">
          <div className="grid grid-cols-1 gap-3">
            <Field label="Active">
              <StatusPill value={getStatus(data)} />
            </Field>
            <Field label="Services count">{dash(data.services_count)}</Field>
            <Field label="Created">{dash(fmtDate(data.created_at))}</Field>
            <Field label="Updated">{dash(fmtDate(data.updated_at))}</Field>
            <Field label="Job title">{dash(data.job_title)}</Field>
            <Field label="Bio">{dash(data.bio)}</Field>
          </div>
        </Card>
      </div>

      {serviceCards.length > 0 && (
        <>
          <div className="text-sm font-semibold">Services</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{serviceCards}</div>
        </>
      )}
    </div>
  );
};

/* ===========================
   EDIT MODAL (write)
   =========================== */
const Text = (props) => (
  <input
    {...props}
    className={`h-10 px-3 rounded-lg border border-gray-300 outline-none focus:ring-2 focus:ring-[#4D3490] text-sm w-full ${
      props.className || ""
    }`}
  />
);
const TextArea = (props) => (
  <textarea
    {...props}
    className={`min-h-[84px] px-3 py-2 rounded-lg border border-gray-300 outline-none focus:ring-2 focus:ring-[#4D3490] text-sm w-full ${
      props.className || ""
    }`}
  />
);
const Select = (props) => (
  <select
    {...props}
    className={`h-10 px-3 rounded-lg border border-gray-300 outline-none focus:ring-2 focus:ring-[#4D3490] text-sm w-full ${
      props.className || ""
    }`}
  />
);
const Switch = ({ checked, onChange }) => (
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

const EditCreatorModal = ({ open, data, saving, onClose, onSubmit }) => {
  const [form, setForm] = useState({
    // ONLY CREATOR FIELDS
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
              <Switch checked={!!form.active} onChange={(v) => set("active", v)} />
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

/* ===========================
   Page
   =========================== */
const Creators = () => {
  const navigate = useNavigate();
  useAuthGuard(navigate);

  const toast = useToastAlert();
  const {
    creators,
    pagination,
    fetchCreators,
    toggleCreatorStatus,
    updateCreator,
  } = useCreatorsStore();

  // LOCAL list loading
  const [loadingList, setLoadingList] = useState(false);
  const fetchList = useCallback(
    async (params) => {
      setLoadingList(true);
      try {
        await fetchCreators?.(params);
      } finally {
        setLoadingList(false);
      }
    },
    [fetchCreators]
  );

  // Search/filter/page
  const [q, setQ] = useState("");
  const [status, setStatus] = useState(""); // 'active' | 'inactive' | ''
  const [page, setPage] = useState(1);
  const perPage = 10;

  // Tabs
  const [tab, setTab] = useState("service_providers");

  const [togglingId, setTogglingId] = useState(null);
  const [viewRec, setViewRec] = useState(null);

  // EDIT states
  const [editRec, setEditRec] = useState(null);
  const [savingEdit, setSavingEdit] = useState(false);

  // Initial fetch
  useEffect(() => {
    fetchList({ page: 1, per_page: perPage, q: "", status: "" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debounced reactive fetch
  useEffect(() => {
    const t = setTimeout(() => {
      fetchList({ page, per_page: perPage, q, status });
    }, 300);
    return () => clearTimeout(t);
  }, [page, q, status, fetchList]);

  const onSearchEnter = useCallback(
    (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        setPage(1);
        fetchList({ page: 1, per_page: perPage, q, status });
      }
    },
    [q, status, fetchList]
  );

  const allRowsRaw = useMemo(() => (Array.isArray(creators) ? creators : []), [creators]);

  // Normalize
  const allRows = useMemo(
    () =>
      allRowsRaw.map((r) => ({
        ...r,
        name: getName(r),
        gender: r.gender || r.user?.gender,
        nin: r.nin || r.user?.nin,
        createdAtReadable: r.createdAtReadable || fmtDate(r.created_at),
        updatedAtReadable: r.updatedAtReadable || fmtDate(r.updated_at),
      })),
    [allRowsRaw]
  );

  // Classification + counts
  const buckets = useMemo(() => {
    const map = { assets_creators: [], service_providers: [], artists: [] };
    for (const r of allRows) map[classifyType(r)].push(r);
    return map;
  }, [allRows]);

  const rows = useMemo(() => buckets[tab] || [], [buckets, tab]);

  // Toggle status handler (uses dedicated endpoint)
  const handleToggle = async (row) => {
    try {
      setTogglingId(row.id);
      await toggleCreatorStatus?.(row.id);

      if (viewRec?.id === row.id) {
        setViewRec((prev) => (prev ? { ...prev, active: !prev.active } : prev));
      }

      toast.add({ type: "success", title: "Status updated" });
      // Refresh AFTER operation
      fetchList({ page, per_page: perPage, q, status });
    } catch (e) {
      toast.add({
        type: "error",
        title: "Failed",
        message: e?.message || "Status change failed.",
      });
      console.error(e);
    } finally {
      setTogglingId(null);
    }
  };

  const total = pagination?.total ?? allRows.length ?? 0;
  const per = pagination?.per_page || perPage;
  const totalPages = Math.max(1, Math.ceil((pagination?.total || total) / per));
  const startIdx = total === 0 ? 0 : (page - 1) * per + 1;
  const endIdx = total === 0 ? 0 : Math.min(page * per, total);

  const footerLeftText =
    total === 0 ? (q ? `No results for “${q}”` : "No records") : `Showing ${startIdx}–${endIdx} of ${total} record${total > 1 ? "s" : ""}`;

  const footerRightControls = (
    <div className="flex items-center gap-2">
      <button
        disabled={page <= 1}
        onClick={() => setPage((p) => Math.max(1, p - 1))}
        className={`px-3 py-1.5 rounded-lg border ${
          page <= 1 ? "text-gray-400 border-gray-200" : "border-gray-300 hover:bg-gray-50"
        }`}
      >
        Prev
      </button>
      <span className="text-sm text-gray-600">
        Page {page} / {totalPages}
      </span>
      <button
        disabled={page >= totalPages}
        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
        className={`px-3 py-1.5 rounded-lg border ${
          page >= totalPages ? "text-gray-400 border-gray-200" : "border-gray-300 hover:bg-gray-50"
        }`}
      >
        Next
      </button>
    </div>
  );

  const filteredRows = useMemo(() => {
    let list = rows;
    if (status) list = list.filter((r) => getStatus(r) === status);
    if (q) {
      const qv = q.toLowerCase();
      list = list.filter((r) => {
        const hay = [
          getName(r),
          r.nin,
          r.id,
          r.user?.email,
          r.user?.phone_number,
          r.job_title,
          ...(Array.isArray(r.services) ? r.services.map((s) => s.service_name) : []),
        ]
          .filter(Boolean)
          .map(String)
          .map((s) => s.toLowerCase());
        return hay.some((s) => s.includes(qv));
      });
    }
    return list;
  }, [rows, status, q]);

  // EDIT submit: send creator-only payload
  const submitEdit = async (values) => {
    if (!editRec) return;
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

      await updateCreator?.(editRec.id, creatorPayload);

      toast.add({ type: "success", title: "Creator updated" });

      // Optimistic local merge
      setViewRec((prev) => (prev && prev.id === editRec.id ? { ...prev, ...creatorPayload } : prev));
      setEditRec((prev) => (prev ? { ...prev, ...creatorPayload } : prev));

      // Refresh list AFTER update completes (server truth)
      await fetchList({ page, per_page: perPage, q, status });
      setEditRec(null);
    } catch (e) {
      toast.add({
        type: "error",
        title: "Update failed",
        message: e?.message || "Could not update creator.",
      });
      console.error(e);
    } finally {
      setSavingEdit(false);
    }
  };

  return (
    <main>
      <ToastAlert toasts={toast.toasts} remove={toast.remove} />

      <div className="overflow-x-hidden flex bg-white border-t border-gray-300">
        <Sidebar />
        <div
          id="app-layout-content"
          className="relative min-h-screen w-full min-w-[100vw] md:min-w-0 ml-[15.625rem] [transition:margin_0.25s_ease-out]"
        >
          <Navbar />

          <div className="px-6 pb-20 pt-6">
            {/* Header */}
            <div className="flex items-center mb-4 justify-between -mx-6 border-b border-gray-300 pb-3">
              <p className="inline-block px-6 text-base md:text-lg leading-5 font-semibold">
                Creators
              </p>
              <div className="px-6" />
            </div>

            {/* Summary cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              {[
                {
                  label: "Total Creators",
                  value: (pagination?.total ?? allRows.length ?? 0).toLocaleString("en-NG"),
                },
                { label: "Assets Creators", value: buckets.assets_creators.length.toLocaleString("en-NG") },
                {
                  label: "Service Providers",
                  value: buckets.service_providers.length.toLocaleString("en-NG"),
                },
                { label: "Artists", value: buckets.artists.length.toLocaleString("en-NG") },
              ].map((c) => (
                <div key={c.label} className="rounded-xl border border-gray-200 bg-white shadow-sm p-4">
                  <div className="text-xs text-gray-600 mb-2">{c.label}</div>
                  <div className="text-2xl font-semibold">{c.value}</div>
                </div>
              ))}
            </div>

            {/* Tabs + Search */}
            <div className="mb-3 bg-white rounded-xl border border-gray-200 px-4 pt-2 pb-3 shadow-sm">
              <div className="flex items-center justify-between">
                <Tabs value={tab} onChange={setTab} />
                <div className="pl-4 py-2">
                  <div className="relative">
                    <input
                      value={q}
                      onChange={(e) => {
                        setPage(1);
                        setQ(e.target.value);
                      }}
                      onKeyDown={onSearchEnter}
                      className="h-10 pr-9 pl-3 rounded-lg border border-gray-300 outline-none focus:ring-2 focus:ring-[#4D3490] w-72 text-sm placeholder:text-xs leading-[1.25rem]"
                      placeholder="Search creators…"
                      aria-label="Search creators"
                    />
                    <FiSearch
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4 pointer-events-none"
                      aria-hidden="true"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Filters */}
            <div className="mb-4 flex items-center gap-3">
              <label className="text-sm text-gray-700">Status</label>
              <select
                value={status}
                onChange={(e) => {
                  setPage(1);
                  setStatus(e.target.value);
                }}
                className="h-10 pr-9 pl-3 rounded-lg border border-gray-300 outline-none focus:ring-2 focus:ring-[#4D3490] w-48 text-sm placeholder:text-xs leading-[1.25rem]"
                aria-label="Filter by status"
              >
                <option value="">All statuses</option>
                {["active", "inactive"].map((opt) => (
                  <option key={opt} value={opt}>
                    {opt[0].toUpperCase() + opt.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            {/* Table */}
            <CreatorsTable
              rows={filteredRows}
              q={q}
              loadingList={loadingList}
              onView={(rec) => setViewRec(rec)}
              onEdit={(rec) => setEditRec(rec)}
              onToggle={handleToggle}
              togglingId={togglingId}
              footerLeft={footerLeftText}
              footerRight={footerRightControls}
            />
          </div>

          {/* Details modal */}
          <Modal
            open={!!viewRec}
            title={viewRec ? `Creator: ${getName(viewRec) || `#${viewRec.id}`}` : ""}
            onClose={() => setViewRec(null)}
          >
            <CreatorDetails data={viewRec} onToggle={handleToggle} togglingId={togglingId} />
          </Modal>

          {/* Edit modal */}
          <EditCreatorModal
            open={!!editRec}
            data={editRec}
            saving={savingEdit}
            onClose={() => setEditRec(null)}
            onSubmit={submitEdit}
          />

          <Footer />
        </div>
      </div>
    </main>
  );
};

export default Creators;
