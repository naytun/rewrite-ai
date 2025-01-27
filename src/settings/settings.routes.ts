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
		await saveAISettings({ enabled, prompt: prompt || '' })
		res.json({ enabled, prompt })
	} catch (error) {
		console.error('Error saving AI settings:', error)
		res.status(500).json({ error: 'Failed to save AI settings' })
	}
})

export default router
