import type { Chapter, ChapterNavigation } from '../types/novel'

// Declare window for TypeScript
declare const window: Window & typeof globalThis

function generateChapterHtml(
	chapterData: any,
	navigation: ChapterNavigation,
	allChapters: Chapter[],
	novelId: string
): string {
	const { novel_title, title, body, volume, chapter } = chapterData

	return `
		<!DOCTYPE html>
		<html>
			<head>
				<title>${novel_title} - ${title}</title>
				<meta name="viewport" content="width=device-width, initial-scale=1">
				<link rel="stylesheet" href="/styles.css">
				<script>
					// Initialize state
					let isCompareMode = false;
					let isAIEnabled = false;

					// Function to update button states
					function updateButtonStates() {
						const compareButton = document.getElementById('compareButton');
						const aiButton = document.getElementById('aiButton');
						
						if (compareButton) {
							compareButton.classList.toggle('active', isCompareMode);
							compareButton.textContent = isCompareMode ? 'Hide Compare' : 'Compare';
						}
						
						if (aiButton) {
							aiButton.classList.toggle('active', isAIEnabled);
							aiButton.textContent = isAIEnabled ? 'AI On' : 'AI Off';
						}
					}

					// Function to toggle AI
					async function toggleAI() {
						try {
							// Get current state
							const response = await fetch('/api/novel/settings/ai-rewrite');
							const data = await response.json();
							
							// Toggle the state
							const newState = !data.enabled;
							
							// Update the server
							const updateResponse = await fetch('/api/novel/settings/ai-rewrite', {
								method: 'POST',
								headers: {
									'Content-Type': 'application/json',
								},
								body: JSON.stringify({
									enabled: newState,
									prompt: data.prompt
								})
							});
							
							const result = await updateResponse.json();
							console.log('AI toggled:', result);
							
							// Update UI and reload
							isAIEnabled = result.enabled;
							updateButtonStates();
							location.reload();
						} catch (error) {
							console.error('Error:', error);
						}
					}

					// Function to toggle compare mode
					function toggleCompare() {
						const urlParams = new URLSearchParams(window.location.search);
						isCompareMode = urlParams.get('compare') !== 'true';
						urlParams.set('compare', isCompareMode.toString());
						window.location.search = urlParams.toString();
					}

					// Initialize on page load
					window.onload = async function() {
						// Get URL parameters
						const urlParams = new URLSearchParams(window.location.search);
						isCompareMode = urlParams.get('compare') === 'true';
						
						// Get AI state
						try {
							const response = await fetch('/api/novel/settings/ai-rewrite');
							const data = await response.json();
							isAIEnabled = data.enabled;
						} catch (error) {
							console.error('Error getting AI state:', error);
						}
						
						// Update UI
						updateButtonStates();
					}
				</script>
			</head>
			<body>
				<div class="chapter-container">
					<header>
						<h1>${title}</h1>
						<div class="controls">
							<button onclick="toggleAI()" id="aiButton">AI Off</button>
							<button onclick="toggleCompare()" id="compareButton">Compare</button>
						</div>
						<nav>
							${
								navigation.prev
									? `<a href="/api/novel/novels/${novelId}/chapters/${navigation.prev.volume}/${navigation.prev.chapter}${window.location.search}">Previous</a>`
									: ''
							}
							${
								navigation.next
									? `<a href="/api/novel/novels/${novelId}/chapters/${navigation.next.volume}/${navigation.next.chapter}${window.location.search}">Next</a>`
									: ''
							}
						</nav>
					</header>
					<main>
						${body}
					</main>
				</div>
			</body>
		</html>
	`
}

export { generateChapterHtml }
