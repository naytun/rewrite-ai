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

// Novel routes
router.get('/novels', listNovels)
router.get('/novels/:novelId/chapters', listChapters)
router.get('/novels/:novelId/chapters/:volume/:chapter', readChapter)

// AI settings routes
router.get('/ai-settings', getAIRewriteSettings)
router.post('/ai-settings', setAIRewriteSettings)

// Bulk generation route
router.post('/novels/:novelId/bulk-generate', bulkGenerateAIContent)

// Regenerate specific chapter
router.post('/novels/:novelId/regenerate/:volume/:chapter', regenerateChapter)

export default router

// Export types
export * from '../types/novel'

// Export only what's needed from each module
export {
	// Controller exports
	listChapters,
	readChapter,
	listNovels,
	getAIRewriteSettings,
	setAIRewriteSettings,
	bulkGenerateAIContent,
	regenerateChapter,
} from './novel.controller'

export {
	// Service exports (only what's needed by external modules)
	getNovelPath,
	preloadAIContent,
} from './novel.service'
