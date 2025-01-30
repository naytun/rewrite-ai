import { Router } from 'express'
import {
	listChapters,
	readChapter,
	listNovels,
	bulkGenerateAIContent,
	regenerateChapter,
	checkAIContentExists,
} from './novel.controller'

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
router.get(
	'/novels/:novelId/chapters/:volume/:chapter/ai-exists',
	checkAIContentExists
)

// Bulk generation route
router.post('/novels/:novelId/bulk-generate', bulkGenerateAIContent)

// Regenerate specific chapter
router.post(
	'/novels/:novelId/chapters/:volume/:chapter/regenerate',
	regenerateChapter
)

export default router
