import { Router } from 'express'

import * as PACKAGE from '../package.json'
import novelRoutes from './novel'

import { oramaRoutes } from './orama'
import { webScrapeRoutes } from './webScrape'

const router = Router()
const status = {
	message: 'Everything is functioning normally!',
	version: PACKAGE.version,
}

router.get('/status', (req, res) => {
	res.status(200).json(status)
})
router.get('/', (req, res) => {
	res.status(200).json({ message: 'Welcome to the API' })
})

// Mount Route modules
router.use('/orama', oramaRoutes)
router.use('/webscrape', webScrapeRoutes)
router.use('/novel', novelRoutes)

export default router
