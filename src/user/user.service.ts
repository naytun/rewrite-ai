import { supabase } from '../config/supabase'
import {
	SignUpRequest,
	SignInRequest,
	UpdateUserRequest,
	AuthResponse,
	User,
} from '../types/user'

export const signUp = async ({
	email,
	password,
	full_name,
}: SignUpRequest): Promise<AuthResponse> => {
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
			user: data.user as User | null,
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

export const signIn = async ({ email, password }: SignInRequest): Promise<AuthResponse> => {
	try {
		const { data, error } = await supabase.auth.signInWithPassword({
			email,
			password,
		})

		if (error) throw error

		return {
			user: data.user as User | null,
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

export const signOut = async (): Promise<{ error?: string }> => {
	try {
		const { error } = await supabase.auth.signOut()
		if (error) throw error
		return {}
	} catch (error: any) {
		return { error: error.message }
	}
}

export const getCurrentUser = async (): Promise<User | null> => {
	try {
		const {
			data: { user },
			error,
		} = await supabase.auth.getUser()
		if (error) throw error
		return user as User | null
	} catch (error) {
		return null
	}
}

export const updateUser = async (
	userId: string,
	updates: UpdateUserRequest
): Promise<{ user: User | null; error?: string }> => {
	try {
		const {
			data: { user },
			error,
		} = await supabase.auth.updateUser({
			data: updates,
		})

		if (error) throw error

		return { user: user as User | null }
	} catch (error: any) {
		return {
			user: null,
			error: error.message,
		}
	}
}
