/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { User } from '../users/entities/user.entity';

describe('AuthService', () => {
  let service: AuthService;
  let usersService: jest.Mocked<UsersService>;
  let jwtService: jest.Mocked<JwtService>;

  const mockUser: User = {
    id: 'user-123',
    nickname: 'testuser',
    sessionToken: 'valid-token',
    isOnline: false,
    lastSeenAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as User;

  beforeEach(async () => {
    const mockUsersService = {
      findByNickname: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      updateSessionToken: jest.fn(),
      setOnline: jest.fn(),
    };

    const mockJwtService = {
      sign: jest.fn(),
      verify: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: mockUsersService },
        { provide: JwtService, useValue: mockJwtService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    usersService = module.get(UsersService);
    jwtService = module.get(JwtService);
  });

  describe('login', () => {
    it('should return existing user with new token', async () => {
      const token = 'new-jwt-token';
      usersService.findByNickname.mockResolvedValue(mockUser);
      jwtService.sign.mockReturnValue(token);
      usersService.updateSessionToken.mockResolvedValue(undefined);

      const result = await service.login('testuser');

      expect(usersService.findByNickname).toHaveBeenCalledWith('testuser');
      expect(usersService.create).not.toHaveBeenCalled();
      expect(jwtService.sign).toHaveBeenCalledWith({
        sub: mockUser.id,
        nickname: mockUser.nickname,
      });
      expect(usersService.updateSessionToken).toHaveBeenCalledWith(
        mockUser.id,
        token,
      );
      expect(result).toEqual({
        user: {
          id: mockUser.id,
          nickname: mockUser.nickname,
          isOnline: mockUser.isOnline,
          lastSeenAt: mockUser.lastSeenAt,
          createdAt: mockUser.createdAt,
        },
        accessToken: token,
      });
    });

    it('should create new user if not exists', async () => {
      const newUser = { ...mockUser, id: 'new-user-123' };
      const token = 'new-jwt-token';

      usersService.findByNickname.mockResolvedValue(null);
      usersService.create.mockResolvedValue(newUser);
      jwtService.sign.mockReturnValue(token);
      usersService.updateSessionToken.mockResolvedValue(undefined);

      const result = await service.login('newuser');

      expect(usersService.findByNickname).toHaveBeenCalledWith('newuser');
      expect(usersService.create).toHaveBeenCalledWith('newuser');
      expect(result.accessToken).toBe(token);
      expect(result.user.id).toBe(newUser.id);
    });
  });

  describe('logout', () => {
    it('should clear session token and set offline', async () => {
      usersService.updateSessionToken.mockResolvedValue(undefined);
      usersService.setOnline.mockResolvedValue(undefined);

      await service.logout('user-123');

      expect(usersService.updateSessionToken).toHaveBeenCalledWith(
        'user-123',
        null,
      );
      expect(usersService.setOnline).toHaveBeenCalledWith('user-123', false);
    });
  });

  describe('validateToken', () => {
    it('should return user for valid token', async () => {
      const token = 'valid-token';
      const userWithToken = { ...mockUser, sessionToken: token };

      jwtService.verify.mockReturnValue({
        sub: mockUser.id,
        nickname: 'testuser',
      });
      usersService.findById.mockResolvedValue(userWithToken);

      const result = await service.validateToken(token);

      expect(jwtService.verify).toHaveBeenCalledWith(token);
      expect(usersService.findById).toHaveBeenCalledWith(mockUser.id);
      expect(result).toEqual(userWithToken);
    });

    it('should return null for mismatched session token', async () => {
      const token = 'new-token';
      const userWithOldToken = { ...mockUser, sessionToken: 'old-token' };

      jwtService.verify.mockReturnValue({
        sub: mockUser.id,
        nickname: 'testuser',
      });
      usersService.findById.mockResolvedValue(userWithOldToken);

      const result = await service.validateToken(token);

      expect(result).toBeNull();
    });

    it('should return null for invalid token', async () => {
      jwtService.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      const result = await service.validateToken('invalid-token');

      expect(result).toBeNull();
    });

    it('should return null for non-existent user', async () => {
      jwtService.verify.mockReturnValue({
        sub: 'non-existent',
        nickname: 'test',
      });
      usersService.findById.mockResolvedValue(null);

      const result = await service.validateToken('valid-token');

      expect(result).toBeNull();
    });
  });

  describe('getMe', () => {
    it('should return user response for valid user', async () => {
      usersService.findById.mockResolvedValue(mockUser);

      const result = await service.getMe('user-123');

      expect(result).toEqual({
        id: mockUser.id,
        nickname: mockUser.nickname,
        isOnline: mockUser.isOnline,
        lastSeenAt: mockUser.lastSeenAt,
        createdAt: mockUser.createdAt,
      });
    });

    it('should throw UnauthorizedException for non-existent user', async () => {
      usersService.findById.mockResolvedValue(null);

      await expect(service.getMe('non-existent')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});
