import { Router } from 'express'
import { getAISettings, saveAISettings } from './settings.service'

const router = Router()

router.get('/ai-rewrite', async (req, res) => {
	try {
		const settings = await getAISettings()
		res.json(settings)
	} catch (error) {
		console.error('Error getting AI settings:', error)
		res.status(500).json({ error: 'Failed to get AI settings' })
	}
})

router.post('/ai-rewrite', async (req, res) => {
	try {
		const { enabled, prompt } = req.body
		if (typeof enabled !== 'boolean') {
			res.status(400).json({ error: 'Invalid enabled value' })
			return
		}

		// Get current settings to preserve prompt if not provided
		const currentSettings = await getAISettings()
		const newPrompt = prompt === undefined ? currentSettings.prompt : prompt

		await saveAISettings({ enabled, prompt: newPrompt })
		res.json({ enabled, prompt: newPrompt })
	} catch (error) {
		console.error('Error saving AI settings:', error)
		res.status(500).json({ error: 'Failed to save AI settings' })
	}
})

export default router
