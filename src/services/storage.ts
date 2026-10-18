import type { ExtenstionSettings, HighlightData } from "../types";

export function getSettings(
	callback: (settings: ExstentionSettings) => void,
): void {
	chrome.storage.sync.get({ auroSaveToInbox: false }, (settings) => {
		callback(settings as ExtenstionSettings);
	});
}

export function saveHighlightToStorage(data: HighlightData): void {
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
