"use client";

import { useUser } from "@auth0/nextjs-auth0/client";

export function LogoutButton() {
  const { user } = useUser();

  return (
    <div className="flex items-center gap-3">
      {user?.email && (
        <span className="text-sm text-slate-500">{user.email}</span>
      )}
      <a
        href="/auth/logout"
        className="px-3 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors"
      >
        Logout
      </a>
    </div>
  );
}
