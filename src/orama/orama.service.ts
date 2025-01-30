import dotenv from 'dotenv'
import { OramaClient } from '@oramacloud/client'
import { getAISettings } from '../settings/settings.service'
import { AI_INSTRUCTIONS } from '../novel/constants'

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

		// Get AI settings to use the prompt
		const settings = await getAISettings()
		const prompt =
			!settings.prompt || settings.prompt.length < 10
				? AI_INSTRUCTIONS.REWRITE_CHAPTER
				: settings.prompt

		const session = await oramaClient.createAnswerSession({
			userContext: prompt,
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
