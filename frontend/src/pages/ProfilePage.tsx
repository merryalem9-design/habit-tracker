import { useAuthStore } from "../store/authStore";
import { useNavigate } from "react-router-dom";

export default function ProfilePage() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-brand-dark px-4 pt-6 pb-24">
      <h1 className="text-2xl font-bold text-white mb-6">Profile</h1>

      <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-full bg-brand-purple/30 flex items-center justify-center text-3xl">
            {user?.displayAlias?.[0] || "?"}
          </div>
          <div>
            <p className="text-white font-semibold text-lg">{user?.displayAlias || "User"}</p>
            <p className="text-gray-400 text-sm">{user?.email}</p>
          </div>
        </div>

        <div className="border-t border-white/10 pt-4 space-y-3">
          <button
            onClick={() => navigate("/dashboard")}
            className="w-full text-left text-gray-300 hover:text-white transition py-2"
          >
            🏠 Dashboard
          </button>
          <button
            onClick={() => navigate("/chat")}
            className="w-full text-left text-gray-300 hover:text-white transition py-2"
          >
            💬 Inbox
          </button>
          <button
            onClick={() => navigate("/distract")}
            className="w-full text-left text-gray-300 hover:text-white transition py-2"
          >
            🧘 Distract Me
          </button>
        </div>

        <button
          onClick={handleLogout}
          className="w-full mt-6 bg-red-500/20 text-red-400 py-3 rounded-xl font-semibold hover:bg-red-500/30 transition"
        >
          Log out
        </button>
      </div>
    </div>
  );
}