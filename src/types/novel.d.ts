declare module 'novel' {
	export interface Chapter {
		volume: string
		chapter: string
		title?: string
	}

	export interface ChapterNavigation {
		current: Chapter
		prev?: Chapter
		next?: Chapter
	}
}
