import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { User } from '../users/entities/user.entity';
import { AuthResponseDto, UserResponseDto } from './dto';

export interface JwtPayload {
  sub: string;
  nickname: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async login(nickname: string): Promise<AuthResponseDto> {
    // Find or create user
    let user = await this.usersService.findByNickname(nickname);

    if (!user) {
      user = await this.usersService.create(nickname);
      this.logger.log(`Created new user: ${nickname}`);
    }

    // Generate JWT token
    const accessToken = this.generateToken(user);

    // Store session token in database
    await this.usersService.updateSessionToken(user.id, accessToken);

    return {
      user: this.toUserResponse(user),
      accessToken,
    };
  }

  async logout(userId: string): Promise<void> {
    await this.usersService.updateSessionToken(userId, null);
    await this.usersService.setOnline(userId, false);
  }

  async validateToken(token: string): Promise<User | null> {
    try {
      const payload = this.jwtService.verify<JwtPayload>(token);
      const user = await this.usersService.findById(payload.sub);

      // Verify the token matches the stored session
      if (user && user.sessionToken === token) {
        return user;
      }

      this.logger.debug(`Token validation failed: session mismatch`);
      return null;
    } catch (error) {
      this.logger.debug(
        `Token validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      return null;
    }
  }

  async getMe(userId: string): Promise<UserResponseDto> {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    return this.toUserResponse(user);
  }

  private generateToken(user: User): string {
    const payload: JwtPayload = {
      sub: user.id,
      nickname: user.nickname,
    };

    return this.jwtService.sign(payload);
  }

  private toUserResponse(user: User): UserResponseDto {
    return {
      id: user.id,
      nickname: user.nickname,
      isOnline: user.isOnline,
      lastSeenAt: user.lastSeenAt,
      createdAt: user.createdAt,
    };
  }
}
