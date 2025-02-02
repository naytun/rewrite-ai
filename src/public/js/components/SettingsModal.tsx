import React, { useState, useEffect } from 'react'

interface SettingsModalProps {
	isOpen: boolean
	onClose: () => void
	aiRewrite: boolean
	setAiRewrite: (value: boolean) => void
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
	isOpen,
	onClose,
	aiRewrite,
	setAiRewrite,
}) => {
	const [prompt, setPrompt] = useState('')

	useEffect(() => {
		if (isOpen) {
			loadSettings()
		}
	}, [isOpen])

	const loadSettings = async () => {
		try {
			const response = await fetch('/api/settings/ai-rewrite')
			if (response.ok) {
				const settings = await response.json()
				setPrompt(settings.prompt || '')
			}
		} catch (error) {
			console.error('Error loading settings:', error)
		}
	}

	const handleSave = async () => {
		try {
			const response = await fetch('/api/settings/ai-rewrite', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					enabled: aiRewrite,
					prompt,
				}),
			})

			if (response.ok) {
				onClose()
			} else {
				console.error('Failed to save settings')
			}
		} catch (error) {
			console.error('Error saving settings:', error)
		}
	}

	if (!isOpen) return null

	return (
		<div id='settingsModal' className='visible'>
			<div className='modal-content'>
				<div className='modal-header'>
					<h2>AI Settings</h2>
					<button className='modal-close' onClick={onClose}>
						&times;
					</button>
				</div>
				<div>
					<textarea
						className='modal-textarea'
						value={prompt}
						onChange={(e) => setPrompt(e.target.value)}
						placeholder='Enter instructions for how the AI should rewrite the novel content...'
					/>
				</div>
				<div>
					<button className='modal-save' onClick={handleSave}>
						Save
					</button>
				</div>
			</div>
		</div>
	)
}
