import React, { useEffect, useState } from "react";
import Sidebar from "../../components/layout/Sidebar";
import Navbar from "../../components/layout/Navbar";
import Footer from "../../components/layout/Footer";
import { ToastAlert, useToastAlert } from "../../components/common/ToastAlert";
import useAuthGuard from "../../lib/useAuthGuard";
import { useNavigate } from "react-router-dom";
import useProfileStore from "../../store/profileStore";
import { Spinner } from "../../components/common/Spinner";

const BRAND = "#4D3490";
const inputBase =
  "w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-[#4D3490] text-sm placeholder:text-xs placeholder:font-light placeholder:text-gray-400";

const Profile = () => {
  const navigate = useNavigate();
  useAuthGuard(navigate);
  const toast = useToastAlert();

  const { me, loading, fetchMe, updateMe } = useProfileStore();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [avatar, setAvatar] = useState("");

  useEffect(() => { fetchMe(); }, [fetchMe]);
  useEffect(() => {
    setFirstName(me?.first_name || "");
    setLastName(me?.last_name || "");
    setAvatar(me?.profile_image || "");
  }, [me]);

  const onSave = async () => {
    try {
      await updateMe({ first_name: firstName, last_name: lastName, profile_image: avatar });
      toast.add({ type: "success", title: "Profile updated" });
    } catch (e) {
      toast.add({ type: "error", title: "Failed", message: e?.message || "Update failed." });
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
            <div className="flex items-center mb-4 justify-between -mx-6 border-b border-gray-300 pb-3">
              <p className="inline-block px-6 text-base md:text-lg leading-5 font-semibold">
                Profile
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left: card with avatar + basic meta */}
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <div className="flex flex-col items-center">
                  <div className="w-24 h-24 rounded-full bg-gray-200 overflow-hidden">
                    {avatar ? (
                      <img src={avatar} alt="avatar" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-500">
                        No Image
                      </div>
                    )}
                  </div>
                  <div className="mt-3 text-center">
                    <div className="text-lg font-semibold">
                      {(me?.first_name || "") + " " + (me?.last_name || "")}
                    </div>
                    <div className="text-sm text-gray-600">{me?.email || "—"}</div>
                  </div>
                </div>
              </div>

              {/* Right: editable form */}
              <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">First name</label>
                    <input
                      className={inputBase}
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="First name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Last name</label>
                    <input
                      className={inputBase}
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="Last name"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium mb-1">Avatar URL</label>
                    <input
                      className={inputBase}
                      value={avatar}
                      onChange={(e) => setAvatar(e.target.value)}
                      placeholder="https://…"
                    />
                  </div>
                </div>

                <div className="mt-4 flex justify-end">
                  <button
                    onClick={onSave}
                    disabled={loading}
                    className="px-4 h-10 rounded-lg text-white inline-flex items-center gap-2"
                    style={{ backgroundColor: BRAND }}
                  >
                    {loading && <Spinner />}
                    Save changes
                  </button>
                </div>
              </div>
            </div>
          </div>
          <Footer />
        </div>
      </div>
    </main>
  );
};

export default Profile;
