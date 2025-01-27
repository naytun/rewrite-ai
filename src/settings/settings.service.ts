import fs from 'fs'
import path from 'path'

const SETTINGS_DIR = path.join(process.cwd(), '.settings')
const AI_SETTINGS_FILE = path.join(SETTINGS_DIR, 'ai-rewrite.json')

interface AISettings {
	enabled: boolean
	prompt: string
}

export const getAISettings = async (): Promise<AISettings> => {
	try {
		if (!fs.existsSync(AI_SETTINGS_FILE)) {
			return {
				enabled: false,
				prompt: '',
			}
		}
		const settings = JSON.parse(
			await fs.promises.readFile(AI_SETTINGS_FILE, 'utf8')
		)
		return settings
	} catch (error) {
		console.error('Failed to load AI settings:', error)
		return {
			enabled: false,
			prompt: '',
		}
	}
}

export const saveAISettings = async (settings: AISettings): Promise<void> => {
	try {
		if (!fs.existsSync(SETTINGS_DIR)) {
			await fs.promises.mkdir(SETTINGS_DIR, { recursive: true })
		}
		await fs.promises.writeFile(
			AI_SETTINGS_FILE,
			JSON.stringify(settings, null, 2)
		)
	} catch (error) {
		console.error('Failed to save AI settings:', error)
		throw error
	}
}
