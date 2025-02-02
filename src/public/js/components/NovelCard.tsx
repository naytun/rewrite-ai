import React, { useState, useEffect } from 'react'

interface Novel {
	id: string
	title: string
	authors: string[]
	cover_url: string
}

interface NovelCardProps {
	novel: Novel
	onGlossaryClick: () => void
}

export const NovelCard: React.FC<NovelCardProps> = ({
	novel,
	onGlossaryClick,
}) => {
	const [lastChapter, setLastChapter] = useState<string>('Not started')
	const [hasGlossary, setHasGlossary] = useState<boolean>(false)

	useEffect(() => {
		const savedChapter = localStorage.getItem(`lastChapter_${novel.id}`)
		if (savedChapter) {
			setLastChapter(savedChapter)
		}
		checkGlossaryExists()
	}, [novel.id])

	const checkGlossaryExists = async () => {
		try {
			const response = await fetch(`/api/novel/novels/${novel.id}/glossary`)
			const data = await response.json()
			setHasGlossary(data && data.terms && data.terms.length > 0)
		} catch (error) {
			setHasGlossary(false)
		}
	}

	const handleLastChapterClick = async (e: React.MouseEvent) => {
		e.preventDefault()
		try {
			const response = await fetch('/api/settings/ai-rewrite')
			const settings = await response.json()
			const aiParam = settings.enabled ? '?useAI=true' : ''

			const lastVolume = localStorage.getItem(`lastVolume_${novel.id}`)
			if (lastChapter !== 'Not started' && lastVolume) {
				window.location.href = `/api/novel/novels/${
					novel.id
				}/chapters/${encodeURIComponent(lastVolume)}/${encodeURIComponent(
					lastChapter
				)}${aiParam}`
			} else {
				loadFirstChapter(aiParam)
			}
		} catch (error) {
			window.location.href = `/api/novel/novels/${novel.id}/chapters`
		}
	}

	const loadFirstChapter = async (aiParam: string) => {
		try {
			const response = await fetch(`/api/novel/novels/${novel.id}/chapters`)
			const data = await response.json()
			if (data.chapters && data.chapters.length > 0) {
				const firstChapter = data.chapters[0]
				window.location.href = `/api/novel/novels/${
					novel.id
				}/chapters/${encodeURIComponent(
					firstChapter.volume
				)}/${encodeURIComponent(firstChapter.chapter)}${aiParam}`
			} else {
				window.location.href = `/api/novel/novels/${novel.id}/chapters`
			}
		} catch (error) {
			window.location.href = `/api/novel/novels/${novel.id}/chapters`
		}
	}

	return (
		<div className='novel-card'>
			<div className='novel-image'>
				<a href='#' onClick={handleLastChapterClick}>
					<img
						src={novel.cover_url || '/placeholder.jpg'}
						alt='Cover'
						onError={(e) => {
							const target = e.target as HTMLImageElement
							target.src = '/placeholder.jpg'
						}}
					/>
				</a>
			</div>
			<div className='novel-content'>
				<div className='novel-title'>
					<a href={`/api/novel/novels/${novel.id}/chapters`}>{novel.title}</a>
				</div>
				<div className='novel-author'>
					Author: {novel.authors ? novel.authors.join(', ') : 'Unknown'}
				</div>
				<div className='novel-chapter'>
					<a href='#' onClick={handleLastChapterClick}>
						Chapter {lastChapter}
						<svg className='bookmark-icon' viewBox='0 0 20 20'>
							<path d='M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z' />
						</svg>
					</a>
					<button
						type='button'
						className='glossary-btn'
						onClick={onGlossaryClick}
					>
						<i className={`fas fa-${hasGlossary ? 'book' : 'plus'}`}></i>
						{hasGlossary ? ' Glossary' : ' Generate Glossary'}
					</button>
				</div>
			</div>
		</div>
	)
}
