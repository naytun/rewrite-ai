import { promises as fs } from 'fs'
import path from 'path'

export class NovelService {
	private readonly basePath = 'LightNovels/novelfull-com/Novel-01/json'

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

	async readChapter(volume: string, chapter: string): Promise<any> {
		try {
			const filePath = path.join(
				process.cwd(),
				this.basePath,
				volume,
				`${chapter}.json`
			)
			const content = await fs.readFile(filePath, 'utf-8')
			return JSON.parse(content)
		} catch (error) {
			console.error('Error reading chapter:', error)
			throw error
		}
	}
}
