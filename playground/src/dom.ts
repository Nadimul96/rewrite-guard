type Child = Node | string | null | undefined | false;

/** Create an element with attributes and children. Text is always set as text, never HTML. */
export function h<K extends keyof HTMLElementTagNameMap>(
	tag: K,
	attributes: Record<string, string | undefined> = {},
	...children: Child[]
): HTMLElementTagNameMap[K] {
	const element = document.createElement(tag);
	for (const [name, value] of Object.entries(attributes)) {
		if (value !== undefined) element.setAttribute(name, value);
	}
	for (const child of children) {
		if (child === null || child === undefined || child === false) continue;
		element.append(child);
	}
	return element;
}

export function byId<T extends HTMLElement>(id: string): T {
	const element = document.getElementById(id);
	if (!element) throw new Error(`Missing #${id}`);
	return element as T;
}

export function percent(value: number, digits = 1): string {
	return `${(Math.floor(value * 10 ** (digits + 2) + 1e-9) / 10 ** digits).toFixed(digits)}%`;
}

const SVG = "http://www.w3.org/2000/svg";

/** A small inline icon drawn with strokes. */
export function icon(name: "check" | "cross" | "alert" | "info"): SVGSVGElement {
	const paths: Record<typeof name, string> = {
		check: "M5 12.5l4.5 4.5L19 7.5",
		cross: "M6 6l12 12M18 6L6 18",
		alert:
			"M12 8v5M12 16.5v.5M10.3 3.9 2.6 17a2 2 0 0 0 1.7 3h15.4a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z",
		info: "M12 11v6M12 7.5v.5M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z",
	};
	const svg = document.createElementNS(SVG, "svg");
	svg.setAttribute("viewBox", "0 0 24 24");
	svg.setAttribute("aria-hidden", "true");
	svg.setAttribute("class", `icon icon--${name}`);
	const path = document.createElementNS(SVG, "path");
	path.setAttribute("d", paths[name]);
	svg.append(path);
	return svg;
}
