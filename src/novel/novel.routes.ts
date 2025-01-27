import { Router } from 'express'
import {
	listChapters,
	readChapter,
	listNovels,
	getAIRewriteSettings,
	setAIRewriteSettings,
	bulkGenerateAIContent,
} from './novel.controller'

const router = Router()

router.get('/novels', listNovels)
router.get('/novels/:novelId/chapters', listChapters)
router.get('/novels/:novelId/chapters/:volume/:chapter', readChapter)
router.get('/settings/ai-rewrite', getAIRewriteSettings)
router.post('/settings/ai-rewrite', setAIRewriteSettings)
router.post('/novels/:novelId/generate-ai', bulkGenerateAIContent)

export default router
