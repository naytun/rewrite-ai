import { Router } from 'express'
import {
	listChapters,
	readChapter,
	listNovels,
	bulkGenerateAIContent,
	regenerateChapter,
	getAllChaptersContent,
	getGlossary,
	generateGlossary,
	getChapterList,
} from './novel.controller'

const router = Router()
// Novel routes
router.get('/novels', listNovels)
router.get('/novels/:novelId/chapter-list', getChapterList)
router.get('/novels/:novelId/chapters', listChapters)
router.get('/novels/:novelId/chapters/:volume/:chapter', readChapter)
router.get('/novels/:novelId/all-chapters', getAllChaptersContent)

// Bulk generation route
router.post('/novels/:novelId/bulk-generate', bulkGenerateAIContent)

// Regenerate specific chapter
router.post(
	'/novels/:novelId/chapters/:volume/:chapter/regenerate',
	regenerateChapter
)

// Glossary routes
router.get('/novels/:novelId/glossary', getGlossary)
router.post('/novels/:novelId/glossary/generate', generateGlossary)

export default router

// Export types
export * from '../types/novel'

// Export only what's needed from each module
export {
	// Controller exports
	listChapters,
	readChapter,
	listNovels,
	bulkGenerateAIContent,
	regenerateChapter,
	getAllChaptersContent,
	getGlossary,
	generateGlossary,
} from './novel.controller'

export {
	// Service exports (only what's needed by external modules)
	getNovelPath,
	preloadAIContent,
} from './novel.service'
