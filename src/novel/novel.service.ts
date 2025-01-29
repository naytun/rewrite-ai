import path from 'path'
import { promises as fs } from 'fs'

import { askAI } from '../orama/orama.service'
import { getAISettings } from '../settings/settings.service'

const basePath = 'Lightnovels'

export const getNovelPath = async (novelId: string): Promise<string> => {
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
					// Skip AI-generated files and only include original chapter files
					if (chapter.endsWith('.json') && !chapter.endsWith('-ai.json')) {
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

// Helper function to preload AI content for a chapter
export const preloadAIContent = async (
	novelId: string,
	volume: string,
	chapter: string
): Promise<void> => {
	try {
		const novelPath = await getNovelPath(novelId)
		const filePath = path.join(novelPath, 'json', volume, `${chapter}.json`)
		const aiFilePath = path.join(
			novelPath,
			'json',
			volume,
			`${chapter}-ai.json`
		)

		// Check if AI content already exists
		try {
			await fs.access(aiFilePath)
			// AI content exists, no need to generate
			return
		} catch {
			// AI content doesn't exist, continue with generation
		}

		// Check if original chapter exists
		try {
			await fs.access(filePath)
		} catch {
			// Original chapter doesn't exist, can't generate AI content
			return
		}

		// Read and parse the chapter file
		const content = await fs.readFile(filePath, 'utf-8')
		const chapterData = JSON.parse(content)
		if (!chapterData || !chapterData.body) {
			return
		}

		const plainText = chapterData.body
			.replace(/<\/p>/g, '\n\n')
			.replace(/<p>/g, '')
			.replace(/<br\s*\/?>/g, '\n')
			.replace(/<[^>]*>/g, '')
			.trim()

		// Generate AI content
		console.log('Preloading AI content for next chapter...')
		const result = await askAI({
			question: plainText,
			context:
				'Please rewrite the following novel chapter text to enhance its quality while maintaining the original story and meaning.',
		})

		// Split AI result into paragraphs
		const splitIntoParagraphs = (text: string): string[] => {
			return text
				.split(/\n\s*\n/)
				.map((p: string) => p.replace(/\s+/g, ' ').trim())
				.filter((p: string) => p.length > 0)
				.filter(
					(p: string) =>
						!p.startsWith('Translator:') &&
						!p.startsWith('Editor:') &&
						!p.startsWith('Chapter') &&
						p.length > 5
				)
		}

		const aiParagraphs = splitIntoParagraphs(result)

		// Check for failed generation
		const hasFailedContent = aiParagraphs.some(
			(p) =>
				p.toLowerCase().includes("i don't have enough information to answer") ||
				p.toLowerCase().includes('could you clarify your question?') ||
				p.toLowerCase().includes("i'm not sure i fully understood it")
		)

		if (hasFailedContent) {
			return
		}

		// Format and save AI content
		const aiHtml = aiParagraphs
			.map((paragraph: string) => `<p>${paragraph.trim()}</p>`)
			.join('\n')

		const aiChapterData = {
			...chapterData,
			body: aiHtml,
			isAIGenerated: true,
			generatedAt: new Date().toISOString(),
		}

		await fs.writeFile(
			aiFilePath,
			JSON.stringify(aiChapterData, null, 2),
			'utf-8'
		)
		console.log('Saved preloaded AI content to file:', aiFilePath)
	} catch (error) {
		console.error('Error preloading AI content:', error)
	}
}

// Helper function to preload the next chapter
const preloadNextChapter = async (
	novelId: string,
	currentChapter: { volume: string; chapter: string },
	chapters: any[]
): Promise<void> => {
	try {
		const currentIndex = chapters.findIndex(
			(ch) =>
				ch.volume === currentChapter.volume &&
				ch.chapter === currentChapter.chapter
		)

		if (currentIndex === -1 || currentIndex === chapters.length - 1) return

		// Get the next chapter
		const nextChapter = chapters[currentIndex + 1]
		await preloadAIContent(novelId, nextChapter.volume, nextChapter.chapter)
	} catch (error) {
		console.error('Error preloading next chapter:', error)
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
		const aiFilePath = path.join(
			novelPath,
			'json',
			volume,
			`${chapter}-ai.json`
		)

		// Get novel metadata for the title
		const metadata = await getNovelMetadata(novelId)
		const novelTitle = metadata.novel.title

		// Check if the chapter file exists
		try {
			await fs.access(filePath)
		} catch (error) {
			console.error(`Chapter file not found: ${filePath}`)
			throw new Error(`Chapter ${chapter} not found in volume ${volume}`)
		}

		// Read and parse the chapter file
		let chapterData
		try {
			const content = await fs.readFile(filePath, 'utf-8')
			chapterData = JSON.parse(content)
			if (!chapterData || !chapterData.body) {
				throw new Error('Invalid chapter data format')
			}
			// Add novel title to chapter data
			chapterData.novel_title = novelTitle
		} catch (error) {
			console.error(`Error reading chapter file: ${filePath}`, error)
			throw new Error(`Failed to read chapter ${chapter} in volume ${volume}`)
		}

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

		// If AI is not enabled, return original content
		let formattedResult: string
		if (!useAI) {
			formattedResult = originalParagraphs
				.map((paragraph: string) => `<p>${paragraph.trim()}</p>`)
				.join('\n')
			chapterData.body = formattedResult
			// Make sure novel title is preserved
			chapterData.novel_title = novelTitle
			return chapterData
		}

		// Try to load existing AI content first
		let aiParagraphs: string[]
		try {
			const aiContent = await fs.readFile(aiFilePath, 'utf-8')
			const aiData = JSON.parse(aiContent)

			// Validate AI data structure
			if (!aiData || !aiData.body) {
				console.error('Invalid AI data format:', aiData)
				throw new Error('Invalid AI data format')
			}

			// Extract paragraphs from HTML body
			const aiHtml = aiData.body
				.replace(/<\/p>/g, '\n\n')
				.replace(/<p>/g, '')
				.replace(/<br\s*\/?>/g, '\n')
				.replace(/<[^>]*>/g, '')
				.trim()

			aiParagraphs = splitIntoParagraphs(aiHtml)

			// Check if the AI content indicates a failed generation
			const hasFailedContent = aiParagraphs.some(
				(p: string) =>
					p
						.toLowerCase()
						.includes("i don't have enough information to answer") ||
					p.toLowerCase().includes('could you clarify your question?') ||
					p.toLowerCase().includes("i'm not sure i fully understood it")
			)

			if (hasFailedContent) {
				console.log(
					'Found failed AI generation, deleting file and regenerating...'
				)
				await fs.unlink(aiFilePath)
				throw new Error('Failed AI generation detected')
			}

			console.log('Using existing AI content from file:', aiFilePath)
		} catch (error: any) {
			if (error.message === 'Invalid AI data format') {
				// If the AI file is corrupted, delete it and regenerate
				try {
					await fs.unlink(aiFilePath)
					console.log('Deleted corrupted AI file:', aiFilePath)
				} catch (unlinkError) {
					// Ignore if file doesn't exist
				}
			}

			// Generate new AI content if file doesn't exist or is invalid
			console.log('Generating new AI content...')
			const result = await askAI({
				question: plainText,
				context:
					'Please rewrite the following novel chapter text to enhance its quality while maintaining the original story and meaning.',
			})

			// Split AI result into paragraphs and check for failed generation
			aiParagraphs = splitIntoParagraphs(result)
			const hasFailedContent = aiParagraphs.some(
				(p) =>
					p
						.toLowerCase()
						.includes(
							"i'm sorry, but i don't have enough information to answer"
						) ||
					p
						.toLowerCase()
						.includes("i'm sorry. could you clarify your question?") ||
					p.toLowerCase().includes("i'm not sure i fully understood it")
			)

			if (hasFailedContent) {
				console.error('AI generation failed with insufficient information')
				// Fall back to original content
				formattedResult = originalParagraphs
					.map((paragraph: string) => `<p>${paragraph.trim()}</p>`)
					.join('\n')
				chapterData.body = formattedResult
				return chapterData
			}

			// Save AI content to file
			try {
				// Format AI paragraphs in the same HTML structure as original
				const aiHtml = aiParagraphs
					.map((paragraph: string) => `<p>${paragraph.trim()}</p>`)
					.join('\n')

				// Create AI chapter data with same structure as original
				const aiChapterData = {
					...chapterData, // Copy all original metadata
					body: aiHtml, // Replace body with AI content
					isAIGenerated: true,
					generatedAt: new Date().toISOString(),
				}

				// Wait for the file to be saved before continuing
				await fs.writeFile(
					aiFilePath,
					JSON.stringify(aiChapterData, null, 2),
					'utf-8'
				)
				console.log('Saved AI content to file:', aiFilePath)

				// Use the AI content for display
				aiParagraphs = splitIntoParagraphs(aiHtml)
			} catch (saveError) {
				console.error('Error saving AI content:', saveError)
				// Fall back to original content if we can't save AI content
				formattedResult = originalParagraphs
					.map((paragraph: string) => `<p>${paragraph.trim()}</p>`)
					.join('\n')
				chapterData.body = formattedResult
				return chapterData
			}
		}

		// Format the result based on compare mode
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
		chapterData.body = formattedResult

		// If AI is enabled, preload the next chapter
		if (useAI) {
			const { chapters } = await listChapters(novelId)
			await preloadNextChapter(novelId, { volume, chapter }, chapters)
		}

		// Make sure novel title is preserved in AI content
		if (useAI && aiParagraphs) {
			chapterData.novel_title = novelTitle
		}

		// Make sure novel title is preserved in the final response
		chapterData.novel_title = novelTitle
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

// Utility function to bulk generate AI content for a range of chapters
export const bulkGenerateAIContent = async (
	novelId: string,
	startChapter?: string,
	endChapter?: string
): Promise<void> => {
	try {
		const { chapters } = await listChapters(novelId)

		let startIndex = 0
		let endIndex = chapters.length

		if (startChapter) {
			const start = chapters.findIndex((ch) => ch.chapter === startChapter)
			if (start !== -1) startIndex = start
		}

		if (endChapter) {
			const end = chapters.findIndex((ch) => ch.chapter === endChapter)
			if (end !== -1) endIndex = end + 1
		}

		const chaptersToProcess = chapters.slice(startIndex, endIndex)
		console.log(
			`Bulk generating AI content for chapters ${startIndex + 1} to ${endIndex}`
		)

		// Process chapters in sequence to avoid overwhelming the AI service
		for (const chapter of chaptersToProcess) {
			try {
				await preloadAIContent(novelId, chapter.volume, chapter.chapter)
				console.log(
					`Generated AI content for chapter ${chapter.chapter} in volume ${chapter.volume}`
				)
			} catch (error) {
				console.error(
					`Error generating AI content for chapter ${chapter.chapter}:`,
					error
				)
				// Continue with next chapter even if one fails
			}
		}

		console.log('Bulk generation completed')
	} catch (error) {
		console.error('Error in bulk generation:', error)
		throw error
	}
}
