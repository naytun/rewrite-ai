import { OramaClient } from '@oramacloud/client'
import dotenv from 'dotenv'

dotenv.config()

// Initialize Orama client
const createOramaClient = (): OramaClient | null => {
	if (process.env.NODE_ENV === 'test') {
		return null
	}

	if (!process.env.ORAMA_API_KEY || !process.env.ORAMA_ENDPOINT) {
		throw new Error('Orama API Key and Endpoint are required')
	}

	return new OramaClient({
		api_key: process.env.ORAMA_API_KEY,
		endpoint: process.env.ORAMA_ENDPOINT,
	})
}

const oramaClient = createOramaClient()

// Ask AI function
export const askAI = async ({
	question,
	context = '',
}: {
	question: string
	context?: string
}) => {
	try {
		if (!oramaClient) {
			throw new Error('OramaAI Client is not initialized')
		}

		if (!question) {
			throw new Error('Question is required')
		}

		const session = oramaClient.createAnswerSession({
			userContext: `
				Note: Rephrase the answer sentences short and concise. Create paragraphs as needed. Use only common words for better readability.
				${context}`,
			inferenceType: 'documentation',
		})

		const result = await session.ask({ term: question })
		session?.clearSession()
		return result
	} catch (error) {
		console.error('Error asking AI:', error)
		throw error
	}
}
