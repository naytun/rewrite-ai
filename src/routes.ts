import novelRoutes from './novel'
import settingsRoutes from './settings/settings.routes'
import aiRoutes from './ai/ai.routes'
import userRoutes from './user/user.routes'

import { Router } from 'express'
import { oramaRoutes } from './orama'

const router = Router()

// Mount Route modules
router.use('/orama', oramaRoutes)
router.use('/novel', novelRoutes)
router.use('/settings', settingsRoutes)
router.use('/ai', aiRoutes)
router.use('/auth', userRoutes)

export default router
