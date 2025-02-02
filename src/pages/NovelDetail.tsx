import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Box, Typography, CircularProgress, Alert } from '@mui/material'
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
    <Box>
      <Typography variant="h4">Novel Details</Typography>
      <Typography>Novel ID: {id}</Typography>
    </Box>
  )
}

export default NovelDetail
