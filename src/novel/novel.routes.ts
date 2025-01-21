import { Router, RequestHandler } from 'express'
import { NovelController } from './novel.controller'

const router = Router()
const novelController = new NovelController()

router.get('/novels', (req, res) => novelController.listNovels(req, res))
router.get(
	'/novels/:novelId/chapters',
	novelController.listChapters.bind(
		novelController
	) as unknown as RequestHandler
)
router.get(
	'/novels/:novelId/chapters/:volume/:chapter',
	novelController.readChapter.bind(novelController) as unknown as RequestHandler
)

export default router
