"use client";

export function LogoutButton() {
  return (
    <a
      href="/auth/logout"
      className="px-3 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors"
    >
      Logout
    </a>
  );
}
