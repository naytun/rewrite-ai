import { Request, Response } from 'express'
import { scrapeNovelContent } from './webScrape.service'

export async function scrapeNovel(req: Request, res: Response) {
	try {
		const { url } = req.body

		if (!url) {
			return res.status(400).json({ error: 'URL is required' })
		}

		const novelContent = await scrapeNovelContent(url)
		return res.status(200).json(novelContent)
	} catch (error) {
		if (
			error instanceof Error &&
			error.message === 'Only novelfull.com URLs are supported'
		) {
			return res.status(400).json({ error: error.message })
		}
		return res.status(500).json({ error: 'Failed to scrape novel content' })
	}
}

// Export all controller functions
export const WebScrapeController = {
	scrapeNovel,
}
