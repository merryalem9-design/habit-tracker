import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { useChatStore } from "../store/chatStore";

const tabs = [
  { path: "/dashboard", label: "Home", icon: "🏠" },
  { path: "/chat", label: "Inbox", icon: "💬" },
  { path: "/distract", label: "Distract", icon: "🧘" },
  { path: "/profile", label: "Profile", icon: "👤" },
];

export default function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const conversations = useChatStore((s) => s.conversations);
  const totalUnread = conversations.reduce((sum, c) => sum + (c.unreadCount || 0), 0);

  if (location.pathname.startsWith("/groups/")) {
    return <Outlet />;
  }

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="min-h-screen bg-brand-dark flex flex-col">
      <div className="flex-1">
        <Outlet />
      </div>
      <div className="fixed bottom-0 left-0 right-0 bg-brand-card border-t border-white/10 backdrop-blur-md px-4 py-2 flex justify-around items-center z-50">
        {tabs.map((tab) => (
          <button
            key={tab.path}
            onClick={() => navigate(tab.path)}
            className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl transition relative ${
              isActive(tab.path) ? "text-brand-purple" : "text-gray-400 hover:text-white"
            }`}
          >
            <span className="text-xl">{tab.icon}</span>
            <span className="text-[10px] font-medium">{tab.label}</span>
            {tab.path === "/chat" && totalUnread > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">
                {totalUnread > 99 ? "99+" : totalUnread}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}