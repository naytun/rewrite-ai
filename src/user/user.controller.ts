import { Request, Response } from 'express'
import * as userService from './user.service'
import { SignUpRequest, SignInRequest, SignInWithOtpRequest, UpdateUserRequest, ForgotPasswordRequest, ResetPasswordRequest } from '../types/user'

export const signUp = async (req: Request, res: Response): Promise<void> => {
	const signUpData: SignUpRequest = req.body
	const result = await userService.signUp(signUpData)

	if (result.error) {
		res.status(400).json({ error: result.error })
		return
	}

	res.status(201).json(result)
}

export const signIn = async (req: Request, res: Response): Promise<void> => {
	const signInData: SignInRequest = req.body
	const result = await userService.signIn(signInData)

	if (result.error) {
		res.status(401).json({ error: result.error })
		return
	}

	res.status(200).json(result)
}

export const signOut = async (req: Request, res: Response): Promise<void> => {
	const result = await userService.signOut()

	if (result.error) {
		res.status(500).json({ error: result.error })
		return
	}

	res.status(200).json({ message: 'Signed out successfully' })
}

export const getCurrentUser = async (req: Request, res: Response): Promise<void> => {
	const user = await userService.getCurrentUser()

	if (!user) {
		res.status(401).json({ error: 'Not authenticated' })
		return
	}

	res.status(200).json({ user })
}

export const updateUser = async (req: Request, res: Response): Promise<void> => {
	const userId = req.params.userId
	const updates: UpdateUserRequest = req.body

	const result = await userService.updateUser(userId, updates)

	if (result.error) {
		res.status(400).json({ error: result.error })
		return
	}

	res.status(200).json({ user: result.user })
}

export const forgotPassword = async (req: Request, res: Response): Promise<void> => {
	const { email }: ForgotPasswordRequest = req.body

	if (!email) {
		res.status(400).json({ error: 'Email is required' })
		return
	}

	const result = await userService.forgotPassword({ email })

	if (result.error) {
		res.status(400).json({ error: result.error })
		return
	}

	res.status(200).json({ message: 'Password reset instructions sent to your email' })
}

export const resetPassword = async (req: Request, res: Response): Promise<void> => {
	const { password }: ResetPasswordRequest = req.body

	if (!password) {
		res.status(400).json({ error: 'New password is required' })
		return
	}

	const result = await userService.resetPassword({ password })

	if (result.error) {
		res.status(400).json({ error: result.error })
		return
	}

	res.status(200).json({ message: 'Password has been reset successfully' })
}

export const signInWithOtp = async (req: Request, res: Response): Promise<void> => {
	const { email }: SignInWithOtpRequest = req.body

	if (!email) {
		res.status(400).json({ error: 'Email is required' })
		return
	}

	const result = await userService.signInWithOtp({ email })

	if (result.error) {
		res.status(400).json({ error: result.error })
		return
	}

	res.status(200).json({ message: 'Magic link sent to your email' })
}
