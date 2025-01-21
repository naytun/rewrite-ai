import { Router, Request, Response } from 'express'
import { oramaRoutes } from './orama'
import { webScrapeRoutes } from './webScrape'
import novelRoutes from './novel/novel.routes'

const router = Router()

// Welcome route
router.get('/', (req: Request, res: Response) => {
	res.status(200).json({ message: 'Welcome to the API' })
})

// Mount Route modules
router.use('/api/orama', oramaRoutes)
router.use('/api/webscrape', webScrapeRoutes)
router.use('/api/novel', novelRoutes)

export default router
