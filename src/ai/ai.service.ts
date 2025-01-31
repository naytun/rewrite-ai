import { askAI } from '../orama/orama.service'

export class AIService {
	async askQuestion(question: string): Promise<string> {
		try {
			const answer = await askAI({
				question: `Tell me about: ${question}. Always answer how it is related to main character. Describe about the subject in brief. Total less than 500 characters.`,
				context:
					'Tell me about subject in the question. Describe in brief. less than 500 characters.',
			})
			return answer
		} catch (error) {
			console.error('Error in askQuestion:', error)
			throw new Error('Failed to get AI response')
		}
	}
}

export const aiService = new AIService()
