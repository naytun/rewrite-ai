import React from 'react'

interface HeaderProps {
	darkMode: boolean
	setDarkMode: (value: boolean) => void
	aiRewrite: boolean
	setAiRewrite: (value: boolean) => void
	onSettingsClick: () => void
}

export const Header: React.FC<HeaderProps> = ({
	darkMode,
	setDarkMode,
	aiRewrite,
	setAiRewrite,
	onSettingsClick,
}) => {
	return (
		<header className='header'>
			<div className='header-content'>
				<div className='header-title'>Novel Library</div>
				<div className='header-controls'>
					<div className='toggle-container'>
						<span className='toggle-label'>AI Rewrite</span>
						<label className='toggle-switch'>
							<input
								type='checkbox'
								checked={aiRewrite}
								onChange={(e) => setAiRewrite(e.target.checked)}
							/>
							<span className='toggle-slider'></span>
						</label>
					</div>
					<div className='toggle-container'>
						<span className='toggle-label'>Dark Mode</span>
						<label className='toggle-switch'>
							<input
								type='checkbox'
								checked={darkMode}
								onChange={(e) => setDarkMode(e.target.checked)}
							/>
							<span className='toggle-slider'></span>
						</label>
					</div>
					<button className='settings-btn' onClick={onSettingsClick}>
						<i className='fas fa-cog'></i> AI Settings
					</button>
				</div>
			</div>
		</header>
	)
}
