import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import VoterNavbar from "./VoterNavbar"
import Footer from "../Common/Footer";
import { useSelector } from "react-redux";
import { logoutUser } from "../../store/slices/authSlice";

const Layout = ({ children }) => {
  const navigate = useNavigate();
  const user = useSelector((state) => state.votes.voter);
  console.log(user);

  useEffect(() => {
    if (user?.role !== "voter") {
      logoutUser();
      navigate("/", { replace: true });
    }
  }, [user, navigate]);

  if (!user?.role) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <VoterNavbar />
      <main className="container mx-auto px-4 max-w-7xl flex-grow">
        {children}
      </main>
      <Footer />
    </div>
  );
};

export default Layout;