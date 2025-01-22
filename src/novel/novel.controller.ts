import { Request, Response } from 'express'
import { NovelService } from './novel.service'

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

export class NovelController {
	private readonly novelService: NovelService

	constructor() {
		this.novelService = new NovelService()
	}

	private generateChapterListHtml(
		title: string,
		chapters: Chapter[],
		novelId: string
	): string {
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
                    .current {
                        background-color: #3b82f6;
                        color: white;
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
                                    <div class="chapter-item" onclick="openChapter('${encodeURIComponent(
																			novelId
																		)}', '${encodeURIComponent(
																			chapter.volume
																		)}', '${encodeURIComponent(
																			chapter.chapter
																		)}')">
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
                                const chapterText = item.querySelector('h3').textContent;
                                const volumeText = item.querySelector('p').textContent;
                                
                                if (chapterText === \`Chapter \${lastChapter}\` && 
                                    volumeText === \`Volume \${lastVolume}\`) {
                                    item.classList.add('bg-blue-100');
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

	private generateChapterHtml(
		chapterData: any,
		navigation: ChapterNavigation,
		chapters: Chapter[],
		novelId: string
	): string {
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
                    }
                    .chapter-content p {
                        margin-bottom: 1.5rem;
                    }
                    .navigation {
                        position: fixed;
                        bottom: 0;
                        left: 0;
                        right: 0;
                        background: white;
                        padding: 1rem;
                        box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.1);
                        display: flex;
                        justify-content: center;
                        gap: 1rem;
                    }
                    .nav-button {
                        padding: 0.5rem 1rem;
                        border-radius: 0.5rem;
                        background: #3b82f6;
                        color: white;
                        cursor: pointer;
                        transition: background 0.2s;
                    }
                    .nav-button:hover {
                        background: #2563eb;
                    }
                    .nav-button.disabled {
                        background: #9ca3af;
                        cursor: not-allowed;
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
                    html.dark .navigation { background-color: #2d2d2d; }
                    html.dark .chapter-content { color: #e5e7eb; }
                    html.dark .back-button { color: #60a5fa; }
                    html.dark .back-button:hover { background: #374151; }
                </style>
            </head>
            <body class="bg-gray-100">
                <div id="loading" class="loading">
                    <div class="spinner"></div>
                </div>

                <div class="chapter-content">
                    <a href="/api/novel/novels/${encodeURIComponent(
											novelId
										)}/chapters" class="back-button" onclick="showLoading()">← Back to Chapter List</a>
                    <h1 class="text-3xl font-bold mb-2">${
											chapterData.title
										}</h1>
                    <h2 class="text-xl text-gray-600 mb-8">${
											navigation.current.volume
										}</h2>
                    ${chapterData.body}
                </div>
                
                <div class="navigation">
                    ${
											navigation.prev
												? `<a class="nav-button" href="/api/novel/novels/${encodeURIComponent(
														novelId
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
											novelId
										)}/chapters" onclick="showLoading()">Chapter List</a>
                    ${
											navigation.next
												? `<a class="nav-button" href="/api/novel/novels/${encodeURIComponent(
														novelId
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
                    }

                    function showLoading() {
                        document.getElementById('loading').classList.add('active');
                    }

                    // Save current chapter as last read
                    const novelId = '${novelId}';
                    const currentVolume = '${navigation.current.volume}';
                    const currentChapter = '${navigation.current.chapter}';
                    
                    localStorage.setItem(\`lastChapter_\${novelId}\`, currentChapter);
                    localStorage.setItem(\`lastVolume_\${novelId}\`, currentVolume);

                    function saveLastChapter(volume, chapter) {
                        localStorage.setItem(\`lastChapter_\${novelId}\`, chapter);
                        localStorage.setItem(\`lastVolume_\${novelId}\`, volume);
                    }

                    // Keyboard navigation
                    document.addEventListener('keydown', (e) => {
                        if (e.key === 'ArrowLeft' && ${!!navigation.prev}) {
                            showLoading();
                            saveLastChapter('${
															navigation.prev?.volume || ''
														}', '${navigation.prev?.chapter || ''}');
                            window.location.href = '/api/novel/novels/${encodeURIComponent(
															novelId
														)}/chapters/${encodeURIComponent(
			navigation.prev?.volume || ''
		)}/${encodeURIComponent(navigation.prev?.chapter || '')}';
                        } else if (e.key === 'ArrowRight' && ${!!navigation.next}) {
                            showLoading();
                            saveLastChapter('${
															navigation.next?.volume || ''
														}', '${navigation.next?.chapter || ''}');
                            window.location.href = '/api/novel/novels/${encodeURIComponent(
															novelId
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

	private navigationButtons(
		navigation?: ChapterNavigation,
		chapters?: Chapter[],
		novelId?: string
	): string {
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

	async listChapters(req: Request, res: Response): Promise<void> {
		try {
			const { novelId } = req.params
			const { title, chapters } = await this.novelService.listChapters(novelId)
			const html = this.generateChapterListHtml(title, chapters, novelId)
			res.send(html)
		} catch (error) {
			res.status(500).send('Error loading chapters')
		}
	}

	async readChapter(req: Request, res: Response): Promise<void> {
		try {
			const { novelId, volume, chapter } = req.params
			const chapterData = await this.novelService.readChapter(
				novelId,
				volume,
				chapter
			)
			const { chapters } = await this.novelService.listChapters(novelId)

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

			const html = this.generateChapterHtml(
				chapterData,
				navigation,
				allChapters,
				novelId
			)
			res.send(html)
		} catch (error) {
			res.status(500).send('Error loading chapter')
		}
	}

	async listNovels(req: Request, res: Response) {
		try {
			const novels = await this.novelService.listNovels()
			res.json(novels)
		} catch (error) {
			console.error('Error listing novels:', error)
			res.status(500).json({ error: 'Failed to list novels' })
		}
	}
}

export const novelController = new NovelController()
