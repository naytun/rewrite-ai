import { OpenAI } from 'openai'
import { config } from 'dotenv'
import Anthropic from '@anthropic-ai/sdk'

config()

export interface RewriteRequest {
	text: string
	style?: 'concise' | 'simplified' | string
	provider?: 'openai' | 'claude'
}

export class RewriteService {
	private openai: OpenAI
	private anthropic: Anthropic

	constructor() {
		this.openai = new OpenAI({
			apiKey: process.env.OPENAI_API_KEY,
		})
		this.anthropic = new Anthropic({
			apiKey: process.env.ANTHROPIC_API_KEY || '',
		})
	}

	async rewriteText({
		text,
		style = 'concise',
		provider = 'openai',
	}: RewriteRequest): Promise<string> {
		try {
			const prompt = `Rewrite the following text in a ${style} style while maintaining the core meaning:\n\n${text}`

			if (provider === 'claude') {
				const completion = await this.anthropic.messages.create({
					messages: [{ role: 'user', content: prompt }],
					model: 'claude-3-sonnet-20240229',
					max_tokens: 4096,
				})

				if (completion.content[0].type === 'text') {
					return completion.content[0].text || 'Unable to rewrite text'
				}
				return 'Unable to rewrite text'
			} else {
				const completion = await this.openai.chat.completions.create({
					messages: [{ role: 'user', content: prompt }],
					model: 'gpt-3.5-turbo',
				})

				return (
					completion.choices[0]?.message?.content || 'Unable to rewrite text'
				)
			}
		} catch (error: any) {
			console.error('Error rewriting text:', error?.message)
			throw new Error('Failed to rewrite text')
		}
	}
}
