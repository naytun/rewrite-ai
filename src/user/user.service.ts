import { supabase } from '../config/supabase'
import {
	SignUpRequest,
	SignInRequest,
	UpdateUserRequest,
	AuthResponse,
	User,
} from '../types/user'

export class UserService {
	async signUp({
		email,
		password,
		full_name,
	}: SignUpRequest): Promise<AuthResponse> {
		try {
			const { data, error } = await supabase.auth.signUp({
				email,
				password,
				options: {
					data: {
						full_name,
					},
				},
			})

			if (error) throw error

			return {
				user: data.user,
				session: data.session,
			}
		} catch (error: any) {
			return {
				user: null,
				session: null,
				error: error.message,
			}
		}
	}

	async signIn({ email, password }: SignInRequest): Promise<AuthResponse> {
		try {
			const { data, error } = await supabase.auth.signInWithPassword({
				email,
				password,
			})

			if (error) throw error

			return {
				user: data.user,
				session: data.session,
			}
		} catch (error: any) {
			return {
				user: null,
				session: null,
				error: error.message,
			}
		}
	}

	async signOut(): Promise<{ error?: string }> {
		try {
			const { error } = await supabase.auth.signOut()
			if (error) throw error
			return {}
		} catch (error: any) {
			return { error: error.message }
		}
	}

	async getCurrentUser(): Promise<User | null> {
		try {
			const {
				data: { user },
				error,
			} = await supabase.auth.getUser()
			if (error) throw error
			return user
		} catch (error) {
			return null
		}
	}

	async updateUser(
		userId: string,
		updates: UpdateUserRequest
	): Promise<{ user: User | null; error?: string }> {
		try {
			const {
				data: { user },
				error,
			} = await supabase.auth.updateUser({
				data: updates,
			})

			if (error) throw error

			return { user }
		} catch (error: any) {
			return {
				user: null,
				error: error.message,
			}
		}
	}
}
