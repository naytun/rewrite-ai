import { Router, RequestHandler } from 'express'
import { OramaController } from '.'

const router = Router()

const { postAskAI, getHealth } = OramaController

// Orama routes
router.post('/ask', postAskAI as unknown as RequestHandler)
router.get('/health', getHealth as unknown as RequestHandler)

export default router
