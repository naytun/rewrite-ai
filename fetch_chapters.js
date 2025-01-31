const fs = require('fs').promises
const path = require('path')

async function getNovelPath(novelId) {
	const basePath = 'Lightnovels'
	const websites = await fs.readdir(path.join(process.cwd(), basePath))

	for (const website of websites) {
		if (website.startsWith('.')) continue

		const websitePath = path.join(process.cwd(), basePath, website)
		const stat = await fs.stat(websitePath)

		if (stat.isDirectory()) {
			const novelFolders = await fs.readdir(websitePath)
			if (novelFolders.includes(novelId)) {
				return path.join(websitePath, novelId)
			}
		}
	}
	throw new Error('Novel not found')
}

function cleanHtml(html) {
	// Remove HTML tags but preserve paragraphs with newlines
	return html
		.replace(/<p>/g, '\n')
		.replace(/<\/p>/g, '')
		.replace(/<br\/?>/g, '\n')
		.replace(/<[^>]*>/g, '')
		.replace(/\n{3,}/g, '\n\n') // Replace multiple newlines with double newlines
		.trim()
}

async function getAllChapters(novelId) {
	try {
		const novelPath = await getNovelPath(novelId)
		const jsonPath = path.join(novelPath, 'json')
		const volumes = (await fs.readdir(jsonPath)).filter(
			(item) => !item.startsWith('.')
		)
		const allChapters = []

		for (const volume of volumes) {
			const volumePath = path.join(jsonPath, volume)
			const stat = await fs.stat(volumePath)
			if (!stat.isDirectory()) continue

			const chapters = (await fs.readdir(volumePath)).filter(
				(item) => !item.startsWith('.')
			)

			for (const chapter of chapters) {
				if (!chapter.endsWith('.json')) continue
				const chapterPath = path.join(volumePath, chapter)
				const chapterContent = await fs.readFile(chapterPath, 'utf-8')
				const chapterData = JSON.parse(chapterContent)
				allChapters.push({
					volume,
					chapter: chapter.replace('.json', ''),
					title: chapterData.title,
					content: cleanHtml(chapterData.body),
				})
			}
		}

		// Sort chapters by volume and chapter number
		allChapters.sort((a, b) => {
			const volA = a.volume.toLowerCase()
			const volB = b.volume.toLowerCase()
			if (volA !== volB) return volA.localeCompare(volB)
			return parseInt(a.chapter) - parseInt(b.chapter)
		})

		return allChapters
	} catch (error) {
		console.error('Error getting chapters:', error)
		throw error
	}
}

async function main() {
	try {
		const chapters = await getAllChapters('ImmortalMortal')
		await fs.writeFile(
			'ImmortalMortal_full.json',
			JSON.stringify({ chapters }, null, 2),
			'utf-8'
		)
		console.log('Successfully created ImmortalMortal_full.json')
	} catch (error) {
		console.error('Failed to process chapters:', error)
	}
}

main()
