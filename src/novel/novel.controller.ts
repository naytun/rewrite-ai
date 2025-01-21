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

	private generateChapterListHtml(chapters: Chapter[]): string {
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
                <title>Rewrite AI - Novel Reader</title>
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
                    .volume {
                        background: white;
                        border-radius: 8px;
                        padding: 20px;
                        margin-bottom: 20px;
                        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                    }
                    @media (prefers-color-scheme: dark) {
                        .volume {
                            background: #2d2d2d;
                            box-shadow: 0 2px 4px rgba(0,0,0,0.2);
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
                <div class="header">
                    <div class="novel-title">Rewrite AI Novel Reader</div>
                    <h1>Chapter List</h1>
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
                                        <a href="/api/novel/read/${encodeURIComponent(
																					chapter.volume
																				)}/${encodeURIComponent(
																			chapter.chapter
																		)}">
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
		navigation?: ChapterNavigation
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
                        border-radius: 8px;
                        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                    }
                    @media (prefers-color-scheme: dark) {
                        .chapter-container {
                            background: #2d2d2d;
                            box-shadow: 0 2px 4px rgba(0,0,0,0.2);
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
                        font-size: 1.1em;
                        text-align: justify;
                    }
                    .chapter-content p {
                        margin-bottom: 1.5em;
                    }
                    .navigation {
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        margin-top: 30px;
                        padding-top: 20px;
                        border-top: 1px solid #eee;
                        gap: 10px;
                    }
                    @media (prefers-color-scheme: dark) {
                        .navigation {
                            border-top-color: #404040;
                        }
                    }
                    .navigation a {
                        color: #2196F3;
                        text-decoration: none;
                        padding: 10px 20px;
                        background: #f8f9fa;
                        border-radius: 4px;
                        transition: background 0.2s;
                        white-space: nowrap;
                        flex: 1;
                        text-align: center;
                    }
                    .navigation a.prev {
                        text-align: left;
                    }
                    .navigation a.next {
                        text-align: right;
                    }
                    .navigation a.disabled {
                        opacity: 0.5;
                        pointer-events: none;
                    }
                    .navigation a:hover {
                        background: #e9ecef;
                    }
                    @media (prefers-color-scheme: dark) {
                        .navigation a {
                            color: #64B5F6;
                            background: #353535;
                        }
                        .navigation a:hover {
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
                </style>
            </head>
            <body>
                <div class="chapter-container">
                    <div class="header">
                        <div class="novel-title">Rewrite AI Novel Reader</div>
                    </div>
                    <div class="chapter-content">
                        ${chapterData.body || ''}
                    </div>
                    <div class="navigation">
                        ${
													navigation?.prev
														? `<a href="/api/novel/read/${encodeURIComponent(
																navigation.prev.volume
														  )}/${encodeURIComponent(
																navigation.prev.chapter
														  )}" class="prev">← Previous</a>`
														: `<a class="prev disabled">← Previous</a>`
												}
                        <a href="/api/novel/chapters">Chapter List</a>
                        ${
													navigation?.next
														? `<a href="/api/novel/read/${encodeURIComponent(
																navigation.next.volume
														  )}/${encodeURIComponent(
																navigation.next.chapter
														  )}" class="next">Next →</a>`
														: `<a class="next disabled">Next →</a>`
												}
                    </div>
                </div>
            </body>
            </html>
        `
	}

	async listChapters(req: Request, res: Response): Promise<void> {
		try {
			const chapters = await this.novelService.listChapters()
			const html = this.generateChapterListHtml(chapters)
			res.send(html)
		} catch (error) {
			res.status(500).send('Error loading chapters')
		}
	}

	async readChapter(req: Request, res: Response): Promise<void> {
		try {
			const { volume, chapter } = req.params
			const chapterData = await this.novelService.readChapter(volume, chapter)
			const chapters = await this.novelService.listChapters()

			// Find current chapter index
			const allChapters = chapters.sort((a, b) => {
				if (a.volume === b.volume) {
					return parseInt(a.chapter) - parseInt(b.chapter)
				}
				return a.volume.localeCompare(b.volume)
			})

			const currentIndex = allChapters.findIndex(
				(ch) => ch.volume === volume && ch.chapter === chapter
			)

			const navigation: ChapterNavigation = {
				current: allChapters[currentIndex],
				prev: currentIndex > 0 ? allChapters[currentIndex - 1] : undefined,
				next:
					currentIndex < allChapters.length - 1
						? allChapters[currentIndex + 1]
						: undefined,
			}

			const html = this.generateChapterHtml(chapterData, navigation)
			res.send(html)
		} catch (error) {
			res.status(500).send('Error loading chapter')
		}
	}
}

export const novelController = new NovelController()
