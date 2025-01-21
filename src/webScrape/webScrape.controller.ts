import { Request, Response } from 'express'
import { scrapeNovelContent, testFileAccess } from './webScrape.service'
import { HttpStatusCode } from 'axios'

export async function scrapeNovel(req: Request, res: Response) {
	try {
		const { url } = req.body

		if (!url) {
			return res.status(400).json({ error: 'URL is required' })
		}

		console.log('[scrapeNovel] Starting scrape for URL:', url)
		const novelContent = await scrapeNovelContent(url)

		// Validate if content was retrieved
		if (!novelContent.content || novelContent.content.length === 0) {
			console.error('[scrapeNovel] No content retrieved from URL:', url)
			return res.status(HttpStatusCode.NotFound).json({
				error: 'No content found at the provided URL',
				url,
			})
		}

		console.log(
			'[scrapeNovel] Successfully retrieved content. Paragraphs:',
			novelContent.content.length
		)
		return res.status(HttpStatusCode.Ok).json(novelContent)
	} catch (error: any) {
		console.error('[scrapeNovel] Error:', error?.message)
		return res.status(HttpStatusCode.BadRequest).json({ error: error?.message })
	}
}

export function testFile(req: Request, res: Response) {
	console.log('[testFile] Received request to test file access')
	try {
		const result = testFileAccess()
		return res.status(HttpStatusCode.Ok).json(result)
	} catch (error: any) {
		console.error('[testFile] Error during file access test:', error?.message)
		return res
			.status(HttpStatusCode.InternalServerError)
			.json({ error: error?.message })
	}
}

// Export all controller functions
export const WebScrapeController = {
	scrapeNovel,
	testFile,
}
