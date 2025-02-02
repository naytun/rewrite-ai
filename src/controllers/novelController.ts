import { RequestHandler } from 'express'
import { ParamsDictionary } from 'express-serve-static-core'

interface NovelParams extends ParamsDictionary {
  id: string
}

interface ChapterParams extends ParamsDictionary {
  id: string
  chapterId: string
}

// Sample data - In a real app, this would come from a database
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

export const getAllNovels: RequestHandler = (_req, res) => {
  res.json(sampleNovels)
}

export const getNovelById: RequestHandler<NovelParams> = (req, res) => {
  const novel = sampleNovels.find((n) => n.id === req.params.id)
  if (!novel) {
    res.status(404).json({ error: 'Novel not found' })
  } else {
    res.json(novel)
  }
}

export const getChapterById: RequestHandler<ChapterParams> = (req, res) => {
  const novel = sampleNovels.find((n) => n.id === req.params.id)
  if (!novel) {
    res.status(404).json({ error: 'Novel not found' })
    return
  }

  const chapter = novel.chapters.find((c) => c.id === req.params.chapterId)
  if (!chapter) {
    res.status(404).json({ error: 'Chapter not found' })
    return
  }

  res.json(
    `This is the content of chapter ${chapter.number}: ${chapter.title}.\n\nLorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.`
  )
}
