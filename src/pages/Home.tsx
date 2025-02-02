import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Grid,
  Card,
  CardMedia,
  CardContent,
  Typography,
  Box,
  CircularProgress,
  Alert,
} from '@mui/material'
import { Link } from 'react-router-dom'
import axios from 'axios'

interface Novel {
  id: string
  title: string
  author: string
  coverImage: string
  latestChapter: string
}

const Home = () => {
  const [novels, setNovels] = useState<Novel[]>([])

  const { isLoading, error } = useQuery({
    queryKey: ['novels'],
    queryFn: async () => {
      const { data } = await axios.get<Novel[]>('/api/novels')
      setNovels(data)
      return data
    },
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

  if (error) {
    return (
      <Alert severity="error" sx={{ mt: 2 }}>
        Error loading novels. Please try again later.
      </Alert>
    )
  }

  return (
    <Grid container spacing={3}>
      {novels.map((novel) => (
        <Grid item xs={12} sm={6} md={4} lg={3} key={novel.id}>
          <Card
            sx={{
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              transition: 'transform 0.2s',
              '&:hover': {
                transform: 'translateY(-4px)',
              },
            }}
          >
            <Link
              to={`/novel/${novel.id}`}
              style={{ textDecoration: 'none', color: 'inherit' }}
            >
              <CardMedia
                component="img"
                height="300"
                image={novel.coverImage}
                alt={novel.title}
                sx={{ objectFit: 'cover' }}
              />
              <CardContent>
                <Typography
                  gutterBottom
                  variant="h6"
                  component="div"
                  noWrap
                  sx={{ fontWeight: 'bold' }}
                >
                  {novel.title}
                </Typography>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  gutterBottom
                  noWrap
                >
                  {novel.author}
                </Typography>
                <Typography variant="body2" color="text.secondary" noWrap>
                  Latest: Chapter {novel.latestChapter}
                </Typography>
              </CardContent>
            </Link>
          </Card>
        </Grid>
      ))}
    </Grid>
  )
}

export default Home 