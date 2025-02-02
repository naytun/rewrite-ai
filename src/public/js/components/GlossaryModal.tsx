import React, { useState, useEffect } from 'react'

interface GlossaryTerm {
	term: string
	description: string
	type: string
}

interface Glossary {
	terms: GlossaryTerm[]
	lastUpdated?: string
}

interface GlossaryModalProps {
	isOpen: boolean
	onClose: () => void
	novelId: string | null
}

export const GlossaryModal: React.FC<GlossaryModalProps> = ({
	isOpen,
	onClose,
	novelId,
}) => {
	const [glossary, setGlossary] = useState<Glossary | null>(null)
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)
	const [generating, setGenerating] = useState(false)
	const [currentState, setCurrentState] = useState<string>('')

	useEffect(() => {
		if (isOpen && novelId) {
			checkGlossary()
		}
	}, [isOpen, novelId])

	const checkGlossary = async () => {
		if (!novelId) return

		setLoading(true)
		setError(null)

		try {
			const response = await fetch(`/api/novel/novels/${novelId}/glossary`)
			if (response.ok) {
				const data = await response.json()
				if (data && data.terms && data.terms.length > 0) {
					setGlossary(data)
					setGenerating(false)
				} else {
					setGlossary(null)
					startGeneration()
				}
			} else {
				setGlossary(null)
				startGeneration()
			}
		} catch (error) {
			setError('Error checking glossary status')
		} finally {
			setLoading(false)
		}
	}

	const startGeneration = async () => {
		if (!novelId) return

		setGenerating(true)
		setError(null)

		// Start state polling
		const stateInterval = setInterval(async () => {
			try {
				const stateResponse = await fetch(
					`/api/novel/novels/${novelId}/glossary/state`
				)
				if (stateResponse.ok) {
					const stateData = await stateResponse.json()
					setCurrentState(stateData.message || stateData.state)

					if (stateData.state === 'cancelled') {
						clearInterval(stateInterval)
						setGenerating(false)
						setError('Generation was cancelled')
					}
				}
			} catch (error) {
				console.error('Error checking generation state:', error)
			}
		}, 1000)

		try {
			const response = await fetch(
				`/api/novel/novels/${novelId}/glossary/generate`,
				{
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						Accept: 'application/json',
					},
					body: JSON.stringify({
						novelId,
						timestamp: new Date().toISOString(),
					}),
				}
			)

			clearInterval(stateInterval)

			if (response.ok) {
				const result = await response.json()
				if (result.status === 'cancelled') {
					setError('Generation was cancelled')
				} else if (result.glossary) {
					setGlossary(result.glossary)
				} else {
					setError('Invalid response from server')
				}
			} else {
				setError('Failed to generate glossary')
			}
		} catch (error) {
			setError('Error during generation')
		} finally {
			setGenerating(false)
		}
	}

	const stopGeneration = async () => {
		if (!novelId) return

		try {
			await fetch(`/api/novel/novels/${novelId}/glossary/cancel`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					novelId,
					timestamp: new Date().toISOString(),
					force: true,
				}),
			})

			// Set state to cancelled
			await fetch(`/api/novel/novels/${novelId}/glossary/state`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					state: 'cancelled',
					novelId,
					timestamp: new Date().toISOString(),
					force: true,
				}),
			})
		} catch (error) {
			console.error('Error cancelling generation:', error)
		}
	}

	if (!isOpen) return null

	const renderContent = () => {
		if (loading) {
			return <div className='glossary-loading'>Checking glossary status...</div>
		}

		if (error) {
			return <div className='glossary-error'>{error}</div>
		}

		if (generating) {
			return (
				<div className='glossary-loading'>
					<div className='generating-text'>Generating glossary...</div>
					<div className='generation-status'>Status: {currentState}</div>
					<button className='stop-btn' onClick={stopGeneration}>
						<i className='fas fa-stop'></i> Stop Generation
					</button>
				</div>
			)
		}

		if (!glossary || !glossary.terms || glossary.terms.length === 0) {
			return (
				<div className='glossary-loading'>No glossary terms available.</div>
			)
		}

		const types = {
			person: 'Characters',
			location: 'Locations',
			organization: 'Organizations',
			item: 'Items',
			technique: 'Techniques',
			other: 'Other Terms',
		}

		const termsByType = glossary.terms.reduce((acc, term) => {
			const type = term.type || 'other'
			if (!acc[type]) acc[type] = []
			acc[type].push(term)
			return acc
		}, {} as Record<string, GlossaryTerm[]>)

		return (
			<>
				{Object.entries(types).map(([type, title]) => {
					if (!termsByType[type] || termsByType[type].length === 0) return null

					return (
						<div key={type} className='glossary-section'>
							<h3 className='glossary-section-title'>{title}</h3>
							{termsByType[type].map((term, index) => (
								<div key={index} className='glossary-term'>
									<div className='glossary-term-title'>{term.term}</div>
									<div className='glossary-term-desc'>{term.description}</div>
								</div>
							))}
						</div>
					)
				})}
				{glossary.lastUpdated && (
					<div
						style={{
							fontSize: '12px',
							color: '#666',
							textAlign: 'right',
							marginTop: '20px',
						}}
					>
						Last updated: {new Date(glossary.lastUpdated).toLocaleString()}
					</div>
				)}
			</>
		)
	}

	return (
		<div id='glossaryModal' className='visible'>
			<div className='glossary-modal-content'>
				<div className='glossary-header'>
					<h2 className='glossary-title'>Glossary</h2>
					<button className='glossary-close' onClick={onClose}>
						&times;
					</button>
				</div>
				<div className='glossary-content'>{renderContent()}</div>
			</div>
		</div>
	)
}
