import express, { Request, Response, NextFunction, Application } from 'express'

// Error handling interface
interface ErrorWithStatus extends Error {
	status?: number
}

// Initialize express app
const app: Application = express()

// Basic GET route
app.get('/', (req: Request, res: Response) => {
	res.status(200).json({ message: 'Welcome to the API' })
})

// Error handling middleware
app.use(
	(err: ErrorWithStatus, req: Request, res: Response, next: NextFunction) => {
		const status = err.status || 500
		const message = err.message || 'Internal Server Error'

		res.status(status).json({
			status,
			message,
		})
	}
)

// 404 handler for undefined routes
app.use((req: Request, res: Response) => {
	res.status(404).json({
		status: 404,
		message: 'Route not found',
	})
})

const PORT = process.env.PORT || 3000

if (process.env.NODE_ENV !== 'test') {
	app.listen(PORT, () => {
		console.log(`> Server is running on port: ${PORT}`)
	})
}

export default app
