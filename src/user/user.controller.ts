import { Request, Response } from 'express'
import { UserService } from './user.service'
import { SignUpRequest, SignInRequest, UpdateUserRequest } from '../types/user'

export class UserController {
	private userService: UserService

	constructor() {
		this.userService = new UserService()
	}

	async signUp(req: Request, res: Response) {
		const signUpData: SignUpRequest = req.body
		const result = await this.userService.signUp(signUpData)

		if (result.error) {
			return res.status(400).json({ error: result.error })
		}

		return res.status(201).json(result)
	}

	async signIn(req: Request, res: Response) {
		const signInData: SignInRequest = req.body
		const result = await this.userService.signIn(signInData)

		if (result.error) {
			return res.status(401).json({ error: result.error })
		}

		return res.status(200).json(result)
	}

	async signOut(req: Request, res: Response) {
		const result = await this.userService.signOut()

		if (result.error) {
			return res.status(500).json({ error: result.error })
		}

		return res.status(200).json({ message: 'Signed out successfully' })
	}

	async getCurrentUser(req: Request, res: Response) {
		const user = await this.userService.getCurrentUser()

		if (!user) {
			return res.status(401).json({ error: 'Not authenticated' })
		}

		return res.status(200).json({ user })
	}

	async updateUser(req: Request, res: Response) {
		const userId = req.params.userId
		const updates: UpdateUserRequest = req.body

		const result = await this.userService.updateUser(userId, updates)

		if (result.error) {
			return res.status(400).json({ error: result.error })
		}

		return res.status(200).json({ user: result.user })
	}
}
