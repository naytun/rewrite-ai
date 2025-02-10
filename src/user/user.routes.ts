import { Router } from 'express'
import * as userController from './user.controller'

const router = Router()

// Auth routes
router.post('/signup', userController.signUp)
router.post('/signin', userController.signIn)
router.post('/signin/otp', userController.signInWithOtp)
router.post('/signout', userController.signOut)
router.post('/forgot-password', userController.forgotPassword)
router.post('/reset-password', userController.resetPassword)

// User routes
router.get('/me', userController.getCurrentUser)
router.patch('/users/:userId', userController.updateUser)

export default router
