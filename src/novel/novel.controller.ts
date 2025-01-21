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
            <html>
            <head>
                <title>${title} - Rewrite AI</title>
                <meta name="viewport" content="width=device-width, initial-scale=1">
                <style>
                    body {
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
                        line-height: 1.6;
                        max-width: 800px;
                        margin: 0 auto;
                        padding: 20px;
                        background: #f5f5f5;
                        color: #333;
                    }
                    @media (prefers-color-scheme: dark) {
                        body {
                            background: #1a1a1a;
                            color: #e0e0e0;
                        }
                    }
                    .back-button {
                        display: inline-block;
                        color: #2196F3;
                        text-decoration: none;
                        padding: 8px 16px;
                        background: #f8f9fa;
                        border-radius: 4px;
                        transition: all 0.2s;
                        margin-bottom: 20px;
                    }
                    .back-button:hover {
                        background: #e9ecef;
                        transform: translateX(-4px);
                    }
                    @media (prefers-color-scheme: dark) {
                        .back-button {
                            color: #64B5F6;
                            background: #353535;
                        }
                        .back-button:hover {
                            background: #404040;
                        }
                    }
                    .volume {
                        background: white;
                        padding: 20px;
                        margin-bottom: 20px;
                    }
                    @media (prefers-color-scheme: dark) {
                        .volume {
                            background: #2d2d2d;
                        }
                    }
                    h1 {
                        color: #333;
                        text-align: center;
                    }
                    @media (prefers-color-scheme: dark) {
                        h1 {
                            color: #e0e0e0;
                        }
                    }
                    h2 {
                        color: #444;
                        border-bottom: 2px solid #eee;
                        padding-bottom: 10px;
                    }
                    @media (prefers-color-scheme: dark) {
                        h2 {
                            color: #d0d0d0;
                            border-bottom-color: #404040;
                        }
                    }
                    .chapters {
                        display: grid;
                        grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
                        gap: 10px;
                    }
                    a {
                        color: #2196F3;
                        text-decoration: none;
                        padding: 8px;
                        display: block;
                        background: #f8f9fa;
                        border-radius: 4px;
                        transition: background 0.2s;
                    }
                    a:hover {
                        background: #e9ecef;
                    }
                    @media (prefers-color-scheme: dark) {
                        a {
                            color: #64B5F6;
                            background: #353535;
                        }
                        a:hover {
                            background: #404040;
                        }
                    }
                    .header {
                        text-align: center;
                        margin-bottom: 30px;
                    }
                    .novel-title {
                        color: #2196F3;
                        margin: 0 0 10px 0;
                        font-size: 0.9em;
                    }
                    @media (prefers-color-scheme: dark) {
                        .novel-title {
                            color: #64B5F6;
                        }
                    }
                    .volume-title {
                        color: #666;
                        margin: 0 0 15px 0;
                        font-size: 1.2em;
                    }
                    @media (prefers-color-scheme: dark) {
                        .volume-title {
                            color: #aaa;
                        }
                    }
                </style>
            </head>
            <body>
                <a href="/" class="back-button">← Back to Home</a>
                <div class="header">
                    <div class="novel-title">Rewrite AI Novel Reader</div>
                    <h1>${title}</h1>
                </div>
                ${Object.entries(volumeGroups)
									.map(
										([volume, chapters]) => `
                        <div class="volume">
                            <div class="volume-title">Volume: ${volume}</div>
                            <div class="chapters">
                                ${chapters
																	.map(
																		(chapter: any) => `
                                        <a href="/api/novel/novels/${encodeURIComponent(
																					novelId
																				)}/chapters/${encodeURIComponent(
																			chapter.volume
																		)}/${encodeURIComponent(chapter.chapter)}">
                                            Chapter ${chapter.chapter}
                                        </a>
                                    `
																	)
																	.join('')}
                            </div>
                        </div>
                    `
									)
									.join('')}
            </body>
            </html>
        `
		return html
	}

	private generateChapterHtml(
		chapterData: any,
		navigation?: ChapterNavigation,
		chapters?: Chapter[],
		novelId?: string
	): string {
		return `
            <!DOCTYPE html>
            <html>
            <head>
                <title>${chapterData.title || 'Chapter'} - Rewrite AI</title>
                <meta name="viewport" content="width=device-width, initial-scale=1">
                <style>
                    body {
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
                        line-height: 1.8;
                        font-size: 1.1em;
                        max-width: 800px;
                        margin: 0 auto;
                        padding: 20px;
                        background: #f5f5f5;
                        color: #333;
                    }
                    @media (prefers-color-scheme: dark) {
                        body {
                            background: #1a1a1a;
                            color: #e0e0e0;
                        }
                    }
                    .chapter-container {
                        background: white;
                        padding: 40px;
                    }
                    @media (prefers-color-scheme: dark) {
                        .chapter-container {
                            background: #2d2d2d;
                        }
                    }
                    h1 {
                        text-align: center;
                        color: #333;
                        margin-bottom: 30px;
                        font-size: 1.3em;
                        font-weight: bold;
                    }
                    @media (prefers-color-scheme: dark) {
                        h1 {
                            color: #e0e0e0;
                        }
                    }
                    .chapter-content {
                        font-size: 1.2em;
                        text-align: justify;
                    }
                    .chapter-content p {
                        margin-bottom: 1.5em;
                    }
                    .navigation {
                        display: flex;
                        justify-content: center;
                        margin-bottom: 30px;
                        padding-bottom: 20px;
                        gap: 0;
                        border-bottom: 1px solid #e0e0e0;
                    }
                    @media (prefers-color-scheme: dark) {
                        .navigation {
                            border-bottom-color: #404040;
                        }
                    }
                    .navigation a {
                        color: #2196F3;
                        text-decoration: none;
                        padding: 10px 20px;
                        background: transparent;
                        transition: background 0.2s;
                        border-right: 1px solid #e0e0e0;
                        cursor: pointer;
                    }
                    .navigation a.current {
                        color: #333;
                        font-weight: bold;
                        cursor: default;
                        pointer-events: none;
                    }
                    .navigation a:last-child {
                        border-right: none;
                    }
                    .navigation a:hover {
                        background: #f8f9fa;
                    }
                    @media (prefers-color-scheme: dark) {
                        .navigation a {
                            color: #64B5F6;
                            border-right-color: #404040;
                        }
                        .navigation a.current {
                            color: #ffffff;
                        }
                        .navigation a:hover {
                            background: #353535;
                        }
                    }
                    .header {
                        text-align: center;
                        margin-bottom: 30px;
                    }
                    .novel-title {
                        color: #2196F3;
                        margin: 0 0 10px 0;
                        font-size: 0.9em;
                    }
                    @media (prefers-color-scheme: dark) {
                        .novel-title {
                            color: #64B5F6;
                        }
                    }
                </style>
            </head>
            <body>
                <div class="chapter-container">
                    <div class="header">
                        <div class="novel-title">Rewrite AI Novel Reader</div>
                    </div>
                    <div class="navigation">
                        ${this.navigationButtons(navigation, chapters, novelId)}
                    </div>
                    <div class="chapter-content">
                        ${chapterData.body || ''}
                    </div>
                </div>
            </body>
            </html> 
        `
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
