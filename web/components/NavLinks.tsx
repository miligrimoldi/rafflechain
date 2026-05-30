"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function NavLinks() {
  const pathname = usePathname();

  const links = [
    { href: "/", label: "Explorar" },
    { href: "/my-raffles", label: "Mis rifas" },
  ];

  return (
    <nav className="flex items-center gap-1">
      {links.map(({ href, label }) => {
        const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={active ? "nav-pill nav-pill-active" : "nav-pill"}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
