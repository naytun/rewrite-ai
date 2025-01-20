import { Router, Request, Response } from 'express'
import oramaRoutes from './orama/orama.routes'

const router = Router()

// Welcome route
router.get('/', (req: Request, res: Response) => {
	res.status(200).json({ message: 'Welcome to the API' })
})

// Mount Route modules
router.use('/api/orama', oramaRoutes)

export default router
