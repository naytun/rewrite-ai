import { Router } from 'express'
import { AIController } from './ai.controller'

const router = Router()

router.post('/ask', AIController.ask)

export default router
