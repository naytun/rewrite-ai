import { Router } from 'express'
import {
  getAllNovels,
  getNovelById,
  getChapterById,
} from '../controllers/novelController'

const router = Router()

router.get('/novels', getAllNovels)
router.get('/novels/:id', getNovelById)
router.get('/novels/:id/chapters/:chapterId', getChapterById)

export default router
