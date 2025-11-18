import { supabase } from "../lib/supabaseClient";
import { useNavigate } from "react-router-dom";
import { LogOut, LogIn, LogOutIcon, Users } from "lucide-react";
import logo from "../Images/logo.png";

const Dashboard = () => {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.reload();
  };

  return (
    <div className="min-h-screen relative flex flex-col bg-gradient-to-br from-green-300 via-green-400 to-yellow-300 text-green-900 overflow-hidden font-[Poppins]">
      {/* Decorative Background Blurs */}
      <div className="absolute w-96 h-96 bg-green-400 rounded-full blur-3xl opacity-40 -top-20 -left-20" />
      <div className="absolute w-96 h-96 bg-yellow-400 rounded-full blur-3xl opacity-40 bottom-0 right-0" />

      {/* Header */}
      <header className="backdrop-blur-md bg-white/70 border-b border-yellow-300 shadow-lg flex justify-between items-center px-6 py-4 relative z-10">
        <img src={logo}  alt="Hotel Logo"  className="w-10 h-10 sm:w-12 sm:h-12 md:w-80 md:h-20 object-contain" />
		<h1 className="text-3xl font-extrabold tracking-wide flex items-center gap-2 text-green-900">
          <span>Hotel Plaza</span>
        </h1>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/view-all")}
            className="flex items-center gap-2 bg-green-500 hover:bg-green-600 px-4 py-2 rounded-lg shadow-md font-semibold text-white transition"
          >
            <Users className="w-5 h-5" /> View Guests
          </button>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 bg-red-500 hover:bg-red-600 px-4 py-2 rounded-lg shadow-md font-semibold text-white transition"
          >
            <LogOut className="w-5 h-5" /> Logout
          </button>
        </div>
      </header>

      {/* Faint Background Logo */}
      <div className="absolute inset-0 flex justify-center items-center opacity-10 pointer-events-none">
        <img
          src="/logo.png"
          alt="Hotel Logo"
          className="max-w-[70%] max-h-[70%] object-contain"
        />
      </div>

      {/* Main Content */}
      <main className="flex-1 flex justify-center items-center px-6 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 w-full max-w-5xl">
          {/* Check-In Card */}
          <div className="bg-white/70 backdrop-blur-lg border border-yellow-300 rounded-2xl shadow-lg p-8 flex flex-col items-center text-center hover:scale-105 hover:shadow-2xl transition-all duration-300">
            <div className="w-20 h-20 flex items-center justify-center rounded-full bg-green-200 border border-green-400 mb-6">
              <LogIn className="w-10 h-10 text-green-700" />
            </div>
            <h2 className="text-2xl font-bold mb-3 text-green-900">Check-In</h2>
            <p className="text-green-800 mb-6">
              Register new guests and assign rooms
            </p>
            <button
              onClick={() => navigate("/checkin")}
              className="w-full bg-green-500 hover:bg-green-600 text-white py-3 rounded-lg font-semibold transition shadow-lg"
            >
              Start Check-In Process
            </button>
          </div>

          {/* Check-Out Card */}
          <div className="bg-white/70 backdrop-blur-lg border border-yellow-300 rounded-2xl shadow-lg p-8 flex flex-col items-center text-center hover:scale-105 hover:shadow-2xl transition-all duration-300">
            <div className="w-20 h-20 flex items-center justify-center rounded-full bg-yellow-200 border border-yellow-400 mb-6">
              <LogOutIcon className="w-10 h-10 text-yellow-600" />
            </div>
            <h2 className="text-2xl font-bold mb-3 text-green-900">Check-Out</h2>
            <p className="text-green-800 mb-6">
              Process guest departures and generate bills
            </p>
            <button
              onClick={() => navigate("/checkout")}
              className="w-full bg-yellow-400 hover:bg-yellow-500 text-gray-900 py-3 rounded-lg font-semibold transition shadow-lg"
            >
              Start Check-Out Process
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
