import { promises as fs } from 'fs'
import path from 'path'
import { askAI } from '../orama/orama.service'

export class NovelService {
	private readonly basePath = 'Lightnovels/novelfull-com/Novel-01/json'

	// List chapters
	async listChapters(): Promise<any[]> {
		try {
			const volumes = await fs.readdir(path.join(process.cwd(), this.basePath))
			const chapterList = []

			for (const volume of volumes) {
				const volumePath = path.join(process.cwd(), this.basePath, volume)
				const stat = await fs.stat(volumePath)

				if (stat.isDirectory()) {
					const chapters = await fs.readdir(volumePath)
					const volumeNumber = volume.replace('Volume ', '').padStart(2, '0')

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

			return chapterList.sort((a, b) => {
				const volA = parseInt(a.volume.replace('Volume ', ''))
				const volB = parseInt(b.volume.replace('Volume ', ''))
				if (volA !== volB) return volA - volB
				return a.chapter.localeCompare(b.chapter)
			})
		} catch (error) {
			console.error('Error listing chapters:', error)
			throw error
		}
	}

	// Read chapter
	async readChapter(volume: string, chapter: string): Promise<any> {
		try {
			const filePath = path.join(
				process.cwd(),
				this.basePath,
				volume,
				`${chapter}.json`
			)
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
				question: `Rewrite following contents to be in shorter sentences and be concise. Create paragraphs as needed. Use only common words for better readability . ---\n ${plainText}`,
			})

			// Format the result into HTML paragraphs
			const formattedResult = result
				.split('\n\n')
				.map((paragraph) => `<p>${paragraph.trim()}</p>`)
				.join('\n')

			console.log(
				'㏒  ~ NovelService ~ readChapter ~ formattedResult:',
				formattedResult
			)
			return {
				...chapterData,
				body: formattedResult,
			}
		} catch (error) {
			console.error('Error reading chapter:', error)
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
