import { Routes, Route } from 'react-router-dom'
import { Box, Container } from '@mui/material'
import Navbar from './components/Navbar'
import Home from './pages/Home'
import NovelDetail from './pages/NovelDetail'
import Settings from './pages/Settings'

const App = () => {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Navbar />
      <Container component="main" sx={{ flex: 1, py: 4 }}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/novel/:id" element={<NovelDetail />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </Container>
    </Box>
  )
}

export default App 