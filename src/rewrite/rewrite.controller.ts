import { Request, Response } from 'express'
import { RewriteService } from './rewrite.service'

export class RewriteController {
	private rewriteService: RewriteService

	constructor() {
		this.rewriteService = new RewriteService()
	}

	async rewrite(req: Request, res: Response) {
		try {
			const apiKey = req.headers['x-api-key']

			if (!apiKey || apiKey !== process.env.API_KEY) {
				return res.status(401).json({ error: 'Unauthorized: Invalid API key' })
			}

			const { text, style } = req.body

			if (!text) {
				return res.status(400).json({ error: 'Text is required' })
			}

			const rewrittenText = await this.rewriteService.rewriteText({
				text,
				style,
			})
			return res.json({ text: rewrittenText })
		} catch (error) {
			console.error('Error in rewrite controller:', error)
			return res.status(500).json({ error: 'Internal server error' })
		}
	}
}
