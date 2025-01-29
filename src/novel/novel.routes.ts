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

const router = Router()

router.get('/novels', listNovels)
router.get('/novels/:novelId/chapters', listChapters)
router.get('/novels/:novelId/chapters/:volume/:chapter', readChapter)
router.post(
	'/novels/:novelId/chapters/:volume/:chapter/regenerate',
	regenerateChapter
)
router.get('/settings/ai-rewrite', getAIRewriteSettings)
router.post('/settings/ai-rewrite', setAIRewriteSettings)
router.post('/novels/:novelId/bulk-generate', bulkGenerateAIContent)

export default router
