export class ParticipantResponseDto {
  id: string;
  userId: string;
  nickname: string;
  isOnline: boolean;
  joinedAt: Date;
}

export class RoomResponseDto {
  id: string;
  name: string;
  creatorId: string;
  createdAt: Date;
  participantCount?: number;
}

export class RoomDetailResponseDto extends RoomResponseDto {
  participants: ParticipantResponseDto[];
}
