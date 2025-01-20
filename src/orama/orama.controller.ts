import { Request, Response } from 'express'
import { HttpStatusCode } from 'axios'
import { askAI } from './orama.service'

/**
 * POST /api/orama/ask
 * Ask a question to Orama AI
 */
export const postAskAI = async (req: Request, res: Response) => {
	try {
		const { question, context } = req.body

		if (!question) {
			return res.status(HttpStatusCode.BadRequest).json({
				status: HttpStatusCode.BadRequest,
				message: 'Question is required',
			})
		}

		const result = await askAI({ question, context })

		return res.status(HttpStatusCode.Ok).json({
			status: HttpStatusCode.Ok,
			data: result,
		})
	} catch (error) {
		console.error('Orama AI Controller Error:', error)
		return res.status(HttpStatusCode.InternalServerError).json({
			status: HttpStatusCode.InternalServerError,
			message: error instanceof Error ? error.message : 'Internal Server Error',
		})
	}
}

/**
 * GET /api/orama/health
 * Health check endpoint
 */
export const getHealth = async (_req: Request, res: Response) => {
	try {
		return res.status(HttpStatusCode.Ok).json({
			status: HttpStatusCode.Ok,
			message: 'Orama AI service is healthy',
		})
	} catch (error) {
		console.error('Health Check Error:', error)
		return res.status(HttpStatusCode.InternalServerError).json({
			status: HttpStatusCode.InternalServerError,
			message: 'Service health check failed',
		})
	}
}

// Export all controller functions
export const OramaController = {
	postAskAI,
	getHealth,
}
