import { Scraper, Root, OpenPattern, DownloadContent } from 'nodejs-web-scraper'

interface NovelContent {
	title: string
	content: string[]
}

export async function scrapeNovelContent(url: string): Promise<NovelContent> {
	// Ensure the URL is from novelfull.com
	if (!url.includes('novelfull.com')) {
		throw new Error('Only novelfull.com URLs are supported')
	}

	const config = {
		baseSiteUrl: 'https://novelfull.com',
		startUrl: url,
		concurrency: 1,
		maxRetries: 3,
	}

	// Initialize scraper
	const scraper = new Scraper(config)
	const root = new Root()

	// Define content selectors
	const title = new DownloadContent('h3.title', { name: 'title' })
	const content = new DownloadContent('div#chapter-content', {
		name: 'content',
	})

	// Add selectors to root
	root.addOperation(title)
	root.addOperation(content)

	// Start scraping
	await scraper.scrape(root)

	// Get results
	const titleText = title.getData()[0] as string
	const contentText = (content.getData()[0] as string)
		.split('\n')
		.map((line) => line.trim())
		.filter((line) => line.length > 0)

	return {
		title: titleText,
		content: contentText,
	}
}

// Example usage:
// const content = await scrapeNovelContent('https://novelfull.com/some-novel/chapter-1.html');
// console.log(content.title);
// console.log(content.content);
