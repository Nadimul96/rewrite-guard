/**
 * `pnpm screenshots`: build the playground, serve it, and capture it in light
 * and dark at desktop and phone sizes into docs/media/*.webp.
 *
 * Uses playwright-core with an existing Chromium; set CHROMIUM_PATH to point
 * at one. Nothing is downloaded.
 */
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium, type Page } from "playwright-core";
import { build, preview } from "vite";

const CONFIG = fileURLToPath(new URL("../playground/vite.config.ts", import.meta.url));
const OUT = fileURLToPath(new URL("../docs/media/", import.meta.url));
const DEFAULT_CHROMIUM = join(
	homedir(),
	"Library/Caches/ms-playwright/chromium_headless_shell-1243/chrome-headless-shell-mac-arm64/chrome-headless-shell",
);

const SHOTS = [
	{ name: "playground-light", width: 1440, height: 900, scheme: "light", example: "insert_place" },
	{ name: "playground-dark", width: 1440, height: 900, scheme: "dark", example: "swap_beats" },
	{ name: "playground-mobile-light", width: 390, height: 844, scheme: "light", example: "drop_negation" },
	{ name: "playground-mobile-dark", width: 390, height: 844, scheme: "dark", example: "move_adverbial" },
	{
		name: "playground-full",
		width: 1440,
		height: 900,
		scheme: "light",
		example: "replace_number",
		fullPage: true,
	},
] as const;

async function main() {
	const executablePath = process.env.CHROMIUM_PATH ?? DEFAULT_CHROMIUM;
	if (!existsSync(executablePath)) {
		throw new Error(
			`No Chromium at ${executablePath}. Set CHROMIUM_PATH to a Chromium or headless-shell binary.`,
		);
	}
	await build({ configFile: CONFIG, logLevel: "warn" });
	const server = await preview({ configFile: CONFIG, preview: { port: 4317, strictPort: true } });
	const url = server.resolvedUrls?.local[0] ?? "http://localhost:4317/";
	const browser = await chromium.launch({ executablePath });
	mkdirSync(OUT, { recursive: true });
	try {
		for (const shot of SHOTS) {
			const page = await browser.newPage({
				viewport: { width: shot.width, height: shot.height },
				deviceScaleFactor: 2,
				colorScheme: shot.scheme,
			});
			await page.goto(`${url}#example=${shot.example}`);
			await page.evaluate(() => document.fonts.ready);
			if (shot.width < 640) {
				// On a phone the verdict is the interesting part; start the shot there.
				await page.evaluate(() => {
					const top = document.querySelector(".results")?.getBoundingClientRect().top ?? 0;
					window.scrollTo({ top: window.scrollY + top - 72, behavior: "instant" });
				});
			}
			await page.waitForTimeout(300);
			const png = await page.screenshot({ fullPage: "fullPage" in shot && shot.fullPage });
			const webp = await toWebp(page, png);
			writeFileSync(join(OUT, `${shot.name}.webp`), webp);
			console.log(`${shot.name}.webp  ${(webp.length / 1024).toFixed(0)} KB`);
			await page.close();
		}
	} finally {
		await browser.close();
		await new Promise<void>((resolve) => server.httpServer.close(() => resolve()));
	}
}

/** Re-encode the PNG as WebP inside the browser, so no image library is needed. */
async function toWebp(page: Page, png: Buffer): Promise<Buffer> {
	const dataUrl = await page.evaluate(async (base64) => {
		const image = new Image();
		image.src = `data:image/png;base64,${base64}`;
		await image.decode();
		const canvas = document.createElement("canvas");
		canvas.width = image.naturalWidth;
		canvas.height = image.naturalHeight;
		canvas.getContext("2d")?.drawImage(image, 0, 0);
		return canvas.toDataURL("image/webp", 0.86);
	}, png.toString("base64"));
	return Buffer.from(dataUrl.split(",")[1] ?? "", "base64");
}

await main();
