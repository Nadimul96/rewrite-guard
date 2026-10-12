type Theme = "light" | "dark";

/** Follow the system theme until the visitor picks one, then remember it. */
export function initTheme(toggle: HTMLElement) {
	const root = document.documentElement;
	const system = window.matchMedia("(prefers-color-scheme: dark)");
	const current = (): Theme =>
		root.dataset.theme === "light" || root.dataset.theme === "dark"
			? root.dataset.theme
			: system.matches
				? "dark"
				: "light";

	const label = () =>
		toggle.setAttribute("aria-label", `Switch to ${current() === "dark" ? "light" : "dark"} mode`);
	toggle.addEventListener("click", () => {
		const next: Theme = current() === "dark" ? "light" : "dark";
		root.dataset.theme = next;
		try {
			localStorage.setItem("rf-theme", next);
		} catch {
			// Storage can be unavailable (private mode); the choice still applies to this visit.
		}
		label();
	});
	system.addEventListener("change", label);
	label();
}
