export interface User {
	id: string
	email: string
	created_at: string
	last_sign_in?: string
	user_metadata?: {
		full_name?: string
	}
}

export interface SignUpRequest {
	email: string
	password: string
	full_name?: string
}

export interface SignInRequest {
	email: string
	password: string
}

export interface SignInWithOtpRequest {
	email: string
}

export interface UpdateUserRequest {
	full_name?: string
}

export interface ForgotPasswordRequest {
	email: string
}

export interface ResetPasswordRequest {
	password: string
}

export interface AuthResponse {
	user: User | null
	session: any | null
	error?: string
}
