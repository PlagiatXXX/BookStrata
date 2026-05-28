export interface DiscussionUser {
  id: number
  username: string
  avatarUrl: string | null
  role?: { name: string } | null
}

export interface DiscussionMessage {
  id: string
  content: string
  userId: number
  discussionId: string
  parentId: string | null
  createdAt: string
  updatedAt: string
  user: DiscussionUser
  replies: DiscussionMessage[]
  parent?: { user: { username: string } } | null
}

export interface Discussion {
  id: string
  battleId?: string | null
  title: string | null
  type: string
  createdAt: string
  updatedAt: string
  messages: DiscussionMessage[]
  author?: DiscussionUser | null
  lastMessageAt?: string | null
}

export interface DiscussionTopic {
  id: string
  title: string | null
  type: string
  createdAt: string
  updatedAt: string
  author?: DiscussionUser | null
  lastMessageAt?: string | null
  pinned: boolean
  pinnedAt?: string | null
  _count?: { messages: number }
}
