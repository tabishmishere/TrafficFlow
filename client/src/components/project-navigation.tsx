"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, HeartPulse, Settings2, SquareActivity } from "lucide-react";

const tabs = [
  { label: "Overview", suffix: "", Icon: SquareActivity },
  { label: "Traffic", suffix: "/traffic", Icon: Activity },
  { label: "Health", suffix: "/health", Icon: HeartPulse },
  { label: "Settings", suffix: "/settings", Icon: Settings2 },
];

export function ProjectNavigation({ projectId }: { projectId: string }) {
  const pathname = usePathname();
  const base = `/projects/${projectId}`;
  return (
    <nav className="project-tabs" aria-label="Project navigation">
      {tabs.map(({ label, suffix, Icon }) => {
        const href = `${base}${suffix}`;
        const active = suffix === ""
          ? pathname === base
          : pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link className={`project-tab ${active ? "active" : ""}`} href={href} key={label}>
            <Icon size={13} /> {label}
          </Link>
        );
      })}
    </nav>
  );
}
