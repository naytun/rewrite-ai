import { useState } from 'react'
import {
  Paper,
  Typography,
  Switch,
  FormControlLabel,
  Box,
  TextField,
  Button,
  Alert,
  Snackbar,
} from '@mui/material'
import { useMutation } from '@tanstack/react-query'
import axios from 'axios'

interface Settings {
  darkMode: boolean
  fontSize: number
  apiKey: string
}

const Settings = () => {
  const [settings, setSettings] = useState<Settings>({
    darkMode: false,
    fontSize: 16,
    apiKey: '',
  })
  const [showSuccess, setShowSuccess] = useState(false)

  const { mutate: saveSettings, isError } = useMutation({
    mutationFn: async (newSettings: Settings) => {
      await axios.post('/api/settings', newSettings)
    },
    onSuccess: () => {
      setShowSuccess(true)
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    saveSettings(settings)
  }

  return (
    <Paper sx={{ p: 3, maxWidth: 600, mx: 'auto' }}>
      <Typography variant="h5" gutterBottom>
        Settings
      </Typography>
      <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2 }}>
        <FormControlLabel
          control={
            <Switch
              checked={settings.darkMode}
              onChange={(e) =>
                setSettings({ ...settings, darkMode: e.target.checked })
              }
            />
          }
          label="Dark Mode"
          sx={{ mb: 2, display: 'block' }}
        />

        <Typography variant="subtitle2" gutterBottom>
          Font Size
        </Typography>
        <TextField
          type="number"
          value={settings.fontSize}
          onChange={(e) =>
            setSettings({ ...settings, fontSize: Number(e.target.value) })
          }
          inputProps={{ min: 12, max: 24 }}
          fullWidth
          sx={{ mb: 3 }}
        />

        <Typography variant="subtitle2" gutterBottom>
          API Key
        </Typography>
        <TextField
          type="password"
          value={settings.apiKey}
          onChange={(e) => setSettings({ ...settings, apiKey: e.target.value })}
          fullWidth
          sx={{ mb: 3 }}
        />

        <Button
          type="submit"
          variant="contained"
          color="primary"
          fullWidth
          size="large"
        >
          Save Settings
        </Button>

        {isError && (
          <Alert severity="error" sx={{ mt: 2 }}>
            Failed to save settings. Please try again.
          </Alert>
        )}

        <Snackbar
          open={showSuccess}
          autoHideDuration={3000}
          onClose={() => setShowSuccess(false)}
        >
          <Alert severity="success">Settings saved successfully!</Alert>
        </Snackbar>
      </Box>
    </Paper>
  )
}

export default Settings 