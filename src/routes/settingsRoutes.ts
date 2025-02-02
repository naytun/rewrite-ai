import { Router } from 'express'
import { updateSettings } from '../controllers/settingsController'

const router = Router()

router.post('/settings', updateSettings)

export default router
