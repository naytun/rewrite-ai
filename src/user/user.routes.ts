import { Router } from 'express'
import { UserController } from './user.controller'

const router = Router()
const userController = new UserController()

// Auth routes
router.post('/signup', userController.signUp.bind(userController))
router.post('/signin', userController.signIn.bind(userController))
router.post('/signout', userController.signOut.bind(userController))

// User routes
router.get('/me', userController.getCurrentUser.bind(userController))
router.patch('/users/:userId', userController.updateUser.bind(userController))

export default router
