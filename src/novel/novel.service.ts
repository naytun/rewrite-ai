import * as path from 'path'
import * as fs from 'node:fs/promises'

import { askAI } from '../orama/orama.service'
import { getAISettings } from '../settings/settings.service'
import { Novel } from '../types/novel'
const basePath = 'Lightnovels'

interface GlossaryTerm {
	term: string
	description: string
	type?: 'person' | 'location' | 'item' | 'technique' | 'organization' | 'other'
}

interface Glossary {
	terms: GlossaryTerm[]
	lastUpdated: string
}

export const getNovelPath = async (novelId: string): Promise<string> => {
	const websites = await fs.readdir(path.join(process.cwd(), basePath))

	for (const website of websites) {
		if (website.startsWith('.')) continue

		const websitePath = path.join(process.cwd(), basePath, website)
		const stat = await fs.stat(websitePath)

		if (stat.isDirectory()) {
			const novelFolders = await fs.readdir(websitePath)

			// First try exact match
			if (novelFolders.includes(novelId)) {
				return path.join(websitePath, novelId)
			}

			// If no exact match, try case-insensitive match
			const matchingFolder = novelFolders.find(
				(folder) => folder.toLowerCase() === novelId.toLowerCase()
			)
			if (matchingFolder) {
				return path.join(websitePath, matchingFolder)
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
		console.log('Starting AI content generation for:', {
			novelId,
			volume,
			chapter,
		})
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
			console.log('AI content already exists:', aiFilePath)
			// AI content exists, no need to generate
			return
		} catch {
			console.log('No existing AI content found, will generate new content')
		}

		// Check if original chapter exists
		try {
			await fs.access(filePath)
		} catch (error) {
			console.error('Original chapter file not found:', filePath)
			return
		}

		// Read and parse the chapter file
		let chapterData
		try {
			const content = await fs.readFile(filePath, 'utf-8')
			chapterData = JSON.parse(content)
			if (!chapterData || !chapterData.body) {
				console.error('Invalid chapter data format:', chapterData)
				return
			}
		} catch (error) {
			console.error('Error reading/parsing chapter file:', error)
			return
		}

		const plainText = chapterData.body
			.replace(/<\/p>/g, '\n\n')
			.replace(/<p>/g, '')
			.replace(/<br\s*\/?>/g, '\n')
			.replace(/<[^>]*>/g, '')
			.trim()

		// Generate AI content
		console.log('Calling AI service for content generation...')
		let result
		try {
			result = await askAI({
				question: plainText,
				context:
					'Please rewrite the following novel chapter text to enhance its quality while maintaining the original story and meaning.',
			})
			console.log('AI content generation successful, length:', result.length)
		} catch (error) {
			console.error('Error during AI content generation:', error)
			throw error
		}

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
		console.log('Processed AI paragraphs count:', aiParagraphs.length)

		// Check for failed generation
		const hasFailedContent = aiParagraphs.some(
			(p) =>
				p.toLowerCase().includes("i don't have enough information to answer") ||
				p.toLowerCase().includes('could you clarify your question?') ||
				p.toLowerCase().includes("i'm not sure i fully understood it")
		)

		if (hasFailedContent) {
			console.error(
				'AI generation produced invalid content:\n' +
					aiParagraphs.join('\n')
			)
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

		try {
			await fs.writeFile(
				aiFilePath,
				JSON.stringify(aiChapterData, null, 2),
				'utf-8'
			)
			console.log('Successfully saved AI content to:', aiFilePath)
		} catch (error) {
			console.error('Error saving AI content to file:', error)
			throw error
		}
	} catch (error) {
		console.error('Error in preloadAIContent:', error)
		throw error // Re-throw to ensure the error is properly propagated
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

			// Remove chapter title from body (both h1 and first p tag containing chapter title)
			chapterData.body = chapterData.body
				.replace(/<h[1-6]>.*?<\/h[1-6]>\s*/i, '') // Remove h1-h6 tags
				.replace(/<p>Chapter\s+\d+[:\s].*?<\/p>\s*/i, '') // Remove chapter title paragraph
				.replace(/<p><strong>Translator:<\/strong>.*?<\/p>\s*/i, '') // Remove translator line
		} catch (error) {
			console.error(`Error reading chapter file: ${filePath}`, error)
			throw new Error(`Failed to read chapter ${chapter} in volume ${volume}`)
		}

		// Get current AI settings
		const aiSettings = await getAISettings()

		// If AI is not enabled, return original content
		if (!useAI) {
			return chapterData
		}

		// If AI is enabled, check if AI content exists
		let aiData = null
		try {
			const aiContent = await fs.readFile(aiFilePath, 'utf-8')
			aiData = JSON.parse(aiContent)
			// Validate AI data structure
			if (!aiData || !aiData.body || !aiData.isAIGenerated) {
				console.log('Invalid AI data format')
				aiData = null
			}
		} catch (error: any) {
			console.log('No AI content found:', error.message)
		}

		// If no valid AI content exists, return original content with a flag
		if (!aiData) {
			console.log(
				'No valid AI content found, returning original with noAIContent flag'
			)
			return {
				...chapterData,
				noAIContent: true,
			}
		}

		// At this point we should have valid AI content
		if (aiData && aiData.body) {
			console.log('Valid AI content found, using AI content')
			if (compare) {
				// Split both contents into paragraphs
				const splitParagraphs = (html: string): string[] => {
					return html
						.split('</p>')
						.map((p) => p.trim())
						.filter((p) => p.startsWith('<p>'))
						.map((p) => p + '</p>')
				}

				const originalParagraphs = splitParagraphs(chapterData.body)
				const aiParagraphs = splitParagraphs(aiData.body)

				// Create pairs of paragraphs
				const pairs: string[] = []
				const maxLength = Math.max(
					originalParagraphs.length,
					aiParagraphs.length
				)

				for (let i = 0; i < maxLength; i++) {
					const originalPara =
						originalParagraphs[i] || '<p>(No original content)</p>'
					const aiPara = aiParagraphs[i] || '<p>(No AI content)</p>'

					pairs.push(`
						<div class="paragraph-pair" style="margin-bottom: 1em;">
							<div class="ai-text" style="margin-bottom: 0.5em;">${aiPara}</div>
							<div class="original-text" style="color: #808080; font-style: italic; padding-left: 1em; border-left: 2px solid #ddd;">${originalPara}</div>
						</div>
					`)
				}

				// Wrap all pairs in a container
				chapterData.body = `
					<div class="compare-container" style="display: flex; flex-direction: column; gap: 1em;">
						${pairs.join('')}
					</div>`
			} else {
				// Just use AI content
				chapterData.body = aiData.body
			}
		}

		return chapterData
	} catch (error) {
		console.error('Error in readChapter:', error)
		throw error
	}
}

export const listNovels = async (): Promise<Novel[]> => {
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

							// const coverUrl = `/covers/${website}/${novelFolder}/cover.jpg`

							novels.push({
								id: novelFolder,
								website,
								...metadata.novel,
								cover_url: metadata.novel.cover_url,
							})
						} catch (error) {
							console.error(`Error reading metadata for ${novelFolder}:`, error)
						}
					}
				}
			}
		}

		return novels as Novel[]
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

export const generateGlossary = async (novelId: string): Promise<Glossary> => {
	try {
		const novelPath = await getNovelPath(novelId)
		const volumes = await fs.readdir(path.join(novelPath, 'json'))

		// Get novel metadata for title
		const metadata = await getNovelMetadata(novelId)
		const novelTitle = metadata.novel.title

		// Collect all chapter content
		let allContent = ''
		for (const volume of volumes) {
			const volumePath = path.join(novelPath, 'json', volume)
			const stat = await fs.stat(volumePath)

			if (stat.isDirectory()) {
				console.log('Processing volume:', volume)
				const chapters = await fs.readdir(volumePath)
				for (const chapter of chapters) {
					if (chapter.endsWith('.json') && !chapter.endsWith('-ai.json')) {
						const chapterPath = path.join(volumePath, chapter)
						try {
							const content = await fs.readFile(chapterPath, 'utf-8')
							const chapterData = JSON.parse(content)
							if (chapterData.body) {
								// Clean HTML content
								const cleanContent = chapterData.body
									.replace(/<\/p>/g, '\n')
									.replace(/<p>/g, '')
									.replace(/<br\s*\/?>/g, '\n')
									.replace(/<[^>]*>/g, '')
									.trim()
								allContent += cleanContent + '\n\n'
							}
						} catch (error) {
							console.error('Error processing chapter:', chapterPath, error)
							continue
						}
					}
				}
			}
		}

		if (allContent.length === 0) {
			throw new Error('No content found in the novel')
		}

		console.log('Total novel content length:', allContent.length)

		// Process content in chunks
		const CHUNK_SIZE = 500_000
		const chunks = []
		for (let i = 0; i < allContent.length; i += CHUNK_SIZE) {
			chunks.push(allContent.slice(i, i + CHUNK_SIZE))
		}
		console.log(`Split content into ${chunks.length} chunks`)

		// Base prompt template
		const promptTemplate = `You are a glossary generator for the novel "${novelTitle}". Create a glossary with terms and descriptions from the provided chunk of the novel content.

For each important term you find in THIS CHUNK, create an entry with:
1. The term name (exactly as it appears in the novel)
2. A concise description (2-3 sentences max)
3. The term type (must be one of: person, location, item, technique, organization, or other)

Focus on extracting:
- Main and supporting characters (type: person)
- Important locations and their significance (type: location)
- Special items, weapons, or artifacts (type: item)
- Special techniques or skills (type: technique)
- Organizations, groups, or factions (type: organization)
- Other significant terms specific to the story's world (type: other)

Format your response EXACTLY as a JSON array of objects with these properties:
[
  {
    "term": "Term name",
    "description": "Brief description",
    "type": "person/location/item/technique/organization/other"
  }
]

Important:
- Extract ONLY terms that actually appear in THIS CHUNK of content
- ALWAYS return valid JSON format
- If you can't find any terms in this chunk, return an empty array []
- NEVER return an error message or non-JSON response`

		// Process each chunk and collect terms
		let allTerms: GlossaryTerm[] = []
		for (let i = 0; i < chunks.length; i++) {
			console.log(`Processing chunk ${i + 1} of ${chunks.length}`)
			const chunk = chunks[i]

			try {
				const aiResponse = await askAI({
					question: promptTemplate,
					context: chunk,
				})

				if (aiResponse.startsWith('[') && aiResponse.endsWith(']')) {
					const chunkTerms: GlossaryTerm[] = JSON.parse(aiResponse).map(
						(term: any) => ({
							term: term.term,
							description: term.description,
							type: term.type || 'other',
						})
					)
					allTerms = allTerms.concat(chunkTerms)
					console.log(
						`Extracted ${chunkTerms.length} terms from chunk ${i + 1}`
					)
				} else {
					console.error(
						`Invalid AI response format for chunk ${i + 1}:`,
						aiResponse?.length
					)
				}
			} catch (error) {
				console.error(`Error processing chunk ${i + 1}:`, error)
				// Continue with next chunk even if one fails
			}
		}

		// Remove duplicates by term name (case-insensitive)
		// If duplicates exist, keep the one with the longer description
		const uniqueTerms = Object.values(
			allTerms.reduce((acc: { [key: string]: GlossaryTerm }, term) => {
				const key = term.term.toLowerCase()
				if (
					!acc[key] ||
					acc[key].description.length < term.description.length
				) {
					acc[key] = term
				}
				return acc
			}, {})
		)

		console.log(`Final unique terms count: ${uniqueTerms.length}`)

		if (uniqueTerms.length === 0) {
			throw new Error('No terms were extracted from the novel content')
		}

		// Sort terms alphabetically
		uniqueTerms.sort((a, b) => a.term.localeCompare(b.term))

		// Create glossary object with lastUpdated timestamp
		const glossary: Glossary = {
			terms: uniqueTerms,
			lastUpdated: new Date().toISOString(),
		}

		// Save the glossary to a file
		const glossaryPath = path.join(novelPath, 'glossary.json')
		await fs.writeFile(glossaryPath, JSON.stringify(glossary, null, 2))

		return glossary
	} catch (error) {
		console.error('Error generating glossary:', error)
		throw error
	}
}

export const getGlossary = async (
	novelId: string
): Promise<Glossary | null> => {
	try {
		const novelPath = await getNovelPath(novelId)
		const glossaryPath = path.join(novelPath, 'glossary.json')

		try {
			const content = await fs.readFile(glossaryPath, 'utf-8')
			return JSON.parse(content)
		} catch (error) {
			// If file doesn't exist or can't be read, return null
			return null
		}
	} catch (error) {
		console.error('Error reading glossary:', error)
		throw error
	}
}
