import { Router, Request, Response } from 'express'

import * as PACKAGE from '../package.json'
import novelRoutes from './novel/novel.routes'

import { oramaRoutes } from './orama'
import { webScrapeRoutes } from './webScrape'

const router = Router()
const status = {
	message: 'Everything is functioning normally!',
	version: PACKAGE.version,
}

router.get('/status', (req: Request, res: Response) => {
	res.status(200).json(status)
})
router.get('/', (req: Request, res: Response) => {
	res.status(200).json({ message: 'Welcome to the API' })
})

// Mount Route modules
router.use('/api/orama', oramaRoutes)
router.use('/api/webscrape', webScrapeRoutes)
router.use('/api/novel', novelRoutes)

export default router
