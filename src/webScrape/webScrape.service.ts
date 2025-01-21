import { Scraper, Root, OpenPattern, DownloadContent } from 'nodejs-web-scraper'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import axios from 'axios'
import * as cheerio from 'cheerio'

interface NovelContent {
	title: string
	content: string[]
}

export async function scrapeNovelContent(url: string): Promise<NovelContent> {
	// Ensure the URL is from novelfull.com
	if (!url.includes('novelfull.com')) {
		throw new Error('Only novelfull.com URLs are supported')
	}

	// Create temp directory in the OS temp directory
	const tempDir = path.join(os.tmpdir(), 'novel-scraper-' + Date.now())
	if (!fs.existsSync(tempDir)) {
		fs.mkdirSync(tempDir, { recursive: true })
	}

	const titlePath = path.join(tempDir, 'title.txt')
	const contentPath = path.join(tempDir, 'content.txt')
	const logPath = path.join(tempDir, 'scraper.log')

	const config = {
		baseSiteUrl: 'https://novelfull.com',
		startUrl: url,
		concurrency: 1,
		maxRetries: 5,
		delay: 5000,
		timeout: 60000,
		headers: {
			'User-Agent':
				'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
			Accept:
				'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
			'Accept-Language': 'en-US,en;q=0.5',
		},
		logPath,
		// Add HTML content extraction
		downloadContent: true,
		saveContent: true,
	}

	console.log('Starting scrape with URL:', url)

	// Initialize scraper
	const scraper = new Scraper(config)
	const root = new Root()

	// Define content selectors - using more specific selectors
	const titleOp = new DownloadContent(
		'h1.chapter-title, .chapter-title, .chr-title, .chapter-text',
		{
			name: 'title',
			filePath: titlePath,
		}
	)

	const contentOp = new DownloadContent(
		'.chapter-c, #chapter-content, .chapter-content, #chr-content',
		{
			name: 'content',
			filePath: contentPath,
		}
	)

	// Add selectors to root
	root.addOperation(titleOp)
	root.addOperation(contentOp)

	try {
		// Start scraping
		console.log('Starting scrape operation with selectors:')
		console.log(
			'Title selectors:',
			'h1.chapter-title, .chapter-title, .chr-title, .chapter-text'
		)
		console.log(
			'Content selectors:',
			'.chapter-c, #chapter-content, .chapter-content, #chr-content'
		)

		// Add a small delay before scraping to ensure page loads
		await new Promise((resolve) => setTimeout(resolve, 3000))

		await scraper.scrape(root)
		console.log('Scrape operation completed')

		// Get results
		let titleData = titleOp.getData()
		let contentData = contentOp.getData()

		// Enhanced debugging for content data
		console.log('Debug - Content Operation:', {
			hasData: !!contentData,
			dataType: typeof contentData,
			isArray: Array.isArray(contentData),
			rawData: contentData,
		})

		// Try to read the temp files directly to verify data was saved
		try {
			console.log('Checking temp files:')
			if (fs.existsSync(titlePath)) {
				try {
					const rawTitle = fs.readFileSync(titlePath, 'utf8')
					console.log('Title file contents:', rawTitle)

					// If getData() failed but file exists, use file content
					if (
						!titleData ||
						!Array.isArray(titleData) ||
						titleData.length === 0
					) {
						titleData = [rawTitle]
					}
				} catch (readError: any) {
					console.error('Error reading title file:', readError?.message)
				}
			}

			if (fs.existsSync(contentPath)) {
				try {
					const rawContent = fs.readFileSync(contentPath, 'utf8')
					console.log('Content file preview:', rawContent.substring(0, 200))

					// If getData() failed but file exists, use file content
					if (
						!contentData ||
						!Array.isArray(contentData) ||
						contentData.length === 0
					) {
						contentData = rawContent.split('\n').filter((line) => line.trim())
					}
				} catch (readError: any) {
					console.error('Error reading content file:', readError?.message)
				}
			}
		} catch (fileError: any) {
			console.error('Error accessing temp files:', fileError?.message)
		}

		// Check if we got any data at all after trying both methods
		if (
			!titleData ||
			!contentData ||
			!Array.isArray(titleData) ||
			!Array.isArray(contentData) ||
			(titleData.length === 0 && contentData.length === 0)
		) {
			console.error('No data returned from scraper or files')
			console.error('Title data:', titleData)
			console.error('Content data:', contentData)

			// Check if files were created
			const filesExist = {
				title: fs.existsSync(titlePath),
				content: fs.existsSync(contentPath),
				log: fs.existsSync(logPath),
			}
			console.error('Files exist check:', filesExist)

			// If log file exists, read it for debugging
			if (filesExist.log) {
				try {
					const logContent = fs.readFileSync(logPath, 'utf8')
					console.error('Scraper log content:', logContent)
				} catch (logError: any) {
					console.error('Error reading log file:', logError?.message)
				}
			}

			throw new Error('No valid content found after processing')
		}

		console.log('Raw title data:', titleData)
		console.log('Raw content data length:===', contentData?.length || 'N/A')
		console.log('Raw content data type:', typeof contentData)

		// Extract title from URL if not found
		const titleText =
			titleData.length > 0
				? (titleData[0] as string).trim()
				: url.split('/').pop()?.replace(/-/g, ' ') || 'Unknown Title'

		// Process content data
		const contentText = Array.isArray(contentData)
			? contentData
					.filter((text) => {
						const isString = typeof text === 'string'
						if (!isString) console.log('Filtered out non-string item:', text)
						return isString
					})
					.map((text) => {
						const trimmed = (text as string).trim()
						if (text !== trimmed)
							console.log('Trimmed text from:', text, 'to:', trimmed)
						return trimmed
					})
					.filter((text) => {
						const isValid =
							text.length > 0 &&
							!text.includes('iframe') &&
							!text.includes('ads') &&
							!text.includes('script') &&
							!text.includes('Advertisement') &&
							!text.includes('Tip:')
						if (!isValid) console.log('Filtered out invalid content:', text)
						return isValid
					})
			: []

		console.log('Processed content paragraphs:', contentText.length)
		if (contentText.length > 0) {
			console.log('First paragraph preview:', contentText[0].substring(0, 100))
		}

		// Clean up temp files
		try {
			if (fs.existsSync(titlePath)) fs.unlinkSync(titlePath)
			if (fs.existsSync(contentPath)) fs.unlinkSync(contentPath)
			if (fs.existsSync(logPath)) fs.unlinkSync(logPath)
			if (fs.existsSync(tempDir)) fs.rmdirSync(tempDir)
		} catch (error: any) {
			console.warn('Failed to clean up temp files:', error?.message)
		}

		if (contentText.length === 0) {
			throw new Error('No valid content found after processing')
		}

		return {
			title: titleText,
			content: contentText,
		}
	} catch (error: any) {
		// Clean up temp files even on error
		try {
			if (fs.existsSync(titlePath)) fs.unlinkSync(titlePath)
			if (fs.existsSync(contentPath)) fs.unlinkSync(contentPath)
			if (fs.existsSync(logPath)) fs.unlinkSync(logPath)
			if (fs.existsSync(tempDir)) fs.rmdirSync(tempDir)
		} catch (cleanupError: any) {
			console.warn(
				'Failed to clean up temp files after error:',
				cleanupError?.message
			)
		}

		console.error('Scraping error:', error?.message)
		throw error
	}
}

export function testFileAccess(): { written: string; read: string } {
	console.log('[testFileAccess] Starting file access test')
	const tempDir = path.join(os.tmpdir(), 'novel-scraper')
	console.log('[testFileAccess] Temp directory:', tempDir)

	if (!fs.existsSync(tempDir)) {
		console.log('[testFileAccess] Creating temp directory')
		fs.mkdirSync(tempDir, { recursive: true })
	}

	const testFilePath = path.join(tempDir, 'test.txt')
	console.log('[testFileAccess] Test file path:', testFilePath)
	const testContent =
		'This is a test content\nWritten at: ' + new Date().toISOString()

	// Write to file
	console.log('[testFileAccess] Writing content to file')
	fs.writeFileSync(testFilePath, testContent, 'utf8')

	// Read from file
	console.log('[testFileAccess] Reading content from file')
	const readContent = fs.readFileSync(testFilePath, 'utf8')

	// Clean up
	console.log('[testFileAccess] Cleaning up test file')
	fs.unlinkSync(testFilePath)

	console.log('[testFileAccess] Test completed successfully')
	return {
		written: testContent,
		read: readContent,
	}
}

export async function scrapeNovelContentWithCheerio(
	url: string
): Promise<NovelContent> {
	// Ensure the URL is from novelfull.com
	if (!url.includes('novelfull.com')) {
		throw new Error('Only novelfull.com URLs are supported')
	}

	try {
		// Make the HTTP request
		const response = await axios.get(url, {
			headers: {
				'User-Agent':
					'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
				Accept:
					'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
				'Accept-Language': 'en-US,en;q=0.5',
			},
		})

		// Load the HTML content into Cheerio
		const $ = cheerio.load(response.data)

		// Extract title using multiple possible selectors
		const title =
			$('h1.chapter-title, .chapter-title, .chr-title, .chapter-text')
				.first()
				.text()
				.trim() ||
			url.split('/').pop()?.replace(/-/g, ' ') ||
			'Unknown Title'

		// Extract content using multiple possible selectors
		const contentElements = $(
			'.chapter-c, #chapter-content, .chapter-content, #chr-content'
		)
		const content: string[] = []

		contentElements.each((_, element) => {
			const text = $(element).text().trim()
			if (
				text &&
				!text.includes('iframe') &&
				!text.includes('ads') &&
				!text.includes('script') &&
				!text.includes('Advertisement') &&
				!text.includes('Tip:')
			) {
				// Split by paragraphs and filter empty lines
				const paragraphs = text
					.split('\n')
					.map((p) => p.trim())
					.filter((p) => p.length > 0)
				content.push(...paragraphs)
			}
		})

		if (content.length === 0) {
			throw new Error('No valid content found after processing')
		}

		return {
			title,
			content,
		}
	} catch (error: any) {
		console.error('Error scraping with Cheerio:', error?.message)
		throw error
	}
}
