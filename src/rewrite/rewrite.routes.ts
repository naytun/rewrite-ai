import { Router, Request, Response } from 'express'
import { RewriteController } from './rewrite.controller'

const router = Router()
const rewriteController = new RewriteController()

router.post('/rewrite', async (req: Request, res: Response) => {
	await rewriteController.rewrite(req, res)
})

export default router
