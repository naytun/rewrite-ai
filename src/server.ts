import express from 'express'
import cors from 'cors'
import { config } from 'dotenv'
import novelRoutes from './routes/novelRoutes'
import settingsRoutes from './routes/settingsRoutes'

config()

const app = express()
const port = process.env.PORT || 8080

// Middleware
app.use(cors())
app.use(express.json())

// Routes
app.use('/api', novelRoutes)
app.use('/api', settingsRoutes)

// Start server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`)
})
