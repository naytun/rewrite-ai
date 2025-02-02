import React, { useEffect, useState } from 'react'
import { NovelCard } from './components/NovelCard'
import { SettingsModal } from './components/SettingsModal'
import { GlossaryModal } from './components/GlossaryModal'
import { Header } from './components/Header'
import './styles.css'

interface Novel {
	id: string
	title: string
	authors: string[]
	cover_url: string
}

export const App: React.FC = () => {
	const [novels, setNovels] = useState<Novel[]>([])
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)
	const [isSettingsModalOpen, setSettingsModalOpen] = useState(false)
	const [isGlossaryModalOpen, setGlossaryModalOpen] = useState(false)
	const [currentNovelId, setCurrentNovelId] = useState<string | null>(null)
	const [darkMode, setDarkMode] = useState(
		() => localStorage.getItem('darkMode') === 'true'
	)
	const [aiRewrite, setAiRewrite] = useState(
		() => localStorage.getItem('aiRewrite') === 'true'
	)

	useEffect(() => {
		loadNovels()
	}, [])

	useEffect(() => {
		document.documentElement.classList.toggle('dark', darkMode)
		localStorage.setItem('darkMode', darkMode.toString())
	}, [darkMode])

	useEffect(() => {
		localStorage.setItem('aiRewrite', aiRewrite.toString())
		updateAiSettings(aiRewrite)
	}, [aiRewrite])

	const loadNovels = async () => {
		try {
			setLoading(true)
			setError(null)
			const response = await fetch('/api/novel/novels')
			if (!response.ok) throw new Error('Failed to load novels')
			const data = await response.json()
			if (!data || !data.length) {
				setError('No novels found')
			} else {
				setNovels(data)
			}
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Error loading novels')
		} finally {
			setLoading(false)
		}
	}

	const updateAiSettings = async (enabled: boolean) => {
		try {
			const response = await fetch('/api/settings/ai-rewrite', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Accept: 'application/json',
				},
				body: JSON.stringify({ enabled }),
			})

			if (!response.ok) {
				throw new Error('Failed to update AI settings')
			}

			const result = await response.json()
			if (result.enabled !== enabled) {
				setAiRewrite(result.enabled)
			}
		} catch (error) {
			console.error('Error updating AI settings:', error)
			setAiRewrite(!enabled)
		}
	}

	const handleGlossaryClick = (novelId: string) => {
		setCurrentNovelId(novelId)
		setGlossaryModalOpen(true)
	}

	return (
		<div className='container'>
			<Header
				darkMode={darkMode}
				setDarkMode={setDarkMode}
				aiRewrite={aiRewrite}
				setAiRewrite={setAiRewrite}
				onSettingsClick={() => setSettingsModalOpen(true)}
			/>

			{loading && <div id='loading'>Loading novels...</div>}
			{error && <div id='error'>{error}</div>}

			<div id='novels'>
				{novels.map((novel) => (
					<NovelCard
						key={novel.id}
						novel={novel}
						onGlossaryClick={() => handleGlossaryClick(novel.id)}
					/>
				))}
			</div>

			<SettingsModal
				isOpen={isSettingsModalOpen}
				onClose={() => setSettingsModalOpen(false)}
				aiRewrite={aiRewrite}
				setAiRewrite={setAiRewrite}
			/>

			<GlossaryModal
				isOpen={isGlossaryModalOpen}
				onClose={() => {
					setGlossaryModalOpen(false)
					setCurrentNovelId(null)
				}}
				novelId={currentNovelId}
			/>
		</div>
	)
}
