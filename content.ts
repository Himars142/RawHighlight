interface HighlightData {
    text: string;
    color: string;
    url: string;
    title: string;
    timestamp: number;
}

interface ExtensionSettings {
    autoSaveToInbox: boolean;
}

let colorToolbar: HTMLElement | null = null;
let currentSelectionRange: Range | null = null;

function removeToolbar(): void {
    if (colorToolbar) {
        colorToolbar.remove();
        colorToolbar = null;
    }
}

function exportToFile(data: HighlightData): void {
    console.log("Writing to Inbox file...:", data);
}

function checkAutoExportSettings(data: HighlightData): void {
    chrome.storage.sync.get(
        { autoSaveToInbox: false },
        (settings: ExtensionSettings) => {
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

// Потужна функція відновлення, яка працює навіть якщо текст розбитий між різними тегами
function highlightsTextInNode(
    root: Node,
    textToFind: string,
    color: string,
): void {
    const target = textToFind.trim();
    if (!target) return;

    const walker = document.createTreeWalker(
        root,
        NodeFilter.SHOW_TEXT,
        (node) => {
            const parent = node.parentElement;
            if (
                parent &&
                (parent.tagName === "SCRIPT" ||
                    parent.tagName === "STYLE" ||
                    parent.classList.contains("plainmark-highlight-item"))
            ) {
                return NodeFilter.FILTER_REJECT;
            }
            return NodeFilter.FILTER_ACCEPT;
        },
    );

    const textNodes: Text[] = [];
    let node: Node | null = walker.nextNode();
    while (node) {
        textNodes.push(node as Text);
        node = walker.nextNode();
    }

    let concatenatedText = "";
    const nodeMap: { node: Text; start: number; end: number }[] = [];

    for (const tn of textNodes) {
        const val = tn.nodeValue || "";
        const start = concatenatedText.length;
        concatenatedText += val;
        const end = concatenatedText.length;
        nodeMap.push({ node: tn, start, end });
    }

    let index = concatenatedText.indexOf(target);
    while (index !== -1) {
        const startIndex = index;
        const endIndex = index + target.length;

        const startMapping = nodeMap.find(
            (m) => startIndex >= m.start && startIndex < m.end,
        );
        const endMapping = nodeMap.find(
            (m) => endIndex > m.start && endIndex <= m.end,
        );

        if (startMapping && endMapping) {
            try {
                const range = document.createRange();
                range.setStart(
                    startMapping.node,
                    startIndex - startMapping.start,
                );
                range.setEnd(endMapping.node, endIndex - endMapping.start);

                const span = document.createElement("span");
                span.style.backgroundColor = color;
                span.style.color = "inherit";
                span.className = "plainmark-highlight-item";

                span.appendChild(range.extractContents());
                range.insertNode(span);
            } catch (e) {
                console.error("Failed to restore highlight range:", e);
            }
        }

        index = concatenatedText.indexOf(target, endIndex);
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

function renderColorToolbar(rect: DOMRect): void {
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
            applyHighlight(c.bg);
            removeToolbar();
        });

        colorToolbar?.appendChild(btn);
    });

    document.body.appendChild(colorToolbar);
}

document.addEventListener("mouseup", (event) => {
    setTimeout(() => {
        const selection = window.getSelection();

        if (
            !selection ||
            selection.isCollapsed ||
            selection.toString().trim().length === 0
        ) {
            if (colorToolbar && !colorToolbar.contains(event.target as Node)) {
                removeToolbar();
            }
            return;
        }

        const range = selection.getRangeAt(0);
        currentSelectionRange = range.cloneRange();
        const rect = range.getBoundingClientRect();

        renderColorToolbar(rect);
    }, 10);
});

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", restoreHighlights);
} else {
    restoreHighlights();
}
