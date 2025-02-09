import { Router } from 'express'
import * as userController from './user.controller'

const router = Router()

// Auth routes
router.post('/signup', userController.signUp)
router.post('/signin', userController.signIn)
router.post('/signout', userController.signOut)

// User routes
router.get('/me', userController.getCurrentUser)
router.patch('/users/:userId', userController.updateUser)

export default router
