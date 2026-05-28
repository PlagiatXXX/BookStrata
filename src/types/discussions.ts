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
}

export interface Discussion {
  id: string
  battleId: string
  title: string | null
  createdAt: string
  updatedAt: string
  messages: DiscussionMessage[]
}
