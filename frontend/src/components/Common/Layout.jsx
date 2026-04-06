import Footer from "./Footer";
import Navbar from "./Navbar";

const Layout = ({ children }) => {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar />
      <main className="container mx-auto px-4 py-8 max-w-7xl flex-grow">
        {children}
      </main>
      <Footer />
    </div>
  );
};

export default Layout;