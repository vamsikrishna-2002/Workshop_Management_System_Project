import { NavLink } from "@remix-run/react";
import type { LucideIcon } from "lucide-react";

interface NavItem {
	icon: LucideIcon;
	label: string;
	to: string;
}

interface SidebarNavLinkProps {
	items: NavItem[];
}

export function SidebarNavLink({ items }: SidebarNavLinkProps) {
	return (
		<>
			{items.map((item) => (
				<NavLink
					className={({ isActive }) => {
						const baseClasses =
							"group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all";
						const textColor = isActive
							? "text-emerald-400"
							: "text-gray-400 hover:text-gray-300";

						return `${baseClasses} ${textColor}`;
					}}
					key={item.to}
					to={item.to}
				>
					{({ isActive }) => (
						<>
							<div className="relative">
								<div
									className={`absolute -inset-1 rounded-lg bg-gradient-to-r from-emerald-600 to-cyan-600 opacity-0 blur transition-opacity ${
										isActive ? "opacity-75" : "group-hover:opacity-50"
									}`}
								/>
								<div
									className={`relative rounded-lg ${
										isActive ? "bg-black" : "group-hover:bg-black/50"
									} p-1`}
								>
									<item.icon className="size-5" strokeWidth={2} />
								</div>
							</div>
							{item.label}
						</>
					)}
				</NavLink>
			))}
		</>
	);
}
