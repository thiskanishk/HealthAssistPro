
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

const useLoginRedirect = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) return;

    switch (user.role) {
      case "Doctor":
        navigate("/dashboard/doctor");
        break;
      case "Nurse":
        navigate("/dashboard/nurse");
        break;
      case "Admin":
        navigate("/dashboard/admin");
        break;
      default:
        navigate("/unauthorized");
        break;
    }
  }, [user, navigate]);
};

export default useLoginRedirect;
