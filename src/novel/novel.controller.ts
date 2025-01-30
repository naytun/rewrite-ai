import { Request, Response } from 'express'
import {
	listChapters as getChapters,
	readChapter as getChapterContent,
	listNovels as getNovels,
	bulkGenerateAIContent as generateAIContent,
	getNovelPath,
	preloadAIContent,
} from './novel.service'
import fs from 'fs'
import path from 'path'

// Global state store with persistence
export const globalState = {
	_aiRewrite: false,
	_aiPrompt: '',
	get aiRewrite() {
		return this._aiRewrite
	},
	get aiPrompt() {
		return this._aiPrompt
	},
	set aiRewrite(value: boolean) {
		this._aiRewrite = value
		this.persistSettings()
	},
	set aiPrompt(value: string) {
		this._aiPrompt = value
		this.persistSettings()
	},
	persistSettings() {
		try {
			const settingsPath = path.join(__dirname, '../../.settings')
			if (!fs.existsSync(settingsPath)) {
				fs.mkdirSync(settingsPath, { recursive: true })
			}
			fs.writeFileSync(
				path.join(settingsPath, 'ai-rewrite.json'),
				JSON.stringify(
					{
						enabled: this._aiRewrite,
						prompt: this._aiPrompt,
					},
					null,
					2
				),
				'utf8'
			)
		} catch (error) {
			console.error('Failed to persist AI settings:', error)
		}
	},
}

// Initialize AI rewrite setting from persistent storage
try {
	const settingsFile = path.join(__dirname, '../../.settings/ai-rewrite.json')
	if (fs.existsSync(settingsFile)) {
		const settings = JSON.parse(fs.readFileSync(settingsFile, 'utf8'))
		globalState._aiRewrite = settings.enabled
		globalState._aiPrompt = settings.prompt || ''
		// console.log('Loaded AI settings:', settings)
	} else {
		console.log('No saved AI settings found, using defaults:', {
			enabled: globalState._aiRewrite,
			prompt: globalState._aiPrompt,
		})
	}
} catch (error) {
	console.error('Failed to load AI settings:', error)
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
	try {
		// Read the template file
		const templatePath = path.join(__dirname, 'templates', 'chapter.html')
		let template = fs.readFileSync(templatePath, 'utf-8')

		// Generate navigation buttons HTML
		const navButtons = `
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
					  )}', '${encodeURIComponent(navigation.next.chapter)}')" >Next →</a>`
					: '<span class="nav-button disabled">Next →</span>'
			}`

		// Replace template variables
		template = template
			.replace(/{{novel_title}}/g, chapterData.novel_title || '')
			.replace(/{{chapter_title}}/g, chapterData.title)
			.replace(/{{volume}}/g, navigation.current.volume)
			.replace(/{{chapter_body}}/g, chapterData.body)
			.replace(/{{navigation_buttons}}/g, navButtons)
			.replace(/{{novel_id}}/g, currentNovelId)
			.replace(/{{current_volume}}/g, navigation.current.volume)
			.replace(/{{current_chapter}}/g, navigation.current.chapter)
			.replace(/{{prev_volume}}/g, navigation.prev?.volume || '')
			.replace(/{{prev_chapter}}/g, navigation.prev?.chapter || '')
			.replace(/{{next_volume}}/g, navigation.next?.volume || '')
			.replace(/{{next_chapter}}/g, navigation.next?.chapter || '')

		return template
	} catch (error) {
		console.error('Error generating chapter HTML:', error)
		throw error
	}
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

		// Add cache control headers
		res.setHeader(
			'Cache-Control',
			'no-store, no-cache, must-revalidate, proxy-revalidate'
		)
		res.setHeader('Pragma', 'no-cache')
		res.setHeader('Expires', '0')
		res.setHeader('Content-Type', 'text/html; charset=utf-8')

		// Use global state for AI preference
		const useAI = globalState.aiRewrite
		console.log('Reading chapter with settings:', {
			useAI,
			compare,
			volume,
			chapter,
		})

		// First get the original content without AI to show immediately
		const chapterData = await getChapterContent(
			novelId,
			volume,
			chapter,
			false,
			false
		)
		if (!chapterData) {
			console.error('No chapter data returned')
			throw new Error('Failed to get chapter content')
		}
		console.log('Original chapter data retrieved successfully')

		const { chapters } = await getChapters(novelId)
		console.log('Got chapters list, total chapters:', chapters.length)

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
		console.log('Current chapter index:', currentIndex)

		const navigation: ChapterNavigation = {
			current: allChapters[currentIndex],
			prev: currentIndex > 0 ? allChapters[currentIndex - 1] : undefined,
			next:
				currentIndex < allChapters.length - 1
					? allChapters[currentIndex + 1]
					: undefined,
		}
		console.log('Navigation data prepared')

		// Generate and return HTML for reading with original content
		const html = generateChapterHtml(
			chapterData,
			navigation,
			allChapters,
			novelId
		)
		console.log('HTML generated, length:', html.length)

		// Send the response immediately with original content
		res.send(html)
		console.log('Response sent successfully')

		// After sending response, generate AI content asynchronously if needed
		if (useAI) {
			console.log('Starting async AI generation for current chapter...')
			preloadAIContent(novelId, volume, chapter).catch((error: any) => {
				console.error('Background AI generation failed:', error)
			})
		}

		// Also start preloading next chapter's AI content asynchronously
		if (navigation.next) {
			console.log('Starting async preload of next chapter...')
			preloadAIContent(
				novelId,
				navigation.next.volume,
				navigation.next.chapter
			).catch((error: any) => {
				console.error('Background preload of next chapter failed:', error)
			})
		}
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
		res.json({
			enabled: globalState.aiRewrite,
			prompt: globalState.aiPrompt,
		})
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
		const { enabled, prompt } = req.body
		if (typeof enabled !== 'boolean') {
			res.status(400).json({ error: 'Invalid enabled value' })
			return
		}
		globalState.aiRewrite = enabled
		if (prompt !== undefined) {
			globalState.aiPrompt = prompt
		}
		res.json({
			enabled: globalState.aiRewrite,
			prompt: globalState.aiPrompt,
		})
	} catch (error) {
		console.error('Error setting AI settings:', error)
		res.status(500).json({ error: 'Failed to save AI settings' })
	}
}

export const bulkGenerateAIContent = async (
	req: Request,
	res: Response
): Promise<void> => {
	try {
		const { novelId } = req.params
		const { startChapter, endChapter } = req.query

		await generateAIContent(
			novelId,
			startChapter as string | undefined,
			endChapter as string | undefined
		)

		res.json({ message: 'Bulk generation started successfully' })
	} catch (error) {
		console.error('Error in bulk generation endpoint:', error)
		res.status(500).json({ error: 'Failed to start bulk generation' })
	}
}

export const regenerateChapter = async (
	req: Request,
	res: Response
): Promise<void> => {
	try {
		console.log('Regenerate endpoint hit with params:', req.params)
		const { novelId, volume, chapter } = req.params
		console.log('Starting chapter regeneration:', { novelId, volume, chapter })

		// Get the chapter content
		let chapterData
		try {
			console.log('Attempting to get chapter content...')
			chapterData = await getChapterContent(
				novelId,
				volume,
				chapter,
				true,
				false
			)
			console.log('Successfully retrieved original chapter content')
		} catch (error: any) {
			console.error('Error getting original chapter content:', error)
			res.status(500).json({
				error: 'Failed to get original chapter content',
				details: error.message || 'Unknown error',
			})
			return
		}

		// Delete the existing AI file to force regeneration
		try {
			console.log('Getting novel path...')
			const novelPath = await getNovelPath(novelId)
			const aiFilePath = path.join(
				novelPath,
				'json',
				volume,
				`${chapter}-ai.json`
			)
			console.log('AI file path:', aiFilePath)

			try {
				console.log('Attempting to delete existing AI file...')
				await fs.promises.unlink(aiFilePath)
				console.log('Successfully deleted existing AI file')
			} catch (error: any) {
				// Ignore if file doesn't exist
				console.log('No existing AI file to delete or error:', error.message)
			}

			// Regenerate the AI content
			console.log('Starting AI content regeneration...')
			const regeneratedData = await getChapterContent(
				novelId,
				volume,
				chapter,
				true,
				false
			)

			if (!regeneratedData) {
				console.error('No data returned from regeneration')
				throw new Error('Failed to generate new AI content')
			}
			console.log('Successfully generated new AI content')

			// Preload the next chapter
			try {
				console.log('Attempting to preload next chapter...')
				const { chapters } = await getChapters(novelId)
				const currentIndex = chapters.findIndex(
					(ch) => ch.volume === volume && ch.chapter === chapter
				)

				if (currentIndex !== -1 && currentIndex < chapters.length - 1) {
					const nextChapter = chapters[currentIndex + 1]
					await preloadAIContent(
						novelId,
						nextChapter.volume,
						nextChapter.chapter
					)
					console.log('Successfully preloaded next chapter')
				} else {
					console.log('No next chapter to preload')
				}
			} catch (error: any) {
				// Don't fail the whole operation if preloading next chapter fails
				console.error('Error preloading next chapter:', error)
			}

			console.log('Chapter regeneration completed successfully')
			res.json({ success: true, data: regeneratedData })
		} catch (error: any) {
			console.error('Error during regeneration process:', error)
			res.status(500).json({
				error: 'Failed to regenerate chapter',
				details: error.message || 'Unknown error',
			})
		}
	} catch (error: any) {
		console.error('Unexpected error in regenerateChapter:', error)
		res.status(500).json({
			error: 'An unexpected error occurred',
			details: error.message || 'Unknown error',
		})
	}
}
