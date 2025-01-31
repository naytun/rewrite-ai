import { Request, Response, NextFunction } from 'express'
import { aiService } from './ai.service'

interface AskRequest extends Request {
	body: {
		question: string
	}
}

export class AIController {
	static async ask(
		req: AskRequest,
		res: Response,
		next: NextFunction
	): Promise<void> {
		try {
			const { question } = req.body
			if (!question) {
				res.status(400).json({ error: 'Question is required' })
				return
			}

			const answer = await aiService.askQuestion(question)
			res.json({ answer })
		} catch (error) {
			console.error('Error in /ask endpoint:', error)
			res.status(500).json({ error: 'Failed to get AI response' })
		}
	}
}

export const aiController = new AIController()
