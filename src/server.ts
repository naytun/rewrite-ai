import express, { Request, Response, Router } from 'express'
import cors from 'cors'
import { config } from 'dotenv'
import { ParamsDictionary } from 'express-serve-static-core'

config()

const app = express()
const port = process.env.PORT || 8080

// Middleware
app.use(cors())
app.use(express.json())

// Sample data
const sampleNovels = [
  {
    id: '1',
    title: 'The First Novel',
    author: 'John Doe',
    coverImage: 'https://via.placeholder.com/300x400',
    latestChapter: '10',
    description: 'A fascinating story about adventure and discovery.',
    chapters: [
      { id: '1', title: 'The Beginning', number: 1 },
      { id: '2', title: 'The Journey', number: 2 },
      { id: '3', title: 'The Challenge', number: 3 },
    ],
  },
  {
    id: '2',
    title: 'The Second Novel',
    author: 'Jane Smith',
    coverImage: 'https://via.placeholder.com/300x400',
    latestChapter: '15',
    description: 'An epic tale of friendship and courage.',
    chapters: [
      { id: '1', title: 'New Horizons', number: 1 },
      { id: '2', title: 'The Quest', number: 2 },
      { id: '3', title: 'The Resolution', number: 3 },
    ],
  },
]

interface NovelParams extends ParamsDictionary {
  id: string
}

interface ChapterParams extends ParamsDictionary {
  id: string
  chapterId: string
}

// API Routes
const router = Router()

router.get('/api/novels', (_req: Request, res: Response) => {
  res.json(sampleNovels)
})

router.get('/api/novels/:id', (req: Request<NovelParams>, res: Response) => {
  const novel = sampleNovels.find((n) => n.id === req.params.id)
  if (!novel) {
    return res.status(404).json({ error: 'Novel not found' })
  }
  res.json(novel)
})

router.get(
  '/api/novels/:id/chapters/:chapterId',
  (req: Request<ChapterParams>, res: Response) => {
    const novel = sampleNovels.find((n) => n.id === req.params.id)
    if (!novel) {
      return res.status(404).json({ error: 'Novel not found' })
    }

    const chapter = novel.chapters.find((c) => c.id === req.params.chapterId)
    if (!chapter) {
      return res.status(404).json({ error: 'Chapter not found' })
    }

    // Sample chapter content
    res.json(
      `This is the content of chapter ${chapter.number}: ${chapter.title}.\n\nLorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.`
    )
  }
)

app.post('/api/settings', (req: Request, res: Response) => {
  // In a real app, you would save these settings to a database
  console.log('Received settings:', req.body)
  res.json({ success: true })
})

app.use(router)

// Start server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`)
})
