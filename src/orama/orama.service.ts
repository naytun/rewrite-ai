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
}): Promise<string> => {
	try {
		if (!oramaClient) {
			throw new Error('OramaAI Client is not initialized')
		}

		if (!question) {
			throw new Error('Question is required')
		}

		const session = await oramaClient.createAnswerSession({
			userContext: `
				Note: Rewrite following contents to be in shorter sentences but don't over simplify and over summarize. Keep dialogue as is, and just rephrase for better reading. Create paragraphs as needed. Use only common words for better readability.
				${context}`,
			inferenceType: 'documentation',
		})

		console.log('㏒  ~ askAI ~ session: [START]')
		const result = await session.ask({ term: question })
		console.log('㏒  ~ askAI ~ session: [END]')
		session.clearSession()
		return result || ''
	} catch (error) {
		console.error('Error asking AI:', error)
		throw error
	}
}
