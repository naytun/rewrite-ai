import { OpenAI } from 'openai'
import { config } from 'dotenv'

config()

export interface RewriteRequest {
	text: string
	style?: 'concise' | 'simplified' | string
}

export class RewriteService {
	private openai: OpenAI

	constructor() {
		this.openai = new OpenAI({
			apiKey: process.env.OPENAI_API_KEY,
		})
	}

	async rewriteText({
		text,
		style = 'concise',
	}: RewriteRequest): Promise<string> {
		try {
			const prompt = `Rewrite the following text in a ${style} style while maintaining the core meaning:\n\n${text}`

			const completion = await this.openai.chat.completions.create({
				messages: [{ role: 'user', content: prompt }],
				model: 'gpt-3.5-turbo',
			})

			return completion.choices[0]?.message?.content || 'Unable to rewrite text'
		} catch (error: any) {
			console.error('Error rewriting text:', error?.message)
			throw new Error('Failed to rewrite text')
		}
	}
}
