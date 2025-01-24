import { Request, Response } from 'express'
import {
	listChapters,
	readChapter,
	listNovels,
	getAIRewriteSettings,
	setAIRewriteSettings,
} from '../novel.controller'
import * as novelService from '../novel.service'

jest.mock('../novel.service')

describe('Novel Controller', () => {
	let mockRequest: Partial<Request>
	let mockResponse: Partial<Response>
	let mockJson: jest.Mock
	let mockStatus: jest.Mock
	let mockSend: jest.Mock

	beforeEach(() => {
		mockJson = jest.fn()
		mockStatus = jest.fn().mockReturnThis()
		mockSend = jest.fn()
		mockResponse = {
			json: mockJson,
			status: mockStatus,
			send: mockSend,
		}
		mockRequest = {}
		jest.clearAllMocks()
	})

	describe('listChapters', () => {
		it('should return chapters list for valid novel', async () => {
			const mockChapters = {
				title: 'Test Novel',
				chapters: [{ volume: '1', chapter: '1', path: 'vol1/chap1' }],
			}
			mockRequest.params = { novelId: 'test-novel' }
			jest.spyOn(novelService, 'listChapters').mockResolvedValue(mockChapters)

			await listChapters(mockRequest as Request, mockResponse as Response)

			expect(mockSend).toHaveBeenCalledWith(
				expect.stringContaining('Test Novel')
			)
		})

		it('should handle errors when listing chapters', async () => {
			mockRequest.params = { novelId: 'invalid-novel' }
			jest
				.spyOn(novelService, 'listChapters')
				.mockRejectedValue(new Error('Not found'))

			await listChapters(mockRequest as Request, mockResponse as Response)

			expect(mockStatus).toHaveBeenCalledWith(500)
			expect(mockSend).toHaveBeenCalledWith('Error loading chapters')
		})
	})

	describe('readChapter', () => {
		it('should return chapter content for valid chapter', async () => {
			const mockChapterData = {
				body: '<p>Test chapter content</p>',
			}
			mockRequest.params = {
				novelId: 'test-novel',
				volume: '1',
				chapter: '1',
			}
			jest.spyOn(novelService, 'readChapter').mockResolvedValue(mockChapterData)
			jest.spyOn(novelService, 'listChapters').mockResolvedValue({
				title: 'Test Novel',
				chapters: [{ volume: '1', chapter: '1', path: 'vol1/chap1' }],
			})

			await readChapter(mockRequest as Request, mockResponse as Response)

			expect(mockSend).toHaveBeenCalledWith(
				expect.stringContaining('Test chapter content')
			)
		})

		it('should handle errors when reading chapter', async () => {
			mockRequest.params = {
				novelId: 'invalid-novel',
				volume: '1',
				chapter: '1',
			}
			jest
				.spyOn(novelService, 'readChapter')
				.mockRejectedValue(new Error('Chapter not found'))

			await readChapter(mockRequest as Request, mockResponse as Response)

			expect(mockStatus).toHaveBeenCalledWith(500)
			expect(mockSend).toHaveBeenCalledWith('Error loading chapter')
		})
	})

	describe('listNovels', () => {
		it('should return list of novels', async () => {
			const mockNovels = [
				{
					id: 'test-novel',
					title: 'Test Novel',
					author: 'Test Author',
				},
			]
			jest.spyOn(novelService, 'listNovels').mockResolvedValue(mockNovels)

			await listNovels(mockRequest as Request, mockResponse as Response)

			expect(mockJson).toHaveBeenCalledWith(mockNovels)
		})

		it('should handle errors when listing novels', async () => {
			jest
				.spyOn(novelService, 'listNovels')
				.mockRejectedValue(new Error('Failed to list novels'))

			await listNovels(mockRequest as Request, mockResponse as Response)

			expect(mockStatus).toHaveBeenCalledWith(500)
			expect(mockJson).toHaveBeenCalledWith({
				error: 'Failed to list novels',
			})
		})
	})

	describe('AI Rewrite Settings', () => {
		// it('should get AI rewrite settings', async () => {
		// 	await getAIRewriteSettings(
		// 		mockRequest as Request,
		// 		mockResponse as Response
		// 	)
		// 	expect(mockJson).toHaveBeenCalledWith({
		// 		enabled: false,
		// 	})
		// })
		// it('should set AI rewrite settings', async () => {
		// 	mockRequest.body = { enabled: true }
		// 	await setAIRewriteSettings(
		// 		mockRequest as Request,
		// 		mockResponse as Response
		// 	)
		// 	expect(mockJson).toHaveBeenCalledWith({
		// 		enabled: true,
		// 	})
		// })
		// it('should handle invalid settings data', async () => {
		// 	mockRequest.body = { invalid: 'data' }
		// 	await setAIRewriteSettings(
		// 		mockRequest as Request,
		// 		mockResponse as Response
		// 	)
		// 	expect(mockStatus).toHaveBeenCalledWith(400)
		// 	expect(mockJson).toHaveBeenCalledWith({
		// 		error: 'Invalid settings data',
		// 	})
		// })
	})
})
