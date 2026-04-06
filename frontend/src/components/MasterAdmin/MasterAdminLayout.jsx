import { useNavigate } from "react-router-dom";
import MasterAdminNavbar from "./MasterAdminNavbar";
import { useEffect } from "react";
import Footer from "../Common/Footer";
import { useSelector } from "react-redux";
import { logoutUser } from "../../store/slices/voterSessionSlice";

const MasterAdminLayout = ({ children }) => {
  const navigate = useNavigate();
  const user = useSelector((state) => state.auth.user); // get user from redux

  useEffect(() => {
    if (user.role !== "super_admin") {
      // If no user or role is not admin, redirect to login
      logoutUser();
      navigate("/", { replace: true });
    }
  }, [user, navigate]);

  if (user.role !== "super_admin") {
    return null; // show nothing while redirecting
  }
  
  return (
    <div className="min-h-screen bg-gray-50">
      <MasterAdminNavbar />
      <main className="container mx-auto px-4 py-8 max-w-7xl">{children}</main>
      <Footer />
    </div>
  );
};

export default MasterAdminLayout;
