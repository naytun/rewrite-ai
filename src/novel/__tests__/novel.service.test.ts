import '@jest/globals'
import { promises as fs } from 'fs'
import path from 'path'
import { listChapters, readChapter, listNovels } from '../novel.service'
import { askAI } from '../../orama/orama.service'

// Mock dependencies
jest.mock('fs', () => ({
	promises: {
		readdir: jest.fn(),
		stat: jest.fn(),
		readFile: jest.fn(),
	},
}))

jest.mock('../../orama/orama.service', () => ({
	askAI: jest.fn(),
}))

describe('Novel Service', () => {
	const mockNovelId = 'test-novel'
	const mockVolume = 'Volume 1'
	const mockChapter = '1'
	const mockBasePath = 'Lightnovels'
	const mockWebsite = 'website-1'

	beforeEach(() => {
		jest.clearAllMocks()
		process.cwd = jest.fn().mockReturnValue('/mock/path')
	})

	describe('listChapters', () => {
		// it('should list chapters for a valid novel', async () => {
		// 	const mockMetadata = {
		// 		novel: {
		// 			title: 'Test Novel',
		// 		},
		// 	}

		// 	// Mock filesystem operations for the expected directory structure
		// 	;(fs.readdir as jest.Mock).mockImplementation((p: string) => {
		// 		if (p.endsWith(mockBasePath)) {
		// 			return Promise.resolve([mockWebsite])
		// 		}
		// 		if (p.includes(mockWebsite)) {
		// 			return Promise.resolve([mockNovelId])
		// 		}
		// 		if (p.includes('json') && !p.includes('Volume')) {
		// 			return Promise.resolve(['Volume 1', 'Volume 2'])
		// 		}
		// 		if (p.includes('Volume 1')) {
		// 			return Promise.resolve(['1.json', '2.json'])
		// 		}
		// 		if (p.includes('Volume 2')) {
		// 			return Promise.resolve(['3.json', '4.json'])
		// 		}
		// 		return Promise.resolve([])
		// 	})
		// 	;(fs.stat as jest.Mock).mockImplementation(() =>
		// 		Promise.resolve({ isDirectory: () => true })
		// 	)
		// 	;(fs.readFile as jest.Mock).mockResolvedValue(
		// 		JSON.stringify(mockMetadata)
		// 	)

		// 	const result = await listChapters(mockNovelId)

		// 	expect(result).toEqual({
		// 		title: 'Test Novel',
		// 		chapters: [
		// 			{
		// 				volume: 'Volume 1',
		// 				chapter: '1',
		// 				path: 'Volume 1/1.json',
		// 			},
		// 			{
		// 				volume: 'Volume 1',
		// 				chapter: '2',
		// 				path: 'Volume 1/2.json',
		// 			},
		// 			{
		// 				volume: 'Volume 2',
		// 				chapter: '3',
		// 				path: 'Volume 2/3.json',
		// 			},
		// 			{
		// 				volume: 'Volume 2',
		// 				chapter: '4',
		// 				path: 'Volume 2/4.json',
		// 			},
		// 		],
		// 	})
		// })

		it('should throw error when novel is not found', async () => {
			;(fs.readdir as jest.Mock).mockImplementation((p) => {
				const normalizedPath = path.normalize(p)
				if (normalizedPath.endsWith(mockBasePath)) {
					return Promise.resolve([mockWebsite])
				}
				return Promise.resolve([])
			})
			;(fs.stat as jest.Mock).mockImplementation(() =>
				Promise.resolve({ isDirectory: () => true })
			)

			await expect(listChapters('non-existent-novel')).rejects.toThrow(
				'Novel not found'
			)
		})
	})

	describe('readChapter', () => {
		const mockChapterData = {
			body: '<p>Test chapter content</p><br/>More content</p>',
		}

		it('should read chapter without AI rewrite', async () => {
			;(fs.readdir as jest.Mock).mockImplementation((p) => {
				const normalizedPath = path.normalize(p)
				if (normalizedPath.endsWith(mockBasePath)) {
					return Promise.resolve([mockWebsite])
				}
				if (normalizedPath.includes(mockWebsite)) {
					return Promise.resolve([mockNovelId])
				}
				return Promise.resolve([])
			})
			;(fs.stat as jest.Mock).mockImplementation(() =>
				Promise.resolve({ isDirectory: () => true })
			)
			;(fs.readFile as jest.Mock).mockImplementation(() =>
				Promise.resolve(JSON.stringify(mockChapterData))
			)

			const result = await readChapter(
				mockNovelId,
				mockVolume,
				mockChapter,
				false
			)

			expect(result).toEqual(mockChapterData)
			expect(askAI).not.toHaveBeenCalled()
		})

		it('should read chapter with AI rewrite', async () => {
			const mockAIResponse = 'AI rewritten content'
			;(fs.readdir as jest.Mock).mockImplementation((p) => {
				const normalizedPath = path.normalize(p)
				if (normalizedPath.endsWith(mockBasePath)) {
					return Promise.resolve([mockWebsite])
				}
				if (normalizedPath.includes(mockWebsite)) {
					return Promise.resolve([mockNovelId])
				}
				return Promise.resolve([])
			})
			;(fs.stat as jest.Mock).mockImplementation(() =>
				Promise.resolve({ isDirectory: () => true })
			)
			;(fs.readFile as jest.Mock).mockImplementation(() =>
				Promise.resolve(JSON.stringify(mockChapterData))
			)
			;(askAI as jest.Mock).mockResolvedValue(mockAIResponse)

			const result = await readChapter(
				mockNovelId,
				mockVolume,
				mockChapter,
				true
			)

			expect(result.body).toContain(mockAIResponse)
			expect(askAI).toHaveBeenCalled()
		})
	})

	describe('listNovels', () => {
		it('should list all available novels', async () => {
			const mockMetadata = {
				novel: {
					title: 'Test Novel',
					author: 'Test Author',
				},
			}

			;(fs.readdir as jest.Mock).mockImplementation((p) => {
				const normalizedPath = path.normalize(p)
				if (normalizedPath.endsWith(mockBasePath)) {
					return Promise.resolve([mockWebsite])
				}
				if (normalizedPath.includes(mockWebsite)) {
					return Promise.resolve([mockNovelId])
				}
				return Promise.resolve([])
			})
			;(fs.stat as jest.Mock).mockImplementation(() =>
				Promise.resolve({ isDirectory: () => true })
			)
			;(fs.readFile as jest.Mock).mockImplementation(() =>
				Promise.resolve(JSON.stringify(mockMetadata))
			)

			const result = await listNovels()

			expect(result).toEqual([
				{
					id: mockNovelId,
					website: mockWebsite,
					title: mockMetadata.novel.title,
					author: mockMetadata.novel.author,
					cover_url: `/covers/${mockWebsite}/${mockNovelId}/cover.jpg`,
				},
			])
		})

		it('should handle errors when reading novel metadata', async () => {
			;(fs.readdir as jest.Mock).mockImplementation((p) => {
				const normalizedPath = path.normalize(p)
				if (normalizedPath.endsWith(mockBasePath)) {
					return Promise.resolve([mockWebsite])
				}
				if (normalizedPath.includes(mockWebsite)) {
					return Promise.resolve([mockNovelId])
				}
				return Promise.resolve([])
			})
			;(fs.stat as jest.Mock).mockImplementation(() =>
				Promise.resolve({ isDirectory: () => true })
			)
			;(fs.readFile as jest.Mock).mockRejectedValue(
				new Error('Failed to read metadata')
			)

			const result = await listNovels()

			expect(result).toEqual([]) // Should return empty array when metadata read fails
		})
	})
})
