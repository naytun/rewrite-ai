import { RequestHandler, Router } from 'express'
import { WebScrapeController } from '.'

const router = Router()

const { scrapeNovel, testFile } = WebScrapeController

router.post('/novel', scrapeNovel as unknown as RequestHandler)
router.get('/test-file', testFile as unknown as RequestHandler)

export default router
