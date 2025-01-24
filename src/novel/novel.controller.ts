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
            <style>
                .chapter-content {
                    max-width: 800px;
                    margin: 0 auto;
                    padding: 2rem;
                    line-height: 1.8;
                    font-size: 1.125rem;
                }
                .chapter-content p {
                    margin-bottom: 1.5rem;
                    font-size: 1.125rem;
                    line-height: 1.6;
                }
                @media (min-width: 640px) {
                    .chapter-content {
                        font-size: 1.25rem;
                    }
                    .chapter-content p {
                        font-size: 1.25rem;
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
                }
                .toggle-container {
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                    margin-bottom: 1rem;
                }
                .toggle-switch {
                    position: relative;
                    display: inline-block;
                    width: 36px;
                    height: 20px;
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
                    border-radius: 20px;
                }
                .toggle-slider:before {
                    position: absolute;
                    content: "";
                    height: 14px;
                    width: 14px;
                    left: 3px;
                    bottom: 3px;
                    background-color: white;
                    transition: .4s;
                    border-radius: 50%;
                }
                input:checked + .toggle-slider {
                    background-color: #3b82f6;
                }
                input:checked + .toggle-slider:before {
                    transform: translateX(16px);
                }
                .toggle-label {
                    font-size: 0.75rem;
                    color: #4b5563;
                    margin-right: 0.5rem;
                }
                html.dark .toggle-label {
                    color: #e5e7eb;
                }
                .back-button {
                    display: inline-flex;
                    align-items: center;
                    color: #3b82f6;
                    text-decoration: none;
                    padding: 0.5rem 1rem;
                    border-radius: 0.5rem;
                    transition: all 0.2s;
                    font-size: 0.875rem;
                    font-weight: 500;
                }
                .back-button:hover {
                    background: #e5e7eb;
                }
                html.dark body {
                    background-color: #1a1a1a;
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
                    padding: 0.75rem 1.5rem;
                    border-radius: 9999px;
                    background: #3b82f6;
                    color: white;
                    cursor: pointer;
                    transition: all 0.2s;
                    font-size: 1rem;
                    font-weight: 500;
                    min-width: 120px;
                    text-align: center;
                    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
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
            </style>
        </head>
        <body class="bg-gray-100">
            <div id="loading" class="loading">
                <div class="spinner"></div>
            </div>

            <div class="chapter-content">
                <div class="flex justify-between items-center mb-8">
                    <a href="/api/novel/novels/${encodeURIComponent(
											currentNovelId
										)}/chapters" class="back-button" onclick="showLoading()">← Back to Chapter List</a>
                    
                    <div class="flex items-center gap-4">
                        <div class="flex items-center">
                            <span class="toggle-label">AI Rewrite</span>
                            <label class="toggle-switch ml-2">
                                <input type="checkbox" id="aiToggle" onchange="toggleAI()">
                                <span class="toggle-slider"></span>
                            </label>
                        </div>
                        <div class="flex items-center">
                            <span class="toggle-label">Dark Mode</span>
                            <label class="toggle-switch ml-2">
                                <input type="checkbox" id="darkModeToggle">
                                <span class="toggle-slider"></span>
                            </label>
                        </div>
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
										  )}')">← Previous</a>`
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
										  )}')">Next →</a>`
										: '<span class="nav-button disabled">Next →</span>'
								}
            </div>

            <script>
                // Check for dark mode preference
                if (localStorage.getItem('darkMode') === 'true') {
                    document.documentElement.classList.add('dark');
                    darkModeToggle.checked = true;
                }

                function showLoading() {
                    document.getElementById('loading').classList.add('active');
                }

                // Dark mode toggle functionality
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

                // Save current chapter as last read
                const novelId = '${currentNovelId}';
                const currentVolume = '${navigation.current.volume}';
                const currentChapter = '${navigation.current.chapter}';
                
                localStorage.setItem('lastChapter_' + novelId, currentChapter);
                localStorage.setItem('lastVolume_' + novelId, currentVolume);

                function saveLastChapter(volume, chapter) {
                    localStorage.setItem('lastChapter_' + novelId, chapter);
                    localStorage.setItem('lastVolume_' + novelId, volume);
                }

                // AI Toggle functionality
                async function toggleAI() {
                    const aiToggle = document.getElementById('aiToggle');
                    showLoading();
                    
                    try {
                        // Send toggle state to backend
                        const response = await fetch('/api/novel/settings/ai-rewrite', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Accept': 'application/json'
                            },
                            body: JSON.stringify({ enabled: aiToggle.checked })
                        });
                        
                        if (!response.ok) {
                            throw new Error('Failed to update AI settings');
                        }
                        
                        const result = await response.json();
                        console.log('AI toggle response:', result);
                        
                        if (result.enabled !== aiToggle.checked) {
                            aiToggle.checked = result.enabled;
                        }
                        
                        // Reload page to get new content
                        window.location.reload();
                    } catch (error) {
                        console.error('Failed to save AI preference:', error);
                        document.getElementById('loading').classList.remove('active');
                    }
                }

                // Initialize AI toggle state from backend
                document.addEventListener('DOMContentLoaded', async () => {
                    const aiToggle = document.getElementById('aiToggle');
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
                    } catch (error) {
                        console.error('Failed to get AI preference:', error);
                        aiToggle.checked = false;
                    }
                });

                // Keyboard navigation
                document.addEventListener('keydown', (e) => {
                    if (e.key === 'ArrowLeft' && ${!!navigation.prev}) {
                        showLoading();
                        saveLastChapter('${navigation.prev?.volume || ''}', '${
		navigation.prev?.chapter || ''
	}');
                        window.location.href = '/api/novel/novels/${encodeURIComponent(
													currentNovelId
												)}/chapters/${encodeURIComponent(
		navigation.prev?.volume || ''
	)}/${encodeURIComponent(navigation.prev?.chapter || '')}';
                    } else if (e.key === 'ArrowRight' && ${!!navigation.next}) {
                        showLoading();
                        saveLastChapter('${navigation.next?.volume || ''}', '${
		navigation.next?.chapter || ''
	}');
                        window.location.href = '/api/novel/novels/${encodeURIComponent(
													currentNovelId
												)}/chapters/${encodeURIComponent(
		navigation.next?.volume || ''
	)}/${encodeURIComponent(navigation.next?.chapter || '')}';
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

		// Use global state for AI preference
		const useAI = globalState.aiRewrite
		console.log('AI Rewrite Settings:', {
			enabled: useAI,
			globalState: globalState,
			requestBody: req.body,
		})

		const chapterData = await getChapterContent(novelId, volume, chapter, useAI)
		if (!chapterData) {
			console.error('No chapter data returned')
			throw new Error('Failed to get chapter content')
		}
		console.log(
			'> Chapter content fetched successfully',
			chapterData?.body?.substring(100, 400)
		)

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
