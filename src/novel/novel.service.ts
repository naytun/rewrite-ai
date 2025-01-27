import path from 'path'
import { promises as fs } from 'fs'

import { askAI } from '../orama/orama.service'
import { getAISettings } from '../settings/settings.service'

const basePath = 'Lightnovels'

const getNovelPath = async (novelId: string): Promise<string> => {
	const websites = await fs.readdir(path.join(process.cwd(), basePath))

	for (const website of websites) {
		if (website.startsWith('.')) continue

		const websitePath = path.join(process.cwd(), basePath, website)
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

const getNovelMetadata = async (novelId: string): Promise<any> => {
	const novelPath = await getNovelPath(novelId)
	const metaPath = path.join(novelPath, 'meta.json')
	const metaContent = await fs.readFile(metaPath, 'utf-8')
	return JSON.parse(metaContent)
}

export const listChapters = async (
	novelId: string
): Promise<{ title: string; chapters: any[] }> => {
	try {
		const novelPath = await getNovelPath(novelId)
		const metadata = await getNovelMetadata(novelId)

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

export const readChapter = async (
	novelId: string,
	volume: string,
	chapter: string,
	useAI: boolean = false,
	compare: boolean = false
): Promise<any> => {
	try {
		const novelPath = await getNovelPath(novelId)
		const filePath = path.join(novelPath, 'json', volume, `${chapter}.json`)
		const content = await fs.readFile(filePath, 'utf-8')
		const chapterData = JSON.parse(content)

		const plainText = chapterData.body
			.replace(/<\/p>/g, '\n\n')
			.replace(/<p>/g, '')
			.replace(/<br\s*\/?>/g, '\n')
			.replace(/<[^>]*>/g, '')
			.trim()

		// Split into paragraphs and clean up empty lines
		const splitIntoParagraphs = (text: string): string[] => {
			return text
				.split(/\n\s*\n/) // Split on one or more blank lines
				.map((p: string) => p.replace(/\s+/g, ' ').trim()) // Normalize whitespace
				.filter((p: string) => p.length > 0)
				.filter(
					(p: string) =>
						!p.startsWith('Translator:') &&
						!p.startsWith('Editor:') &&
						!p.startsWith('Chapter') && // Remove chapter headers
						p.length > 5 // Remove very short fragments
				)
		}

		const originalParagraphs = splitIntoParagraphs(plainText)

		// Try to extract existing AI content first
		const existingBody = chapterData.body
		const aiContent =
			existingBody
				.match(/<p class="ai-text">(.*?)<\/p>/g)
				?.map((p: string) =>
					p
						.replace(/<p class="ai-text">/, '')
						.replace(/<\/p>/, '')
						.trim()
				)
				?.filter(
					(p: string) =>
						p !== '(No AI rewrite available)' &&
						p.length > 5 &&
						!p.startsWith('Chapter')
				) || []

		// If AI is not enabled, return original content
		let formattedResult: string
		if (!useAI) {
			formattedResult = originalParagraphs
				.map((paragraph: string) => `<p>${paragraph.trim()}</p>`)
				.join('\n')
			chapterData.body = formattedResult
			return chapterData
		}

		// If we have existing AI content, use it
		let aiParagraphs: string[]
		if (aiContent.length > 0) {
			aiParagraphs = aiContent
		} else {
			// Only make AI call if AI is enabled and we don't have existing content
			const result = await askAI({
				question: plainText,
				context:
					'Please rewrite the following novel chapter text to enhance its quality while maintaining the original story and meaning.',
			})

			// Split AI result into paragraphs
			aiParagraphs = splitIntoParagraphs(result)
		}

		// Format the result based on compare mode
		if (useAI) {
			// Always include both AI and original content when AI is enabled
			const pairs: string[] = []
			const maxLength = Math.min(originalParagraphs.length, aiParagraphs.length)

			for (let i = 0; i < maxLength; i++) {
				const originalPara = originalParagraphs[i]
				const aiPara = aiParagraphs[i]

				if (originalPara && aiPara) {
					pairs.push(
						`<div class="paragraph-pair">
							<p class="ai-text">${aiPara}</p>
							<p class="original-text" style="color: #808080; font-style: italic; margin-left: 2em; display: ${
								compare ? 'block' : 'none'
							}">${originalPara}</p>
						</div>`
					)
				} else if (originalPara) {
					pairs.push(
						`<div class="paragraph-pair">
							<p class="ai-text">(No AI rewrite available)</p>
							<p class="original-text" style="color: #808080; font-style: italic; margin-left: 2em; display: ${
								compare ? 'block' : 'none'
							}">${originalPara}</p>
						</div>`
					)
				} else if (aiPara) {
					pairs.push(
						`<div class="paragraph-pair">
							<p class="ai-text">${aiPara}</p>
							<p class="original-text" style="color: #808080; font-style: italic; margin-left: 2em; display: ${
								compare ? 'block' : 'none'
							}">(No original text available)</p>
						</div>`
					)
				}
			}

			formattedResult = pairs.join('\n')
		} else {
			// If AI is not enabled, just show original paragraphs
			formattedResult = originalParagraphs
				.map((paragraph: string) => `<p>${paragraph.trim()}</p>`)
				.join('\n')
		}

		chapterData.body = formattedResult
		return chapterData
	} catch (error) {
		console.error('Error reading chapter:', error)
		throw error
	}
}

export const listNovels = async (): Promise<any[]> => {
	try {
		const websites = await fs.readdir(path.join(process.cwd(), basePath))
		const novels = []

		for (const website of websites) {
			if (website.startsWith('.')) continue

			const websitePath = path.join(process.cwd(), basePath, website)
			const stat = await fs.stat(websitePath)

			if (stat.isDirectory()) {
				const novelFolders = await fs.readdir(websitePath)

				for (const novelFolder of novelFolders) {
					if (novelFolder.startsWith('.')) continue

					const novelPath = path.join(websitePath, novelFolder)
					const novelStat = await fs.stat(novelPath)

					if (novelStat.isDirectory()) {
						try {
							const metaPath = path.join(novelPath, 'meta.json')
							const metaContent = await fs.readFile(metaPath, 'utf-8')
							const metadata = JSON.parse(metaContent)

							const coverUrl = `/covers/${website}/${novelFolder}/cover.jpg`

							novels.push({
								id: novelFolder,
								website,
								...metadata.novel,
								cover_url: coverUrl,
							})
						} catch (error) {
							console.error(`Error reading metadata for ${novelFolder}:`, error)
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
