"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { FolderKanban, LayoutDashboard, Menu, X } from "lucide-react";
import { Logo } from "@/components/ui";

export function WorkspaceShell({ children }: { children: React.ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);

  function closeMenu() {
    setMenuOpen(false);
  }

  return (
    <div className="app-shell">
      <button
        aria-label="Close navigation"
        className={`scrim ${menuOpen ? "visible" : ""}`}
        onClick={closeMenu}
        tabIndex={menuOpen ? 0 : -1}
      />
      <aside className={`sidebar ${menuOpen ? "open" : ""}`} aria-label="Workspace navigation">
        <Logo />
        <div className="workspace-label">Workspace</div>
        <Suspense fallback={<WorkspaceLinks closeMenu={closeMenu} pathname="" />}>
          <WorkspaceNavigation closeMenu={closeMenu} />
        </Suspense>
        <div className="side-bottom">
          <div className="profile">
            <span className="avatar">TF</span>
            <span><strong>Demo workspace</strong><small>Frontend preview</small></span>
          </div>
        </div>
      </aside>
      <div className="main-column">
        <header className="app-topbar">
          <div className="topbar-inner">
            <div className="mobile-brand">
              <button className="mobile-menu-button" onClick={() => setMenuOpen(true)} aria-label="Open navigation">
                {menuOpen ? <X size={18} /> : <Menu size={18} />}
              </button>
              <Logo />
            </div>
            <div className="breadcrumb">
              <Suspense fallback={<><span>TrafficFlow</span><span aria-hidden="true">/</span><strong>Workspace</strong></>}>
                <WorkspaceBreadcrumb />
              </Suspense>
            </div>
            <span className="environment"><span /> DEVELOPMENT</span>
          </div>
        </header>
        <main className="main-content"><div className="content-container">{children}</div></main>
      </div>
    </div>
  );
}

function WorkspaceNavigation({ closeMenu }: { closeMenu: () => void }) {
  const pathname = usePathname();
  return <WorkspaceLinks closeMenu={closeMenu} pathname={pathname} />;
}

function WorkspaceLinks({ closeMenu, pathname }: { closeMenu: () => void; pathname: string }) {
  const dashboardActive = pathname === "/dashboard";
  const projectsActive = pathname.startsWith("/projects");
  return (
    <nav className="side-nav">
      <Link className={`side-link ${dashboardActive ? "active" : ""}`} href="/dashboard" onClick={closeMenu}>
        <LayoutDashboard size={16} /> Dashboard
      </Link>
      <Link className={`side-link ${projectsActive ? "active" : ""}`} href="/projects" onClick={closeMenu}>
        <FolderKanban size={16} /> Projects
      </Link>
    </nav>
  );
}

function WorkspaceBreadcrumb() {
  const pathname = usePathname();
  const title = pathname === "/dashboard" ? "Dashboard" : pathname.startsWith("/projects") ? "Projects" : "Workspace";
  return <><span>TrafficFlow</span><span aria-hidden="true">/</span><strong>{title}</strong></>;
}
