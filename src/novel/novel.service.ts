import { promises as fs } from 'fs'
import path from 'path'
import { askAI } from '../orama/orama.service'

export class NovelService {
	private readonly basePath = 'Lightnovels'

	private async getNovelPath(novelId: string): Promise<string> {
		const websites = await fs.readdir(path.join(process.cwd(), this.basePath))

		for (const website of websites) {
			if (website.startsWith('.')) continue

			const websitePath = path.join(process.cwd(), this.basePath, website)
			const stat = await fs.stat(websitePath)

			if (stat.isDirectory()) {
				const novelFolders = await fs.readdir(websitePath)

				if (novelFolders.includes(novelId)) {
					return path.join(websitePath, novelId)
				}
			}
		}

		throw new Error('Novel not found')
	}

	private async getNovelMetadata(novelId: string): Promise<any> {
		const novelPath = await this.getNovelPath(novelId)
		const metaPath = path.join(novelPath, 'meta.json')
		const metaContent = await fs.readFile(metaPath, 'utf-8')
		return JSON.parse(metaContent)
	}

	// List chapters
	async listChapters(
		novelId: string
	): Promise<{ title: string; chapters: any[] }> {
		try {
			const novelPath = await this.getNovelPath(novelId)
			const metadata = await this.getNovelMetadata(novelId)

			// Read the novel's volumes
			const volumes = await fs.readdir(path.join(novelPath, 'json'))
			const chapterList = []

			for (const volume of volumes) {
				const volumePath = path.join(novelPath, 'json', volume)
				const stat = await fs.stat(volumePath)

				if (stat.isDirectory()) {
					const chapters = await fs.readdir(volumePath)

					for (const chapter of chapters) {
						if (chapter.endsWith('.json')) {
							chapterList.push({
								volume,
								chapter: chapter.replace('.json', ''),
								path: `${volume}/${chapter}`,
							})
						}
					}
				}
			}

			return {
				title: metadata.novel.title,
				chapters: chapterList.sort((a, b) => {
					const volA = parseInt(a.volume.replace('Volume ', ''))
					const volB = parseInt(b.volume.replace('Volume ', ''))
					if (volA !== volB) return volA - volB
					return parseInt(a.chapter) - parseInt(b.chapter)
				}),
			}
		} catch (error) {
			console.error('Error listing chapters:', error)
			throw error
		}
	}

	// Read chapter
	async readChapter(
		novelId: string,
		volume: string,
		chapter: string
	): Promise<any> {
		try {
			const novelPath = await this.getNovelPath(novelId)
			const filePath = path.join(novelPath, 'json', volume, `${chapter}.json`)
			const content = await fs.readFile(filePath, 'utf-8')
			const chapterData = JSON.parse(content)

			// Convert HTML to plain text and handle paragraph tags
			const plainText = chapterData.body
				.replace(/<\/p>/g, '\n\n\n') // Replace <p> tags with double line breaks
				.replace(/<p>/g, '') // Remove closing p tags
				.replace(/<br\s*\/?>/g, '\n') // Replace <br> tags with line breaks
				.replace(/<[^>]*>/g, '') // Remove all other HTML tags
				.trim() // Remove leading/trailing whitespace

			// Ask AI to rewrite the chapter
			const result = await askAI({
				question: `Rewrite following contents to be in shorter sentences but don't over simplify and over summarize. Keep dialogue as is, and just rephrase for better reading. Create paragraphs as needed. Use only common words for better readability . ---\n ${plainText}`,
			})

			// Format the result into HTML paragraphs
			const formattedResult = result
				.split('\n\n')
				.map((paragraph) => `<p>${paragraph.trim()}</p>`)
				.join('\n')

			return {
				...chapterData,
				body: formattedResult,
			}
		} catch (error) {
			console.error('Error reading chapter:', error)
			throw error
		}
	}

	async listNovels(): Promise<any[]> {
		try {
			const websites = await fs.readdir(path.join(process.cwd(), this.basePath))
			const novels = []

			for (const website of websites) {
				if (website.startsWith('.')) continue // Skip hidden files

				const websitePath = path.join(process.cwd(), this.basePath, website)
				const stat = await fs.stat(websitePath)

				if (stat.isDirectory()) {
					const novelFolders = await fs.readdir(websitePath)

					for (const novelFolder of novelFolders) {
						if (novelFolder.startsWith('.')) continue // Skip hidden files

						const novelPath = path.join(websitePath, novelFolder)
						const novelStat = await fs.stat(novelPath)

						if (novelStat.isDirectory()) {
							try {
								const metaPath = path.join(novelPath, 'meta.json')
								const metaContent = await fs.readFile(metaPath, 'utf-8')
								const metadata = JSON.parse(metaContent)

								// Use local cover image
								const coverUrl = `/covers/${website}/${novelFolder}/cover.jpg`

								novels.push({
									id: novelFolder,
									website,
									...metadata.novel,
									cover_url: coverUrl, // Always use local cover image
								})
							} catch (error) {
								console.error(
									`Error reading metadata for ${novelFolder}:`,
									error
								)
							}
						}
					}
				}
			}

			return novels
		} catch (error) {
			console.error('Error listing novels:', error)
			throw error
		}
	}
}

// const t = {
// 	id: 180,
// 	url: 'https://novelfull.com/historys-strongest-senior-brother/chapter-180-the-catastrophic-nine-underworlds.html',
// 	title: 'Chapter 180: The Catastrophic Nine Underworlds',
// 	volume: 2,
// 	volume_title: 'Volume 2',
// 	body: '<h1>Chapter 180: The Catastrophic Nine Underworlds</h1><p> The catastrophic Nine they plummeted downwards!</p>',
// 	images: {},
// 	success: true,
// }
