// import { Router } from 'express'
// import {
// 	listChapters,
// 	readChapter,
// 	listNovels,
// 	bulkGenerateAIContent,
// 	regenerateChapter,
// 	checkAIContentExists,
// 	getAllChaptersContent,
// 	getGlossary,
// 	generateGlossary,
// 	getChapterList,
// } from './novel.controller'

// const router = Router()

// // Test endpoint
// router.post('/test', (req, res) => {
// 	console.log('Test endpoint hit')
// 	res.json({ message: 'Test endpoint working' })
// })

// // Novel listing and chapter routes
// router.get('/novels', listNovels)
// router.get('/novels/:novelId/chapter-list', getChapterList)
// router.get('/novels/:novelId/chapters', listChapters)
// router.get('/novels/:novelId/chapters/:volume/:chapter', readChapter)

// // AI-related routes
// router.get(
// 	'/novels/:novelId/chapters/:volume/:chapter/ai-exists',
// 	checkAIContentExists
// )
// router.post(
// 	'/novels/:novelId/chapters/:volume/:chapter/regenerate',
// 	regenerateChapter
// )
// router.post('/novels/:novelId/bulk-generate', bulkGenerateAIContent)

// // Content retrieval routes
// router.get('/novels/:novelId/all-chapters', getAllChaptersContent)

// // Glossary routes
// router.get('/novels/:novelId/glossary', getGlossary)
// router.post('/novels/:novelId/glossary/generate', generateGlossary)

// export default router
