export function highlightsTextInNode(
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
				range.setStart(startMapping.node, startIndex - startMapping.start);
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
