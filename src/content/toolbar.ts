let colorToolbar: HTMLElement | null = null;

export function removeToolbar(): void {
	if (colorToolbar) {
		colorToolbar.remove();
		colorToolbar = null;
	}
}

export function renderColorToolbar(
	rect: DOMRect,
	onColorSelect: (color: string) => void,
): void {
	removeToolbar();

	colorToolbar = document.createElement("div");
	colorToolbar.id = "plainmark-palette";

	Object.assign(colorToolbar.style, {
		position: "absolute",
		zIndex: "2147483647",
		left: `${window.scrollX + rect.left + rect.width / 2}px`,
		top: `${window.scrollY + rect.top - 40}px`,
		transform: "translateX(-50%)",
		background: "#18181b",
		border: "1px solid #27272a",
		borderRadius: "8px",
		padding: "6px",
		display: "flex",
		gap: "6px",
		boxShadow: "0 8px 24px rgba(0, 0, 0, 0.3)",
	});

	const colors = [
		{ name: "yellow", bg: "#fef08a", text: "#713f12" },
		{ name: "green", bg: "#bbf7d0", text: "#14532d" },
		{ name: "blue", bg: "#bfdbfe", text: "#1e3a8a" },
		{ name: "pink", bg: "#fbcfe8", text: "#831843" },
	];

	colors.forEach((c) => {
		const btn = document.createElement("button");
		Object.assign(btn.style, {
			width: "20px",
			height: "20px",
			borderRadius: "50%",
			background: c.bg,
			border: "2px solid #ffffff",
			cursor: "pointer",
		});

		btn.addEventListener("click", () => {
			onColorSelect(c.bg);
			removeToolbar();
		});

		colorToolbar?.appendChild(btn);
	});

	document.body.appendChild(colorToolbar);
}

export function getToolbarElement(): HTMLElement | null {
	return colorToolbar;
}
