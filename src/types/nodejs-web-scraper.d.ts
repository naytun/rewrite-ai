declare module 'nodejs-web-scraper' {
	export interface ScraperConfig {
		baseSiteUrl: string
		startUrl: string
		concurrency?: number
		maxRetries?: number
	}

	export interface OperationConfig {
		name: string
	}

	export class Scraper {
		constructor(config: ScraperConfig)
		scrape(root: Root): Promise<void>
	}

	export class Root {
		addOperation(operation: Operation): void
	}

	export class Operation {
		getData(): any[]
	}

	export class DownloadContent extends Operation {
		constructor(selector: string, config: OperationConfig)
	}

	export class OpenPattern extends Operation {
		constructor(selector: string, config: OperationConfig)
	}
}
