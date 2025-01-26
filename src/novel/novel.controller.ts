import { Request, Response } from 'express'
import {
	listChapters as getChapters,
	readChapter as getChapterContent,
	listNovels as getNovels,
} from './novel.service'
import fs from 'fs'
import path from 'path'

// Global state store with persistence
const globalState = {
	_aiRewrite: false,
	get aiRewrite() {
		return this._aiRewrite
	},
	set aiRewrite(value: boolean) {
		this._aiRewrite = value
		// Persist the setting
		try {
			const settingsPath = path.join(__dirname, '../../.settings')
			if (!fs.existsSync(settingsPath)) {
				fs.mkdirSync(settingsPath, { recursive: true })
			}
			fs.writeFileSync(
				path.join(settingsPath, 'ai-rewrite.json'),
				JSON.stringify({ enabled: value }),
				'utf8'
			)
		} catch (error) {
			console.error('Failed to persist AI rewrite setting:', error)
		}
	},
}

// Initialize AI rewrite setting from persistent storage
try {
	const settingsFile = path.join(__dirname, '../../.settings/ai-rewrite.json')
	if (fs.existsSync(settingsFile)) {
		const settings = JSON.parse(fs.readFileSync(settingsFile, 'utf8'))
		globalState._aiRewrite = settings.enabled
		console.log('Loaded AI rewrite setting:', settings.enabled)
	} else {
		console.log(
			'No saved AI rewrite setting found, using default:',
			globalState._aiRewrite
		)
	}
} catch (error) {
	console.error('Failed to load AI rewrite setting:', error)
}

interface Chapter {
	volume: string
	chapter: string
	path: string
}

interface ChapterNavigation {
	current: Chapter
	prev?: Chapter
	next?: Chapter
}

const generateChapterListHtml = (
	title: string,
	chapters: Chapter[],
	novelId: string
): string => {
	// Group chapters by volume
	const volumeGroups = chapters.reduce<Record<string, Chapter[]>>(
		(acc, chapter) => {
			if (!acc[chapter.volume]) {
				acc[chapter.volume] = []
			}
			acc[chapter.volume].push(chapter)
			return acc
		},
		{}
	)

	const html = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>${title} - Chapters</title>
            <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
            <style>
                .chapter-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
                    gap: 1rem;
                    padding: 1rem;
                }
                .chapter-item {
                    background-color: white;
                    padding: 1rem;
                    border-radius: 0.5rem;
                    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
                    transition: transform 0.2s;
                    cursor: pointer;
                }
                .chapter-item:hover {
                    transform: translateY(-2px);
                }
                .chapter-item.last-read {
                    background-color: #93c5fd;
                }
                html.dark .chapter-item.last-read {
                    background-color: #1e40af;
                }
                .volume-title {
                    font-size: 1.5rem;
                    font-weight: 600;
                    margin: 2rem 0 1rem;
                    padding-bottom: 0.5rem;
                    border-bottom: 2px solid #e5e7eb;
                }
                .loading {
                    display: none;
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: rgba(0, 0, 0, 0.7);
                    z-index: 1000;
                    justify-content: center;
                    align-items: center;
                }
                .loading.active {
                    display: flex;
                }
                .spinner {
                    width: 50px;
                    height: 50px;
                    border: 5px solid #f3f3f3;
                    border-top: 5px solid #3b82f6;
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                }
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
                .back-button {
                    display: inline-block;
                    color: #3b82f6;
                    text-decoration: none;
                    padding: 0.5rem 1rem;
                    margin-bottom: 1rem;
                    border-radius: 0.5rem;
                    transition: all 0.2s;
                    font-size: 1.5rem;
                }
                .back-button:hover {
                    background: #e5e7eb;
                }
                html.dark body { background-color: #1a1a1a; color: #ffffff; }
                html.dark .chapter-item { background-color: #2d2d2d; }
                html.dark .text-gray-600 { color: #d1d1d1; }
                html.dark .volume-title { border-bottom-color: #4b5563; }
                html.dark .back-button { color: #60a5fa; }
                html.dark .back-button:hover { background: #374151; }
            </style>
        </head>
        <body class="bg-gray-100">
            <div id="loading" class="loading">
                <div class="spinner"></div>
            </div>

            <div class="container mx-auto px-4 py-8">
                <a href="/" class="back-button" onclick="showLoading()">← Back to Library</a>
                <h1 class="text-3xl font-bold mb-8 text-center">${title}</h1>
                ${Object.entries(volumeGroups)
									.sort(([volA], [volB]) => volA.localeCompare(volB))
									.map(
										([volume, chapters]) => `
                    <div>
                        <h2 class="volume-title">${volume}</h2>
                        <div class="chapter-grid">
                            ${chapters
															.sort(
																(a, b) =>
																	parseInt(a.chapter) - parseInt(b.chapter)
															)
															.map(
																(chapter) => `
                                <div class="chapter-item" data-volume="${
																	chapter.volume
																}" data-chapter="${
																	chapter.chapter
																}" onclick="openChapter('${encodeURIComponent(
																	novelId
																)}', '${encodeURIComponent(
																	chapter.volume
																)}', '${encodeURIComponent(chapter.chapter)}')">
                                    <h3 class="font-semibold">Chapter ${
																			chapter.chapter
																		}</h3>
                                </div>
                            `
															)
															.join('')}
                        </div>
                    </div>
                `
									)
									.join('')}
            </div>

            <script>
                // Check for dark mode preference
                if (localStorage.getItem('darkMode') === 'true') {
                    document.documentElement.classList.add('dark');
                }

                function showLoading() {
                    document.getElementById('loading').classList.add('active');
                }

                function openChapter(novelId, volume, chapter) {
                    showLoading();
                    // Save the last opened chapter
                    localStorage.setItem(\`lastChapter_\${novelId}\`, chapter);
                    localStorage.setItem(\`lastVolume_\${novelId}\`, volume);
                    
                    // Navigate to the chapter
                    window.location.href = \`/api/novel/novels/\${novelId}/chapters/\${volume}/\${chapter}\`;
                }

                // Highlight the last opened chapter if any
                document.addEventListener('DOMContentLoaded', () => {
                    const novelId = '${novelId}';
                    const lastChapter = localStorage.getItem(\`lastChapter_\${novelId}\`);
                    const lastVolume = localStorage.getItem(\`lastVolume_\${novelId}\`);
                    
                    if (lastChapter && lastVolume) {
                        const chapterItems = document.querySelectorAll('.chapter-item');
                        chapterItems.forEach(item => {
                            if (item.dataset.chapter === lastChapter && 
                                item.dataset.volume === lastVolume) {
                                item.classList.add('last-read');
                                item.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            }
                        });
                    }
                });
            </script>
        </body>
        </html>
    `
	return html
}

const generateChapterHtml = (
	chapterData: any,
	navigation: ChapterNavigation,
	chapters: Chapter[],
	currentNovelId: string
): string => {
	const html = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>${chapterData.title}</title>
            <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
            <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
            <style>
                .chapter-content {
                    max-width: 800px;
                    margin: 0 auto;
                    padding: 4rem;
                    padding-top: 1rem;
                    padding-bottom: 10rem;
                    line-height: 1.6;
                    font-size: 1.5rem;
                }
                .original-text {
                    display: none !important;
                    color: #808080;
                    font-style: italic;
                    margin-top: 1rem;
                    padding-top: 1rem;
                    border-top: 1px solid #e5e7eb;
                }
                .compare-mode .original-text {
                    display: block !important;
                }
                html.dark .original-text {
                    border-top-color: #4b5563;
                }
                .chapter-content p {
                    margin-bottom: 1.5rem;
                    font-size: 1.4rem;
                    line-height: 1.6;
                }
                @media (min-width: 640px) {
                    .chapter-content {
                        font-size: 1.4rem;
                    }
                    .chapter-content p {
                        font-size: 1.4rem;
                        line-height: 1.6;
                    }
                }
                .navigation {
                    position: fixed;
                    bottom: 0;
                    left: 0;
                    right: 0;
                    background: white;
                    padding: 1.25rem;
                    box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.1);
                    display: flex;
                    justify-content: center;
                    gap: 1rem;
                    transition: transform 0.3s ease;
                }
                .navigation.hidden {
                    transform: translateY(100%);
                }
                .toggle-container {
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                }
                .toggle-label {
                    display: flex;
                    font-size: 1rem;
                    align-items: center;
                    margin-left: 1.5rem;
                    gap: 1rem;
                    cursor: pointer;
                }
                .toggle-switch {
                    position: relative;
                    display: inline-block;
                    width: 48px;
                    height: 24px;
                }
                .toggle-switch input {
                    opacity: 0;
                    width: 0;
                    height: 0;
                }
                .toggle-slider {
                    position: absolute;
                    cursor: pointer;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background-color: #ccc;
                    transition: .4s;
                    border-radius: 24px;
                }
                .toggle-slider:before {
                    position: absolute;
                    content: "";
                    height: 16px;
                    width: 16px;
                    left: 4px;
                    bottom: 4px;
                    background-color: white;
                    transition: .4s;
                    border-radius: 50%;
                }
                input:checked + .toggle-slider {
                    background-color: #3b82f6;
                }
                input:checked + .toggle-slider:before {
                    transform: translateX(24px);
                }
                html.dark .toggle-slider {
                    background-color: #4b5563;
                }
                html.dark input:checked + .toggle-slider {
                    background-color: #60a5fa;
                }
                .back-button {
                    display: inline-flex;
                    align-items: center;
                    color: #3b82f6;
                    text-decoration: none;
                    padding: 0.5rem 1rem;
                    padding-left: 0;
                    border-radius: 0.5rem;
                    transition: all 0.2s;
                    font-size: 1rem;
                    font-weight: 500;
                }
                .back-button:hover {
                    background: #e5e7eb;
                }
                html.dark body {
                    background-color: #222;
                    color: #e5e7eb;
                }
                html.dark .chapter-content {
                    color: #e5e7eb;
                }
                html.dark .navigation {
                    background-color: #2d2d2d;
                    box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.3);
                }
                html.dark .nav-button {
                    background: #3b82f6;
                    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
                    margin-left: 1rem;
                    margin-right: 1rem;
                }
                html.dark .nav-button:hover {
                    background: #2563eb;
                    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
                }
                html.dark .nav-button.disabled {
                    background: #4b5563;
                    box-shadow: none;
                }
                html.dark .back-button {
                    color: #60a5fa;
                }
                html.dark .back-button:hover {
                    background: #374151;
                }
                .loading {
                    display: none;
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: rgba(0, 0, 0, 0.7);
                    z-index: 1000;
                    justify-content: center;
                    align-items: center;
                }
                .loading.active {
                    display: flex;
                }
                .spinner {
                    width: 50px;
                    height: 50px;
                    border: 5px solid #f3f3f3;
                    border-top: 5px solid #3b82f6;
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                }
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
                .nav-button {
                    padding: 0.55rem 1.2rem;
                    border-radius: 9999px;
                    background: #3b82f6;
                    color: white;
                    cursor: pointer;
                    transition: all 0.2s;
                    font-size: 1.2rem;
                    font-weight: 500;
                    min-width: 120px;
                    text-align: center;
                    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
                    margin-left: 1rem;
                    margin-right: 1rem;
                    opacity: 0.8;
                }
                .nav-button:hover {
                    background: #2563eb;
                    transform: translateY(-1px);
                    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                }
                .nav-button.disabled {
                    background: #9ca3af;
                    cursor: not-allowed;
                    transform: none;
                    box-shadow: none;
                }
                @media (min-width: 640px) {
                    .navigation {
                        gap: 2rem;
                    }
                }
                .compare-button {
                    position: fixed;
                    bottom: 80px;
                    right: 20px;
                    width: 56px;
                    height: 56px;
                    border-radius: 50%;
                    background-color: #9ca3af;
                    color: white;
                    display: none;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
                    transition: all 0.3s ease;
                    z-index: 100;
                }
                .compare-button.show {
                    display: flex;
                }
                .compare-button.active {
                    background-color: #3b82f6;
                }
                .compare-button:hover {
                    transform: scale(1.1);
                }
                html.dark .compare-button {
                    background-color: #4b5563;
                }
                html.dark .compare-button.active {
                    background-color: #3b82f6;
                }
                .compare-button:before {
                    content: attr(data-tooltip);
                    position: absolute;
                    bottom: 120%;
                    right: 50%;
                    transform: translateX(50%);
                    padding: 0.5rem 1rem;
                    background-color: #1f2937;
                    color: white;
                    border-radius: 0.375rem;
                    font-size: 0.875rem;
                    white-space: nowrap;
                    opacity: 0;
                    visibility: hidden;
                    transition: all 0.2s ease;
                }
                .compare-button:hover:before {
                    opacity: 1;
                    visibility: visible;
                }
                html.dark .compare-button:before {
                    background-color: #374151;
                }
            </style>
        </head>
        <body class="bg-gray-200">
            <div id="loading" class="loading">
                <div class="spinner"></div>
            </div>

            <div class="chapter-content">
                <div class="flex justify-between items-center mb-8">
                    <a href="/" class="back-button" onclick="showLoading()">← Library</a>
                    
                    <div class="toggle-container">
                        <label class="toggle-label">
                            <span>AI Rewrite </span>
                            <div class="toggle-switch">
                                <input type="checkbox" id="aiToggle" onchange="toggleAI()">
                                <span class="toggle-slider"></span>
                            </div>
                        </label>
                        <label class="toggle-label">
                            <span>Dark Mode </span>
                            <div class="toggle-switch">
                                <input type="checkbox" id="darkModeToggle">
                                <span class="toggle-slider"></span>
                            </div>
                        </label>
                    </div>
                </div>

                <h1 class="text-3xl font-bold mb-2">${chapterData.title}</h1>
                <h2 class="text-xl text-gray-600 mb-8">${
									navigation.current.volume
								}</h2>
                ${chapterData.body}
            </div>
            
            <div class="navigation">
                ${
									navigation.prev
										? `<a class="nav-button" href="/api/novel/novels/${encodeURIComponent(
												currentNovelId
										  )}/chapters/${encodeURIComponent(
												navigation.prev.volume
										  )}/${encodeURIComponent(
												navigation.prev.chapter
										  )}" onclick="showLoading(); saveLastChapter('${encodeURIComponent(
												navigation.prev.volume
										  )}', '${encodeURIComponent(
												navigation.prev.chapter
										  )}')" >← Previous</a>`
										: '<span class="nav-button disabled">← Previous</span>'
								}
                <a class="nav-button" href="/api/novel/novels/${encodeURIComponent(
									currentNovelId
								)}/chapters" onclick="showLoading()">Chapter List</a>
                ${
									navigation.next
										? `<a class="nav-button" href="/api/novel/novels/${encodeURIComponent(
												currentNovelId
										  )}/chapters/${encodeURIComponent(
												navigation.next.volume
										  )}/${encodeURIComponent(
												navigation.next.chapter
										  )}" onclick="showLoading(); saveLastChapter('${encodeURIComponent(
												navigation.next.volume
										  )}', '${encodeURIComponent(
												navigation.next.chapter
										  )}')" >Next →</a>`
										: '<span class="nav-button disabled">Next →</span>'
								}
            </div>

            <div class="compare-button" id="compareButton" onclick="toggleCompare()" data-tooltip="Compare original and AI rewritten text">
                <i class="fas fa-columns fa-lg"></i>
            </div>

            <script>
                // Check for dark mode preference
                if (localStorage.getItem('darkMode') === 'true') {
                    document.documentElement.classList.add('dark');
                }

                // Handle navigation bar visibility on scroll
                let lastScrollY = window.scrollY;
                let scrollThreshold = window.innerHeight * 0.2; // 20% of window height
                const nav = document.querySelector('.navigation');

                window.addEventListener('scroll', () => {
                    const currentScrollY = window.scrollY;
                    
                    // Show nav when scrolling up or at top
                    if (currentScrollY < lastScrollY || currentScrollY < scrollThreshold) {
                        nav.classList.remove('hidden');
                    } 
                    // Hide nav when scrolling down and past threshold
                    else if (currentScrollY > scrollThreshold) {
                        nav.classList.add('hidden');
                    }
                    
                    lastScrollY = currentScrollY;
                });

                // Recalculate threshold on window resize
                window.addEventListener('resize', () => {
                    scrollThreshold = window.innerHeight * 0.2;
                });

                function showLoading() {
                    document.getElementById('loading').classList.add('active');
                }

                // Initialize AI toggle state and compare button visibility
                document.addEventListener('DOMContentLoaded', async () => {
                    const aiToggle = document.getElementById('aiToggle');
                    const darkModeToggle = document.getElementById('darkModeToggle');
                    const compareButton = document.getElementById('compareButton');
                    
                    // Initialize dark mode
                    const isDarkMode = localStorage.getItem('darkMode') === 'true';
                    if (isDarkMode) {
                        document.documentElement.classList.add('dark');
                        darkModeToggle.checked = true;
                    }

                    // Add dark mode toggle event listener
                    darkModeToggle.addEventListener('change', () => {
                        const isDark = darkModeToggle.checked;
                        if (isDark) {
                            document.documentElement.classList.add('dark');
                            localStorage.setItem('darkMode', 'true');
                        } else {
                            document.documentElement.classList.remove('dark');
                            localStorage.setItem('darkMode', 'false');
                        }
                    });

                    // Initialize compare mode from URL
                    const urlParams = new URLSearchParams(window.location.search);
                    if (urlParams.get('compare') === 'true') {
                        compareButton.classList.add('active');
                    }
                    
                    try {
                        // Get AI preference from backend
                        const response = await fetch('/api/novel/settings/ai-rewrite', {
                            headers: {
                                'Accept': 'application/json'
                            }
                        });
                        
                        if (!response.ok) {
                            throw new Error('Failed to get AI settings');
                        }
                        
                        const { enabled } = await response.json();
                        console.log('Initial AI state:', enabled);
                        aiToggle.checked = enabled;
                        localStorage.setItem('aiRewrite', enabled.toString());
                        
                        // Show compare button only if AI is enabled
                        if (enabled) {
                            setTimeout(() => {
                                compareButton.classList.add('show');
                            }, 100);
                        }
                    } catch (error) {
                        console.error('Failed to get AI preference:', error);
                        // Use localStorage as fallback
                        const savedAIState = localStorage.getItem('aiRewrite') === 'true';
                        aiToggle.checked = savedAIState;
                        if (savedAIState) {
                            setTimeout(() => {
                                compareButton.classList.add('show');
                            }, 100);
                        }
                    }
                });

                // AI Toggle functionality
                async function toggleAI() {
                    const aiToggle = document.getElementById('aiToggle');
                    const compareButton = document.getElementById('compareButton');
                    const isEnabled = aiToggle.checked;
                    
                    try {
                        // Send toggle state to backend
                        const response = await fetch('/api/novel/settings/ai-rewrite', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Accept': 'application/json'
                            },
                            body: JSON.stringify({ enabled: isEnabled })
                        });
                        
                        if (!response.ok) {
                            throw new Error('Failed to update AI settings');
                        }
                        
                        const result = await response.json();
                        console.log('AI toggle response:', result);
                        
                        // Store the AI state in localStorage
                        localStorage.setItem('aiRewrite', isEnabled.toString());

                        // Show/hide compare button based on AI state
                        if (isEnabled) {
                            compareButton.classList.add('show');
                        } else {
                            compareButton.classList.remove('show', 'active');
                            // Remove compare parameter if AI is disabled
                            const currentUrl = new URL(window.location.href);
                            currentUrl.searchParams.delete('compare');
                            window.location.href = currentUrl.toString();
                            return;
                        }
                        
                        // Show loading and reload page to get new content
                        showLoading();
                        window.location.reload();
                    } catch (error) {
                        console.error('Failed to save AI preference:', error);
                        // Revert the toggle if the API call fails
                        aiToggle.checked = !isEnabled;
                        localStorage.setItem('aiRewrite', (!isEnabled).toString());
                        compareButton.classList.toggle('show', !isEnabled);
                        document.getElementById('loading').classList.remove('active');
                    }
                }

                // Compare Toggle functionality
                function toggleCompare() {
                    const compareButton = document.getElementById('compareButton');
                    const aiToggle = document.getElementById('aiToggle');
                    
                    // Only allow compare when AI is enabled
                    if (!aiToggle.checked) {
                        alert('AI Rewrite must be enabled to use Compare mode');
                        return;
                    }

                    // Toggle the active state of the button
                    const isCompareMode = compareButton.classList.contains('active');
                    if (isCompareMode) {
                        compareButton.classList.remove('active');
                    } else {
                        compareButton.classList.add('active');
                    }
                    
                    // Update URL without reloading
                    const currentUrl = new URL(window.location.href);
                    if (isCompareMode) {
                        currentUrl.searchParams.delete('compare');
                    } else {
                        currentUrl.searchParams.set('compare', 'true');
                    }
                    window.history.pushState({}, '', currentUrl.toString());

                    // Toggle visibility of original text
                    document.querySelector('.chapter-content').classList.toggle('compare-mode');
                }

                function saveLastChapter(volume, chapter) {
                    localStorage.setItem('lastChapter_' + '${currentNovelId}', chapter);
                    localStorage.setItem('lastVolume_' + '${currentNovelId}', volume);
                }

                // Save current chapter when page loads
                document.addEventListener('DOMContentLoaded', () => {
                    const currentVolume = '${navigation.current.volume}';
                    const currentChapter = '${navigation.current.chapter}';
                    saveLastChapter(currentVolume, currentChapter);
                });

                // Keyboard navigation
                document.addEventListener('keydown', (e) => {
                    const prevVolume = '${navigation.prev?.volume || ''}';
                    const prevChapter = '${navigation.prev?.chapter || ''}';
                    const nextVolume = '${navigation.next?.volume || ''}';
                    const nextChapter = '${navigation.next?.chapter || ''}';
                    const novelId = '${currentNovelId}';

                    if (e.key === 'ArrowLeft' && ${!!navigation.prev}) {
                        showLoading();
                        saveLastChapter(prevVolume, prevChapter);
                        window.location.href = '/api/novel/novels/' + 
                            encodeURIComponent(novelId) + '/chapters/' + 
                            encodeURIComponent(prevVolume) + '/' + 
                            encodeURIComponent(prevChapter);
                    } else if (e.key === 'ArrowRight' && ${!!navigation.next}) {
                        showLoading();
                        saveLastChapter(nextVolume, nextChapter);
                        window.location.href = '/api/novel/novels/' + 
                            encodeURIComponent(novelId) + '/chapters/' + 
                            encodeURIComponent(nextVolume) + '/' + 
                            encodeURIComponent(nextChapter);
                    }
                });
            </script>
        </body>
        </html>
    `
	return html
}

const navigationButtons = (
	navigation?: ChapterNavigation,
	chapters?: Chapter[],
	novelId?: string
): string => {
	if (!navigation || !chapters || !novelId) return ''

	const currentIndex = chapters.findIndex(
		(ch) =>
			ch.volume === navigation.current.volume &&
			ch.chapter === navigation.current.chapter
	)

	// Calculate the range of chapters to display
	const start = Math.max(0, currentIndex - 5)
	const end = Math.min(chapters.length, currentIndex + 6)

	const buttons = []
	for (let i = start; i < end; i++) {
		const ch = chapters[i]
		const isCurrent =
			ch.volume === navigation.current.volume &&
			ch.chapter === navigation.current.chapter
		buttons.push(`
			<a ${
				isCurrent
					? 'class="current"'
					: `href="/api/novel/novels/${encodeURIComponent(
							novelId
					  )}/chapters/${encodeURIComponent(ch.volume)}/${encodeURIComponent(
							ch.chapter
					  )}"`
			}>
				${Number(ch.chapter)}
			</a>
		`)
	}
	return buttons.join('')
}

export const listChapters = async (
	req: Request,
	res: Response
): Promise<void> => {
	try {
		const { novelId } = req.params
		const { title, chapters } = await getChapters(novelId)
		const html = generateChapterListHtml(title, chapters, novelId)
		res.send(html)
	} catch (error) {
		res.status(500).send('Error loading chapters')
	}
}

export const readChapter = async (
	req: Request,
	res: Response
): Promise<void> => {
	try {
		const { novelId, volume, chapter } = req.params
		const compare = req.query.compare === 'true'

		// Use global state for AI preference
		const useAI = globalState.aiRewrite
		console.log('AI Rewrite Settings:', {
			enabled: useAI,
			compare,
			globalState: globalState,
			requestBody: req.body,
		})

		const chapterData = await getChapterContent(
			novelId,
			volume,
			chapter,
			useAI,
			compare
		)
		if (!chapterData) {
			console.error('No chapter data returned')
			throw new Error('Failed to get chapter content')
		}

		const { chapters } = await getChapters(novelId)

		// Find current chapter index
		const allChapters = chapters.sort((a: Chapter, b: Chapter) => {
			if (a.volume === b.volume) {
				return parseInt(a.chapter) - parseInt(b.chapter)
			}
			return a.volume.localeCompare(b.volume)
		})

		const currentIndex = allChapters.findIndex(
			(ch: Chapter) => ch.volume === volume && ch.chapter === chapter
		)

		const navigation: ChapterNavigation = {
			current: allChapters[currentIndex],
			prev: currentIndex > 0 ? allChapters[currentIndex - 1] : undefined,
			next:
				currentIndex < allChapters.length - 1
					? allChapters[currentIndex + 1]
					: undefined,
		}

		// Generate and return HTML for reading, regardless of AI status
		const html = generateChapterHtml(
			chapterData,
			navigation,
			allChapters,
			novelId
		)
		res.send(html)
	} catch (error) {
		console.error('Error reading chapter:', error)
		res.status(500).send('Error loading chapter')
	}
}

export const listNovels = async (req: Request, res: Response) => {
	try {
		const novels = await getNovels()
		res.json(novels)
	} catch (error) {
		console.error('Error listing novels:', error)
		res.status(500).json({ error: 'Failed to list novels' })
	}
}

export const getAIRewriteSettings = async (req: Request, res: Response) => {
	try {
		res.json({ enabled: globalState.aiRewrite })
	} catch (error) {
		console.error('Error getting AI settings:', error)
		res.status(500).json({ error: 'Failed to get AI settings' })
	}
}

export const setAIRewriteSettings = async (
	req: Request,
	res: Response
): Promise<void> => {
	try {
		const { enabled } = req.body
		if (typeof enabled !== 'boolean') {
			res.status(400).json({ error: 'Invalid settings data' })
			return
		}
		globalState.aiRewrite = enabled
		res.json({ enabled: globalState.aiRewrite })
	} catch (error) {
		console.error('Error setting AI settings:', error)
		res.status(500).json({ error: 'Failed to save AI settings' })
	}
}
