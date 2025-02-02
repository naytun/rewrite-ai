import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  Box,
  Grid,
  Typography,
  Paper,
  List,
  ListItem,
  ListItemText,
  CircularProgress,
  Alert,
  Divider,
} from '@mui/material'
import axios from 'axios'

interface Chapter {
  id: string
  title: string
  number: number
  content?: string
}

interface NovelDetails {
  id: string
  title: string
  author: string
  coverImage: string
  description: string
  chapters: Chapter[]
}

const NovelDetail = () => {
  const { id } = useParams<{ id: string }>()
  const [selectedChapter, setSelectedChapter] = useState<Chapter | null>(null)

  const {
    data: novel,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['novel', id],
    queryFn: async () => {
      const { data } = await axios.get<NovelDetails>(`/api/novels/${id}`)
      return data
    },
  })

  const { data: chapterContent, isLoading: isLoadingChapter } = useQuery({
    queryKey: ['chapter', selectedChapter?.id],
    queryFn: async () => {
      if (!selectedChapter) return null
      const { data } = await axios.get<string>(
        `/api/novels/${id}/chapters/${selectedChapter.id}`
      )
      return data
    },
    enabled: !!selectedChapter,
  })

  if (isLoading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '50vh',
        }}
      >
        <CircularProgress />
      </Box>
    )
  }

  if (error || !novel) {
    return (
      <Alert severity="error" sx={{ mt: 2 }}>
        Error loading novel details. Please try again later.
      </Alert>
    )
  }

  return (
    <Grid container spacing={3}>
      <Grid item xs={12} md={4}>
        <Paper sx={{ p: 2 }}>
          <Box
            component="img"
            src={novel.coverImage}
            alt={novel.title}
            sx={{
              width: '100%',
              height: 'auto',
              borderRadius: 1,
              mb: 2,
            }}
          />
          <Typography variant="h5" gutterBottom sx={{ fontWeight: 'bold' }}>
            {novel.title}
          </Typography>
          <Typography variant="subtitle1" color="text.secondary" gutterBottom>
            by {novel.author}
          </Typography>
          <Typography variant="body1" paragraph>
            {novel.description}
          </Typography>
        </Paper>
      </Grid>
      <Grid item xs={12} md={8}>
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Chapters
          </Typography>
          <List>
            {novel.chapters.map((chapter) => (
              <Box key={chapter.id}>
                <ListItem
                  button
                  selected={selectedChapter?.id === chapter.id}
                  onClick={() => setSelectedChapter(chapter)}
                >
                  <ListItemText
                    primary={`Chapter ${chapter.number}: ${chapter.title}`}
                  />
                </ListItem>
                <Divider />
              </Box>
            ))}
          </List>
        </Paper>
        {selectedChapter && (
          <Paper sx={{ p: 2, mt: 2 }}>
            <Typography variant="h6" gutterBottom>
              {`Chapter ${selectedChapter.number}: ${selectedChapter.title}`}
            </Typography>
            {isLoadingChapter ? (
              <CircularProgress />
            ) : (
              <Typography
                variant="body1"
                component="div"
                sx={{ whiteSpace: 'pre-wrap' }}
              >
                {chapterContent}
              </Typography>
            )}
          </Paper>
        )}
      </Grid>
    </Grid>
  )
}

export default NovelDetail
