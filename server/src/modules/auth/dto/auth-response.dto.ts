export class UserResponseDto {
  id: string;
  nickname: string;
  isOnline: boolean;
  lastSeenAt: Date | null;
  createdAt: Date;
}

export class AuthResponseDto {
  user: UserResponseDto;
  accessToken: string;
}
