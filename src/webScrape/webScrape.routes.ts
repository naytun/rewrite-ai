import { RequestHandler, Router } from 'express'
import { WebScrapeController } from '.'

const router = Router()

const { scrapeNovel } = WebScrapeController

router.post('/novel', scrapeNovel as unknown as RequestHandler)

export default router
