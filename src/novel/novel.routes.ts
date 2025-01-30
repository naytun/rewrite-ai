import { Router } from 'express'
import {
	listChapters,
	readChapter,
	listNovels,
	getAIRewriteSettings,
	setAIRewriteSettings,
	bulkGenerateAIContent,
	regenerateChapter,
} from './novel.controller'
import { getNovelPath } from './novel.service'
import path from 'path'
import fs from 'fs'
import { Request, Response } from 'express'

const router = Router()

// Request logging middleware
router.use((req, res, next) => {
	console.log('Novel route hit:', {
		method: req.method,
		path: req.path,
		params: req.params,
		query: req.query,
		body: req.body,
	})
	next()
})

// Test endpoint
router.post('/test', (req, res) => {
	console.log('Test endpoint hit')
	res.json({ message: 'Test endpoint working' })
})

// Novel routes
router.get('/novels', listNovels)
router.get('/novels/:novelId/chapters', listChapters)
router.get('/novels/:novelId/chapters/:volume/:chapter', readChapter)
router.post('/novels/:novelId/bulk-generate', bulkGenerateAIContent)

// Chapter regeneration
router.post(
	'/novels/:novelId/chapters/:volume/:chapter/regenerate',
	regenerateChapter
)

// Settings routes
router.get('/settings/ai-rewrite', getAIRewriteSettings)
router.post('/settings/ai-rewrite', setAIRewriteSettings)

router.get(
	'/novels/:novelId/chapters/:volume/:chapter/ai-exists',
	async (req: Request, res: Response) => {
		try {
			const { novelId, volume, chapter } = req.params
			const novelPath = await getNovelPath(novelId)
			const aiFilePath = path.join(
				novelPath,
				'json',
				volume,
				`${chapter}-ai.json`
			)

			const exists = fs.existsSync(aiFilePath)
			res.json({ exists })
		} catch (error) {
			console.error('Error checking AI content:', error)
			res.status(500).json({ error: 'Failed to check AI content' })
		}
	}
)

export default router
