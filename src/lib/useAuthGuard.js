import { useEffect } from "react";

/** Redirects to "/" if authToken is missing */
const useAuthGuard = (navigate) => {
  useEffect(() => {
    const token = localStorage.getItem("authToken");
    if (!token) navigate("/");
  }, [navigate]);
};

export default useAuthGuard;
