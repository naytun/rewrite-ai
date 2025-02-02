import { useState } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  useTheme,
  Box,
  Link,
} from '@mui/material'
import Brightness4Icon from '@mui/icons-material/Brightness4'
import Brightness7Icon from '@mui/icons-material/Brightness7'
import SettingsIcon from '@mui/icons-material/Settings'

const Navbar = () => {
  const theme = useTheme()
  const [mode, setMode] = useState<'light' | 'dark'>(theme.palette.mode)

  const toggleColorMode = () => {
    setMode((prevMode) => (prevMode === 'light' ? 'dark' : 'light'))
    // You'll need to implement the actual theme change logic
  }

  return (
    <AppBar position="static" color="default" elevation={1}>
      <Toolbar>
        <Typography
          variant="h6"
          component={RouterLink}
          to="/"
          sx={{
            flexGrow: 1,
            textDecoration: 'none',
            color: 'inherit',
            fontWeight: 'bold',
          }}
        >
          Novel Library
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <IconButton onClick={toggleColorMode} color="inherit">
            {mode === 'dark' ? <Brightness7Icon /> : <Brightness4Icon />}
          </IconButton>
          <Link
            component={RouterLink}
            to="/settings"
            color="inherit"
            sx={{ display: 'flex' }}
          >
            <IconButton color="inherit">
              <SettingsIcon />
            </IconButton>
          </Link>
        </Box>
      </Toolbar>
    </AppBar>
  )
}

export default Navbar 