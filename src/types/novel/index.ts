export interface Novel {
	id: string
	title: string
	author: string
	description: string
	cover_url: string
	website: string
}

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
