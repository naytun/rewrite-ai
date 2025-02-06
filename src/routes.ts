import { Router } from 'express'

import * as PACKAGE from '../package.json'
import novelRoutes from './novel'
import settingsRoutes from './settings/settings.routes'
import aiRoutes from './ai/ai.routes'

import { oramaRoutes } from './orama'

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
router.use('/novel', novelRoutes)
router.use('/settings', settingsRoutes)
router.use('/ai', aiRoutes)

export default router
