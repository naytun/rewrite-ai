import pdfParse from 'pdf-parse'
import { Request, Response } from 'express'
import {
	listChapters as getChapters,
	readChapter as getChapterContent,
	listNovels as getNovels,
	bulkGenerateAIContent as generateAIContent,
	getNovelPath,
	preloadAIContent,
	getGlossary as getNovelGlossary,
	generateGlossary as generateNovelGlossary,
} from './novel.service'
import { getAISettings } from '../settings/settings.service'
import type { Chapter, ChapterNavigation } from '../types/novel'
import * as path from 'path'
import * as fs from 'node:fs/promises'
import multer, { FileFilterCallback } from 'multer'

const generateNavigationButtons = (
	navigation: ChapterNavigation,
	novelId: string,
	useAI: boolean = false
): string => {
	const aiParam = useAI ? '?useAI=true' : ''
	return `
		${
			navigation.prev
				? `<a class="nav-button" href="/api/novel/novels/${encodeURIComponent(
						novelId
				  )}/chapters/${encodeURIComponent(
						navigation.prev.volume
				  )}/${encodeURIComponent(
						navigation.prev.chapter
				  )}${aiParam}" onclick="showLoading(); saveLastChapter('${encodeURIComponent(
						navigation.prev.volume
				  )}', '${encodeURIComponent(
						navigation.prev.chapter
				  )}')" >← Previous</a>`
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
				  )}${aiParam}" onclick="showLoading(); saveLastChapter('${encodeURIComponent(
						navigation.next.volume
				  )}', '${encodeURIComponent(navigation.next.chapter)}')" >Next →</a>`
				: '<span class="nav-button disabled">Next →</span>'
		}`
}

const generateChapterListHtml = (
	chapters: Chapter[],
	currentChapter: Chapter,
	novelId: string,
	useAI: boolean = false
): string => {
	const aiParam = useAI ? '?useAI=true' : ''
	return chapters
		.map((chapter) => {
			const isCurrentChapter =
				chapter.volume === currentChapter.volume &&
				chapter.chapter === currentChapter.chapter
			const chapterClass = isCurrentChapter ? 'current-chapter' : ''
			return `
				<a 
					href="/api/novel/novels/${encodeURIComponent(
						novelId
					)}/chapters/${encodeURIComponent(
				chapter.volume
			)}/${encodeURIComponent(chapter.chapter)}${aiParam}"
					class="chapter-link ${chapterClass}"
					onclick="showLoading(); saveLastChapter('${encodeURIComponent(
						chapter.volume
					)}', '${encodeURIComponent(chapter.chapter)}')"
				>
					${chapter.volume} - Chapter ${chapter.chapter}
				</a>`
		})
		.join('\n')
}

const generateChapterHtml = async (
	chapterData: any,
	navigation: ChapterNavigation,
	allChapters: Chapter[],
	novelId: string,
	useAI: boolean = false
): Promise<any> => {
	try {
		// Read the template file
		const templatePath = path.join(__dirname, 'templates', 'chapter.html')
		let template = await fs.readFile(templatePath, 'utf-8')

		// Generate navigation buttons HTML
		const navButtons = generateNavigationButtons(navigation, novelId, useAI)

		// Generate chapter list HTML
		const chapterListHtml = generateChapterListHtml(
			allChapters,
			navigation.current,
			novelId,
			useAI
		)

		// Replace placeholders in template
		template = template
			.replace(/{{novel_title}}/g, chapterData.novel_title || '')
			.replace(
				/{{chapter_title}}/g,
				`Chapter ${Number(chapterData.chapter) || ''}`
			)
			.replace(/{{volume}}/g, navigation.current.volume || '')
			.replace(/{{chapter_body}}/g, chapterData.body || '')
			.replace(/{{navigation_buttons}}/g, navButtons)
			.replace(/{{chapter_list}}/g, chapterListHtml)
			.replace(/{{novel_id}}/g, novelId)
			.replace(/{{current_volume}}/g, navigation.current.volume || '')
			.replace(/{{current_chapter}}/g, navigation.current.chapter || '')
			.replace(/{{prev_volume}}/g, navigation.prev?.volume || '')
			.replace(/{{prev_chapter}}/g, navigation.prev?.chapter || '')
			.replace(/{{next_volume}}/g, navigation.next?.volume || '')
			.replace(/{{next_chapter}}/g, navigation.next?.chapter || '')

		return { template, content: chapterData.body || '' }
	} catch (error) {
		console.error('Error generating chapter HTML:', error)
		throw error
	}
}

const navigationButtons = (
	navigation?: ChapterNavigation,
	chapters?: Chapter[],
	novelId?: string
): string => {
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

// Configure multer for memory storage
const upload = multer({
	storage: multer.memoryStorage(),
	limits: {
		fileSize: 10 * 1024 * 1024, // 10MB limit
	},
	fileFilter: (
		_req: Request,
		file: Express.Multer.File,
		cb: FileFilterCallback
	) => {
		if (file.mimetype === 'application/pdf') {
			cb(null, true)
		} else {
			cb(null, false)
			cb(new Error('Only PDF files are allowed'))
		}
	},
})

export const getChapterList = async (
	req: Request,
	res: Response
): Promise<any> => {
	try {
		const { novelId } = req.params
		const { title, chapters } = await getChapters(novelId)
		return res.json({ title, chapters })
	} catch (error) {
		console.error('Error listing chapters:', error)
		res.status(500).send('Error listing chapters')
	}
}

export const listChapters = async (
	req: Request,
	res: Response
): Promise<void> => {
	try {
		const { novelId } = req.params
		const { title, chapters } = await getChapters(novelId)
		const aiSettings = await getAISettings()
		const aiEnabled = aiSettings.enabled

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
					.chapter-item.last-read {
						background-color: #93c5fd;
					}
					html.dark .chapter-item.last-read {
						background-color: #1e40af;
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
						font-size: 1.5rem;
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
									.sort((a, b) => parseInt(a.chapter) - parseInt(b.chapter))
									.map(
										(chapter) => `
									<div class="chapter-item" data-volume="${chapter.volume}" data-chapter="${
											chapter.chapter
										}" onclick="openChapter('${encodeURIComponent(
											novelId
										)}', '${encodeURIComponent(
											chapter.volume
										)}', '${encodeURIComponent(chapter.chapter)}')">
										<h3 class="font-semibold">Chapter ${Number(chapter.chapter)}</h3>
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

					async function openChapter(novelId, volume, chapter) {
						showLoading();
						// Save the last opened chapter
						localStorage.setItem(\`lastChapter_\${novelId}\`, chapter);
						localStorage.setItem(\`lastVolume_\${novelId}\`, volume);
						
						try {
							// Get AI settings
							const response = await fetch('/api/settings/ai-rewrite', {
								headers: {
									'Accept': 'application/json'
								}
							});
							
							if (response.ok) {
								const { enabled } = await response.json();
								// Navigate to the chapter with AI parameter if enabled
								const aiParam = enabled ? '?useAI=true' : '';
								window.location.href = \`/api/novel/novels/\${novelId}/chapters/\${volume}/\${chapter}\${aiParam}\`;
							} else {
								// Fallback to no AI if settings can't be fetched
								window.location.href = \`/api/novel/novels/\${novelId}/chapters/\${volume}/\${chapter}\`;
							}
						} catch (error) {
							console.error('Error checking AI settings:', error);
							// Fallback to no AI if there's an error
							window.location.href = \`/api/novel/novels/\${novelId}/chapters/\${volume}/\${chapter}\`;
						}
					}

					// Highlight the last opened chapter if any
					document.addEventListener('DOMContentLoaded', () => {
						const novelId = '${novelId}';
						const lastChapter = localStorage.getItem(\`lastChapter_\${novelId}\`);
						const lastVolume = localStorage.getItem(\`lastVolume_\${novelId}\`);
						
						if (lastChapter && lastVolume) {
							const chapterItems = document.querySelectorAll('.chapter-item');
							chapterItems.forEach(item => {
								if (item.dataset.chapter === lastChapter && 
									item.dataset.volume === lastVolume) {
									item.classList.add('last-read');
									item.scrollIntoView({ behavior: 'smooth', block: 'center' });
								}
							});
						}
					});
				</script>
			</body>
			</html>
		`

		res.send(html)
	} catch (error) {
		res.status(500).send('Error loading chapters')
	}
}

export const readChapterAI = async (
	req: Request,
	res: Response
): Promise<void> => {
	try {
		const { novelId, volume, chapter } = req.params
		const plainText = req.query.plainText === 'true' || false
		const useAI = true
		const compare = false

		// Add cache control headers
		res.setHeader(
			'Cache-Control',
			'no-store, no-cache, must-revalidate, proxy-revalidate'
		)
		res.setHeader('Pragma', 'no-cache')
		res.setHeader('Expires', '0')
		res.setHeader('Content-Type', 'text/html; charset=utf-8')

		// Get current settings
		console.log('AI: Reading chapter with settings:', {
			useAI,
			compare,
			volume,
			chapter,
		})

		// Get chapter content based on AI setting
		const chapterData = await getChapterContent(
			novelId,
			volume,
			chapter,
			useAI,
			compare
		)
		if (!chapterData) {
			console.error('AI: No chapter data returned')
			throw new Error('AI: Failed to get chapter content')
		}

		console.log('AI: Chapter data received:', {
			hasBody: !!chapterData.body,
			noAIContent: !!chapterData.noAIContent,
			useAI,
		})

		console.log('AI: AI mode is active, checking content...')
		if (chapterData.noAIContent) {
			console.log('No AI content available, showing message')
			chapterData.showNoAIContent = true
			delete chapterData.noAIContent
			// Hide the original content when showing "No AI Content" message
			chapterData.body = ''
		} else {
			console.log('AI: AI content available, showing content')
			chapterData.showNoAIContent = false
		}

		console.log('AI: Final chapter data state:', {
			showNoAIContent: chapterData.showNoAIContent,
			hasBody: !!chapterData.body,
		})

		// Clean up chapter content
		if (chapterData.body) {
			chapterData.body = chapterData.body
				.replace(/<h[1-6]>.*?<\/h[1-6]>\s*/gi, '')
				.replace(/<p>Chapter\s+\d+[:\s].*?<\/p>\s*/gi, '')
				.replace(
					/<p>[\s\n]*(?:Translator|TL|Translation|Translated by)[^<]*<\/p>\s*/gi,
					''
				)
				.replace(
					/<p>[\s\n]*(?:Editor|ED|Edited|Edited by|Editor:|ED:)[^<]*<\/p>\s*/gi,
					''
				)
				.replace(/<p>[\s\n]*(?:PR|Proofread|Proofreader)[^<]*<\/p>\s*/gi, '')
				.replace(/<p>[\s\n]*(?:QC|Quality Check)[^<]*<\/p>\s*/gi, '')
				.replace(/<p>[\s\n]*(?:Note|N\/A|TN)[^<]*<\/p>\s*/gi, '')
				.replace(/<p>[\s\n]*(?:Raw|Source)[^<]*<\/p>\s*/gi, '')
				.replace(/<p>\s*\*+\s*<\/p>\s*/gi, '')
				.replace(/<p>\s*-+\s*<\/p>\s*/gi, '')
				.replace(/(<p>\s*<\/p>\s*){2,}/gi, '<p></p>')
				.replace(
					/<p>[^<]*(?:Editor|ED|Edited by|Translator|TL):.*?<\/p>\s*/gi,
					''
				)
				.replace(
					/<p>[^<]*(?:Editor|ED|Edited by|Translator|TL)\s*[:-].*?<\/p>\s*/gi,
					''
				)
				.replace(
					/<p><strong>(?:Editor|ED|Edited by|Translator|TL):?<\/strong>.*?<\/p>\s*/gi,
					''
				)
		}

		// Remove all HTML tags from the body
		const plainTextBody = chapterData.body
			.replace(/<\/p>/g, '\n')
			.replace(/<.*?>/g, '')

		// Get chapters for navigation
		const { chapters } = await getChapters(novelId)
		console.log('AI: Got chapters list, total chapters:', chapters.length)

		res.send(plainText ? plainTextBody : chapterData.body)
	} catch (error: unknown) {
		console.error('Error in readChapter:', error)
		const errorMessage =
			error instanceof Error ? error.message : 'Unknown error'
		res
			.status(500)
			.send(`<html><body><h1>Error</h1><p>${errorMessage}</p></body></html>`)
	}
}

export const readChapter = async (
	req: Request,
	res: Response
): Promise<void> => {
	try {
		const { novelId, volume, chapter } = req.params
		const plainText = req.query.plainText === 'true' || false
		const compare = req.query.compare === 'true' || false
		const useAI = req.query.useAI === 'true' || false

		// Add cache control headers
		res.setHeader(
			'Cache-Control',
			'no-store, no-cache, must-revalidate, proxy-revalidate'
		)
		res.setHeader('Pragma', 'no-cache')
		res.setHeader('Expires', '0')
		res.setHeader('Content-Type', 'text/html; charset=utf-8')

		// Get current AI settings
		console.log('Reading chapter with settings:', {
			useAI,
			compare,
			volume,
			chapter,
		})

		// Get chapter content based on AI setting
		const chapterData = await getChapterContent(
			novelId,
			volume,
			chapter,
			useAI,
			compare
		)
		if (!chapterData) {
			console.error('No chapter data returned')
			throw new Error('Failed to get chapter content')
		}

		console.log('Chapter data received:', {
			hasBody: !!chapterData.body,
			noAIContent: !!chapterData.noAIContent,
			useAI,
		})

		// Handle AI content visibility:
		if (useAI) {
			console.log('AI mode is active, checking content...')
			if (chapterData.noAIContent) {
				console.log('No AI content available, showing message')
				chapterData.showNoAIContent = true
				delete chapterData.noAIContent
				// Hide the original content when showing "No AI Content" message
				chapterData.body = ''
			} else {
				console.log('AI content available, showing content')
				chapterData.showNoAIContent = false
			}
		} else {
			console.log('AI mode is not active, showing original content')
			chapterData.showNoAIContent = false
			// If we had saved the original body, restore it
			if (chapterData.originalBody) {
				chapterData.body = chapterData.originalBody
				delete chapterData.originalBody
			}
		}

		console.log('Final chapter data state:', {
			showNoAIContent: chapterData.showNoAIContent,
			hasBody: !!chapterData.body,
		})

		// Clean up chapter content
		if (chapterData.body) {
			chapterData.body = chapterData.body
				.replace(/<h[1-6]>.*?<\/h[1-6]>\s*/gi, '')
				.replace(/<p>Chapter\s+\d+[:\s].*?<\/p>\s*/gi, '')
				.replace(
					/<p>[\s\n]*(?:Translator|TL|Translation|Translated by)[^<]*<\/p>\s*/gi,
					''
				)
				.replace(
					/<p>[\s\n]*(?:Editor|ED|Edited|Edited by|Editor:|ED:)[^<]*<\/p>\s*/gi,
					''
				)
				.replace(/<p>[\s\n]*(?:PR|Proofread|Proofreader)[^<]*<\/p>\s*/gi, '')
				.replace(/<p>[\s\n]*(?:QC|Quality Check)[^<]*<\/p>\s*/gi, '')
				.replace(/<p>[\s\n]*(?:Note|N\/A|TN)[^<]*<\/p>\s*/gi, '')
				.replace(/<p>[\s\n]*(?:Raw|Source)[^<]*<\/p>\s*/gi, '')
				.replace(/<p>\s*\*+\s*<\/p>\s*/gi, '')
				.replace(/<p>\s*-+\s*<\/p>\s*/gi, '')
				.replace(/(<p>\s*<\/p>\s*){2,}/gi, '<p></p>')
				.replace(
					/<p>[^<]*(?:Editor|ED|Edited by|Translator|TL):.*?<\/p>\s*/gi,
					''
				)
				.replace(
					/<p>[^<]*(?:Editor|ED|Edited by|Translator|TL)\s*[:-].*?<\/p>\s*/gi,
					''
				)
				.replace(
					/<p><strong>(?:Editor|ED|Edited by|Translator|TL):?<\/strong>.*?<\/p>\s*/gi,
					''
				)
		}

		// Remove all HTML tags from the body
		const plainTextBody = chapterData.body
			.replace(/<\/p>/g, '\n\n')
			.replace(/<.*?>/g, '')

		// Get chapters for navigation
		const { chapters } = await getChapters(novelId)
		console.log('Got chapters list, total chapters:', chapters.length)

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

		// Generate and send HTML
		const html = await generateChapterHtml(
			{
				...chapterData,
				chapter: chapter,
			},
			navigation,
			allChapters,
			novelId,
			useAI
		)

		res.send(plainText ? plainTextBody : html.template)
	} catch (error: unknown) {
		console.error('Error in readChapter:', error)
		const errorMessage =
			error instanceof Error ? error.message : 'Unknown error'
		res
			.status(500)
			.send(`<html><body><h1>Error</h1><p>${errorMessage}</p></body></html>`)
	}
}

export const listNovels = async (req: Request, res: Response) => {
	try {
		const novels = await getNovels()
		res.json(novels)
	} catch (error) {
		console.error('Error listing novels:', error)
		res.status(500).json({ error: 'Failed to list novels' })
	}
}

export const bulkGenerateAIContent = async (
	req: Request,
	res: Response
): Promise<void> => {
	try {
		const { novelId } = req.params
		const { startChapter, endChapter } = req.query

		await generateAIContent(
			novelId,
			startChapter as string | undefined,
			endChapter as string | undefined
		)

		res.json({ message: 'Bulk generation started successfully' })
	} catch (error) {
		console.error('Error in bulk generation endpoint:', error)
		res.status(500).json({ error: 'Failed to start bulk generation' })
	}
}

export const regenerateChapter = async (
	req: Request,
	res: Response
): Promise<void> => {
	try {
		const { novelId, volume, chapter } = req.params

		try {
			// Get the novel path
			const novelPath = await getNovelPath(novelId)
			const aiFilePath = path.join(
				novelPath,
				'json',
				volume,
				`${chapter}-ai.json`
			)

			// Delete existing AI file if it exists
			try {
				await fs.unlink(aiFilePath)
				console.log('Deleted existing AI file')
			} catch (error) {
				console.log('No existing AI file to delete')
			}

			// Generate new AI content
			await preloadAIContent(novelId, volume, chapter)
			console.log('Generated new AI content')

			// Read the regenerated content
			const aiContent = await fs.readFile(aiFilePath, 'utf-8')
			const regeneratedData = JSON.parse(aiContent)

			// Preload the next chapter
			try {
				console.log('Attempting to preload next chapter...')
				const { chapters } = await getChapters(novelId)
				const currentIndex = chapters.findIndex(
					(ch) => ch.volume === volume && ch.chapter === chapter
				)

				if (currentIndex !== -1 && currentIndex < chapters.length - 1) {
					const nextChapter = chapters[currentIndex + 1]
					await preloadAIContent(
						novelId,
						nextChapter.volume,
						nextChapter.chapter
					)
					console.log('Successfully preloaded next chapter')
				} else {
					console.log('No next chapter to preload')
				}
			} catch (error: any) {
				console.error('Error preloading next chapter:', error)
			}

			console.log('Chapter regeneration completed successfully')
			res.json({ success: true, data: regeneratedData })
		} catch (error: any) {
			console.error('Error during regeneration process:', error)
			res.status(500).json({
				error: 'Failed to regenerate chapter',
				details: error.message || 'Unknown error',
			})
		}
	} catch (error: any) {
		console.error('Unexpected error in regenerateChapter:', error)
		res.status(500).json({
			error: 'An unexpected error occurred',
			details: error.message || 'Unknown error',
		})
	}
}

// Helper function to get novel metadata
const getNovelMetadata = async (novelId: string): Promise<any> => {
	const novelPath = await getNovelPath(novelId)
	const metaPath = path.join(novelPath, 'meta.json')
	const metaContent = await fs.readFile(metaPath, 'utf-8')
	return JSON.parse(metaContent)
}

export const checkAIContentExists = async (
	req: Request,
	res: Response
): Promise<void> => {
	try {
		const { novelId, volume, chapter } = req.params
		const { useAI } = req.query
		console.log('Checking AI content existence:', { chapter, useAI })

		const novelPath = await getNovelPath(novelId)
		console.log('Novel path:', novelPath)

		const aiFilePath = path.join(
			novelPath,
			'json',
			volume,
			useAI ? `${chapter}-ai.json` : `${chapter}.json`
		)
		console.log('File path:', aiFilePath)

		try {
			await fs.access(aiFilePath)
			if (useAI) {
				const aiContent = await fs.readFile(aiFilePath, 'utf-8')
				const aiData = JSON.parse(aiContent)
				// Validate AI data structure
				const exists = !!(aiData && aiData.body && aiData.isAIGenerated)
				res.json({ exists })
			} else {
				res.json({ exists: true })
			}
		} catch (error) {
			res.json({ exists: false })
		}
	} catch (error) {
		console.error('Error checking AI content existence:', error)
		res.status(500).json({ error: 'Failed to check AI content existence' })
	}
}

export const getAllChaptersContent = async (
	req: Request,
	res: Response
): Promise<void> => {
	try {
		const { novelId } = req.params
		const novelPath = await getNovelPath(novelId)
		const jsonPath = path.join(novelPath, 'json')
		const volumes = await fs.readdir(jsonPath)

		const allChapters = []

		for (const volume of volumes) {
			const volumePath = path.join(jsonPath, volume)
			const chapters = await fs.readdir(volumePath)

			for (const chapter of chapters) {
				const chapterPath = path.join(volumePath, chapter)
				const chapterContent = await fs.readFile(chapterPath, 'utf-8')
				const chapterData = JSON.parse(chapterContent)
				allChapters.push({
					volume,
					chapter: chapter.replace('.json', ''),
					...chapterData,
				})
			}
		}

		res.json(allChapters)
	} catch (error) {
		console.error('Error getting all chapters:', error)
		res.status(500).json({ error: 'Failed to get all chapters content' })
	}
}

export const getGlossary = async (
	req: Request,
	res: Response
): Promise<void> => {
	const { novelId } = req.params
	console.log('Controller: Getting glossary for novel:', novelId)

	try {
		const glossary = await getNovelGlossary(novelId)
		console.log(
			'Controller: Glossary retrieved:',
			glossary ? 'found' : 'not found'
		)
		res.status(200).json(glossary || { terms: [], lastUpdated: null })
	} catch (error) {
		console.error('Controller: Error getting glossary:', error)
		res.status(500).json({ error: 'Failed to get glossary' })
	}
}

export const generateGlossary = async (
	req: Request,
	res: Response
): Promise<void> => {
	const { novelId } = req.params
	console.log('Controller: Starting glossary generation for novel:', novelId)

	try {
		// Check if novel exists
		const novelPath = await getNovelPath(novelId)
		if (!novelPath) {
			console.error('Controller: Novel not found:', novelId)
			res.status(404).json({
				error: 'Novel not found',
				details: `Novel with ID ${novelId} does not exist`,
			})
			return
		}

		console.log('Controller: Calling generateNovelGlossary service')
		const glossary = await generateNovelGlossary(novelId)
		console.log(
			'Controller: Glossary generated successfully, terms count:',
			glossary.terms.length
		)
		res.json(glossary)
	} catch (error: any) {
		console.error('Controller: Error generating glossary:', error)
		const statusCode = error.message?.includes('Novel not found') ? 404 : 500
		res.status(statusCode).json({
			error: 'Failed to generate glossary',
			details: error instanceof Error ? error.message : 'Unknown error',
		})
	}
}

// Function to extract text from PDF using pdf-parse
export const parsePDF = async (req: Request, res: Response): Promise<void> => {
	try {
		console.log('㏒  ~ [parsePDF] START:')
		const file = req.file as Express.Multer.File | undefined
		if (!file) {
			console.error('㏒  ~ [parsePDF] No file uploaded!')
			res.status(400).json({ error: 'No file uploaded' })
			return
		}

		const fileBuffer = file.buffer
		const data = await pdfParse(fileBuffer)

		res.json({
			success: true,
			text: data.text,
		})
	} catch (error) {
		console.error('Error parsing PDF:', error)
		res.status(500).json({
			success: false,
			error: 'Failed to parse PDF file',
		})
	}
}

// Export multer middleware for use in routes
export const uploadPDF = upload.single('file')
