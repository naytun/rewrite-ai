import dotenv from 'dotenv'
import express, { Request, Response, NextFunction, Application } from 'express'
import routes from './routes'
import { HttpStatusCode } from 'axios'
import cors from 'cors'
import path from 'path'

// Load environment variables
dotenv.config()

// Validate required environment variables
const requiredEnvVars = ['ORAMA_API_KEY', 'ORAMA_ENDPOINT', 'PORT']
const missingEnvVars = requiredEnvVars.filter((envVar) => !process.env[envVar])

if (missingEnvVars.length > 0) {
	console.error(
		'Error: Missing required environment variables:',
		missingEnvVars.join(', ')
	)
	process.exit(1)
}

// Error handling interface
interface ErrorWithStatus extends Error {
	status?: number
}

// Initialize express app
const app: Application = express()
app.use(cors())
app.use(express.json())

// Serve static files
app.use(express.static(path.join(__dirname, 'public')))
app.use('/covers', express.static(path.join(process.cwd(), 'Lightnovels')))

// Request logging middleware
app.use((req: Request, res: Response, next: NextFunction) => {
	const timestamp = new Date().toISOString()
	console.log(`[${timestamp}] ${req.method} ${req.url}`)
	next()
})

// Mount routes
app.use('/api', routes)

// Serve home page
app.get('/', (req, res) => {
	res.sendFile(path.join(__dirname, 'public', 'index.html'))
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
	res.status(HttpStatusCode.NotFound).json({
		status: HttpStatusCode.NotFound,
		message: 'Route not found',
	})
})

const PORT = process.env.PORT || 3000
if (process.env.NODE_ENV !== 'test') {
	app.listen(PORT, () => {
		console.log(`> Server is running on port: ${PORT}`)
		console.log('> Environment:', process.env.NODE_ENV || 'development')
	})
}

export default app
