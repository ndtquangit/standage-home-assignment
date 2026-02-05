export class MessageResponseDto {
  id: string;
  content: string;
  senderId: string;
  senderNickname: string;
  roomId: string;
  isEdited: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class PaginatedMessagesResponseDto {
  messages: MessageResponseDto[];
  nextCursor: string | null;
  hasMore: boolean;
}
