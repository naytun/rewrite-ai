import { Router, RequestHandler } from 'express'
import { novelController } from '.'

const router = Router()

const { listChapters, readChapter } = novelController

// Novel routes
router.get(
	'/chapters',
	listChapters.bind(novelController) as unknown as RequestHandler
)
router.get(
	'/read/:volume/:chapter',
	readChapter.bind(novelController) as unknown as RequestHandler
)

export default router
