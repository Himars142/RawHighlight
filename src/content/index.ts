import type { HighlightData } from "../types";
import { highlightsTextInNode } from "./dom-utils";
import {
	getToolbarElement,
	removeToolbar,
	renderColorToolbar,
} from "./toolbar";

let currentSelectionRange: Range | null = null;

function exportToFile(data: HighlightData): void {
	console.log("Writing to Inbox file...:", data);
}

export function checkAutoExportSettings(data: HighlightData): void {
	chrome.storage.sync.get(
		{ autoSaveToInbox: false },
		(settings: { autoSaveToInbox: boolean }) => {
			if (settings.autoSaveToInbox) {
				exportToFile(data);
			}
		},
	);
}

function saveHighlightToStorage(data: HighlightData): void {
	chrome.storage.local.get({ highlights: {} }, (result) => {
		const highlights = result.highlights || {};
		const urlKey = encodeURIComponent(data.url);

		if (!highlights[urlKey]) {
			highlights[urlKey] = [];
		}
		highlights[urlKey].push(data);

		chrome.storage.local.set({ highlights }, () => {
			checkAutoExportSettings(data);
		});
	});
}

function applyHighlight(color: string): void {
	if (!currentSelectionRange) return;

	const span = document.createElement("span");
	span.style.backgroundColor = color;
	span.style.color = "inherit";
	span.className = "plainmark-highlight-item";

	try {
		span.appendChild(currentSelectionRange.extractContents());
		currentSelectionRange.insertNode(span);

		const highlightedText = span.textContent || "";
		const pageUrl = window.location.href;

		saveHighlightToStorage({
			text: highlightedText,
			color: color,
			url: pageUrl,
			title: document.title,
			timestamp: Date.now(),
		});
	} catch (e) {
		console.error("Failed to apply highlight:", e);
	}
}

function restoreHighlights(): void {
	const pageUrl = window.location.href;

	chrome.storage.local.get({ highlights: {} }, (result) => {
		const highlights = result.highlights || {};
		const pageHighlights: HighlightData[] =
			highlights[encodeURIComponent(pageUrl)] || [];

		if (pageHighlights.length === 0) return;

		pageHighlights.forEach((item) => {
			highlightsTextInNode(document.body, item.text, item.color);
		});
	});
}

document.addEventListener("mouseup", (event) => {
	setTimeout(() => {
		const selection = window.getSelection();

		if (
			!selection ||
			selection.isCollapsed ||
			selection.toString().trim().length === 0
		) {
			const toolbar = getToolbarElement();
			if (toolbar && !toolbar.contains(event.target as Node)) {
				removeToolbar();
			}
			return;
		}

		const range = selection.getRangeAt(0);
		currentSelectionRange = range.cloneRange();
		const rect = range.getBoundingClientRect();

		renderColorToolbar(rect, (color) => {
			applyHighlight(color);
		});
	}, 10);
});

if (document.readyState === "loading") {
	document.addEventListener("DOMContentLoaded", restoreHighlights);
} else {
	restoreHighlights();
}
