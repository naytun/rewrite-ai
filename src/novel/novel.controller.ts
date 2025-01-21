import { Request, Response } from 'express'
import { NovelService } from './novel.service'

interface Chapter {
	volume: string
	chapter: string
	path: string
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
                <title>Novel Chapters</title>
                <meta name="viewport" content="width=device-width, initial-scale=1">
                <style>
                    body {
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
                        line-height: 1.6;
                        max-width: 800px;
                        margin: 0 auto;
                        padding: 20px;
                        background: #f5f5f5;
                    }
                    .volume {
                        background: white;
                        border-radius: 8px;
                        padding: 20px;
                        margin-bottom: 20px;
                        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                    }
                    h1 {
                        color: #333;
                        text-align: center;
                    }
                    h2 {
                        color: #444;
                        border-bottom: 2px solid #eee;
                        padding-bottom: 10px;
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
                </style>
            </head>
            <body>
                <h1>Novel Chapters</h1>
                ${Object.entries(volumeGroups)
									.map(
										([volume, chapters]) => `
                        <div class="volume">
                            <h2>${volume}</h2>
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

	private generateChapterHtml(chapterData: any): string {
		return `
            <!DOCTYPE html>
            <html>
            <head>
                <title>${chapterData.title || 'Chapter'}</title>
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
                    .chapter-container {
                        background: white;
                        padding: 40px;
                        border-radius: 8px;
                        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                    }
                    h1 {
                        text-align: center;
                        color: #333;
                        margin-bottom: 30px;
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
                        margin-top: 30px;
                        padding-top: 20px;
                        border-top: 1px solid #eee;
                    }
                    .navigation a {
                        color: #2196F3;
                        text-decoration: none;
                        padding: 10px 20px;
                        background: #f8f9fa;
                        border-radius: 4px;
                        transition: background 0.2s;
                    }
                    .navigation a:hover {
                        background: #e9ecef;
                    }
                </style>
            </head>
            <body>
                <div class="chapter-container">
                    <h1>${chapterData.title || 'Chapter'}</h1>
                    <div class="chapter-content">
                        ${chapterData.body || ''}
                    </div>
                    <div class="navigation">
                        <a href="/api/novel/chapters">← Back to Chapter List</a>
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
			const html = this.generateChapterHtml(chapterData)
			res.send(html)
		} catch (error) {
			res.status(500).send('Error loading chapter')
		}
	}
}

export const novelController = new NovelController()
