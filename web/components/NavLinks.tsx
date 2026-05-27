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
            className={`text-sm px-3 py-1.5 transition-colors border-b-2 ${
              active
                ? "text-indigo-600 font-medium border-indigo-600"
                : "text-gray-600 hover:text-gray-900 border-transparent"
            }`}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
