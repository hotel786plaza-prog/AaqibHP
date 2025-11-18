import { useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useNavigate } from "react-router-dom";
import LoadingSpinner from "../components/LoadingSpinner"; 

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      await supabase.from("system_logs").insert([
        {
          action: "LOGIN_FAILED",
          details: `Failed login attempt for ${email} - ${error.message}`,
        },
      ]);
      setError(error.message);
      setLoading(false);
      return;
    }

    await supabase.from("system_logs").insert([
      {
        action: "LOGIN",
        details: `User ${email} logged in`,
        user_id: data.user?.id,
      },
    ]);

    const { data: profile, error: roleError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", data.user?.id)
      .single();

    setLoading(false);

    if (roleError) {
      console.error("Error fetching role:", roleError.message);
      navigate("/");
      return;
    }

    const role = profile?.role;
    if (role === "owner") navigate("/admin");
    else if (role === "billing_desk") navigate("/billing");
    else navigate("/");
  };

  return (
    <div className="h-screen flex items-center justify-center bg-gradient-to-br from-green-300 via-green-400 to-yellow-300 relative overflow-hidden font-[Poppins]">
      {/* Decorative Blurs */}
      <div className="absolute w-96 h-96 bg-green-400 rounded-full blur-3xl opacity-40 -top-20 -left-20" />
      <div className="absolute w-96 h-96 bg-yellow-400 rounded-full blur-3xl opacity-40 bottom-0 right-0" />

      <form
        onSubmit={handleLogin}
        className="relative z-10 w-96 bg-white/70 backdrop-blur-md p-8 rounded-2xl shadow-lg border border-yellow-300"
      >
        <h2 className="text-3xl font-extrabold text-green-900 text-center mb-6 tracking-wide">
          Hotel Management
        </h2>
        <p className="text-green-800 text-center mb-8">Sign in to continue</p>

        {error && (
          <p className="text-red-600 bg-red-100 border border-red-400 text-sm p-2 rounded-lg mb-4 text-center">
            {error}
          </p>
        )}

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full px-4 py-3 mb-4 rounded-lg bg-white text-green-900 placeholder-green-600 focus:outline-none focus:ring-4 focus:ring-yellow-400"
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full px-4 py-3 mb-6 rounded-lg bg-white text-green-900 placeholder-green-600 focus:outline-none focus:ring-4 focus:ring-yellow-400"
        />

        {loading ? (
		  <LoadingSpinner />
		) : (
		  <>
			{error && (
			  <p className="text-red-600 bg-red-100 border border-red-400 text-sm p-2 rounded-lg mb-4 text-center">
				{error}
			  </p>
			)}
			<button
			  type="submit"
			  disabled={loading}
			  className="w-full py-3 rounded-lg bg-gradient-to-r from-yellow-400 to-yellow-500 hover:from-yellow-500 hover:to-yellow-600 shadow-lg text-white font-semibold transition-all"
			>
			  Login
			</button>
		  </>
		)}
      </form>
    </div>
  );
}
