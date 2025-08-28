import React from "react";
import Modal from "./Modal";

const BRAND_RGB = "rgb(77, 52, 144)";

const Spinner = () => (
  <span
    className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent align-[-0.125em] text-white"
    role="status"
    aria-label="loading"
  />
);

/** Reusable confirmation dialog with busy spinner on Delete button */
const ConfirmDialog = ({
  open,
  title = "Delete record",
  message,
  confirmText = "Delete",
  cancelText = "Cancel",
  onConfirm,
  onCancel,
  busy = false,
}) => (
  <Modal
    open={open}
    title={title}
    onClose={busy ? () => {} : onCancel}
    size="sm"
    lock={busy}
    footer={
      <div className="flex items-center justify-end gap-2">
        <button
          onClick={onCancel}
          className="px-4 py-2 rounded-lg border border-gray-300"
          disabled={busy}
        >
          {cancelText}
        </button>
        <button
          onClick={onConfirm}
          className="px-4 py-2 rounded-lg text-white inline-flex items-center gap-2"
          style={{ backgroundColor: BRAND_RGB }}
          disabled={busy}
        >
          {busy && <Spinner />}
          {confirmText}
        </button>
      </div>
    }
  >
    <p className="text-sm text-gray-700">{message}</p>
  </Modal>
);

export default ConfirmDialog;
