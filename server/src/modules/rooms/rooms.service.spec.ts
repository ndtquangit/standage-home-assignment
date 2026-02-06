import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { RoomsService } from './rooms.service';
import { Room } from './entities/room.entity';
import { RoomParticipant } from './entities/room-participant.entity';

describe('RoomsService', () => {
  let service: RoomsService;
  let roomsRepository: jest.Mocked<Repository<Room>>;
  let participantsRepository: jest.Mocked<Repository<RoomParticipant>>;

  const mockRoom: Room = {
    id: 'room-123',
    name: 'Test Room',
    creatorId: 'user-creator',
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    creator: null as any,
    participants: [],
    messages: [],
  } as Room;

  const mockParticipant: RoomParticipant = {
    id: 'participant-123',
    roomId: 'room-123',
    userId: 'user-123',
    joinedAt: new Date(),
    leftAt: null,
    user: {
      id: 'user-123',
      nickname: 'testuser',
      isOnline: true,
    },
  } as RoomParticipant;

  beforeEach(async () => {
    const mockRoomsRepository = {
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
      softDelete: jest.fn(),
    };

    const mockParticipantsRepository = {
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
      count: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RoomsService,
        { provide: getRepositoryToken(Room), useValue: mockRoomsRepository },
        {
          provide: getRepositoryToken(RoomParticipant),
          useValue: mockParticipantsRepository,
        },
      ],
    }).compile();

    service = module.get<RoomsService>(RoomsService);
    roomsRepository = module.get(getRepositoryToken(Room));
    participantsRepository = module.get(getRepositoryToken(RoomParticipant));
  });

  describe('create', () => {
    it('should create a room and auto-join creator', async () => {
      roomsRepository.create.mockReturnValue(mockRoom);
      roomsRepository.save.mockResolvedValue(mockRoom);
      roomsRepository.findOne.mockResolvedValue(mockRoom);
      participantsRepository.findOne.mockResolvedValue(null);
      participantsRepository.create.mockReturnValue(mockParticipant);
      participantsRepository.save.mockResolvedValue(mockParticipant);

      const result = await service.create('Test Room', 'user-creator');

      expect(roomsRepository.create).toHaveBeenCalledWith({
        name: 'Test Room',
        creatorId: 'user-creator',
      });
      expect(roomsRepository.save).toHaveBeenCalled();
      expect(result.id).toBe(mockRoom.id);
      expect(result.name).toBe(mockRoom.name);
    });
  });

  describe('delete', () => {
    it('should delete room if user is creator', async () => {
      roomsRepository.findOne.mockResolvedValue(mockRoom);
      roomsRepository.softDelete.mockResolvedValue({
        affected: 1,
        raw: [],
        generatedMaps: [],
      });

      await service.delete('room-123', 'user-creator');

      expect(roomsRepository.softDelete).toHaveBeenCalledWith('room-123');
    });

    it('should throw ForbiddenException if user is not creator', async () => {
      roomsRepository.findOne.mockResolvedValue(mockRoom);

      await expect(service.delete('room-123', 'other-user')).rejects.toThrow(
        ForbiddenException,
      );
      expect(roomsRepository.softDelete).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException if room not found', async () => {
      roomsRepository.findOne.mockResolvedValue(null);

      await expect(
        service.delete('non-existent', 'user-creator'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('joinRoom', () => {
    it('should create new participant if not exists', async () => {
      roomsRepository.findOne.mockResolvedValue(mockRoom);
      participantsRepository.findOne.mockResolvedValue(null);
      participantsRepository.create.mockReturnValue(mockParticipant);
      participantsRepository.save.mockResolvedValue(mockParticipant);

      await service.joinRoom('room-123', 'user-123');

      expect(participantsRepository.create).toHaveBeenCalledWith({
        roomId: 'room-123',
        userId: 'user-123',
      });
      expect(participantsRepository.save).toHaveBeenCalled();
    });

    it('should throw ConflictException if already a member', async () => {
      roomsRepository.findOne.mockResolvedValue(mockRoom);
      participantsRepository.findOne.mockResolvedValue({
        ...mockParticipant,
        leftAt: null,
      });

      await expect(service.joinRoom('room-123', 'user-123')).rejects.toThrow(
        ConflictException,
      );
    });

    it('should re-join if previously left', async () => {
      const leftParticipant = { ...mockParticipant, leftAt: new Date() };
      roomsRepository.findOne.mockResolvedValue(mockRoom);
      participantsRepository.findOne.mockResolvedValue(leftParticipant);
      participantsRepository.save.mockResolvedValue({
        ...leftParticipant,
        leftAt: null,
      });

      await service.joinRoom('room-123', 'user-123');

      expect(participantsRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ leftAt: null }),
      );
    });

    it('should throw NotFoundException if room not found', async () => {
      roomsRepository.findOne.mockResolvedValue(null);

      await expect(
        service.joinRoom('non-existent', 'user-123'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('leaveRoom', () => {
    it('should set leftAt timestamp on participant', async () => {
      participantsRepository.findOne.mockResolvedValue(mockParticipant);
      participantsRepository.save.mockResolvedValue({
        ...mockParticipant,
        leftAt: new Date(),
      });

      await service.leaveRoom('room-123', 'user-123');

      expect(participantsRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          leftAt: expect.any(Date),
        }),
      );
    });

    it('should throw NotFoundException if not a member', async () => {
      participantsRepository.findOne.mockResolvedValue(null);

      await expect(service.leaveRoom('room-123', 'user-123')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('isParticipant', () => {
    it('should return true if user is active participant', async () => {
      participantsRepository.findOne.mockResolvedValue(mockParticipant);

      const result = await service.isParticipant('room-123', 'user-123');

      expect(result).toBe(true);
    });

    it('should return false if user is not a participant', async () => {
      participantsRepository.findOne.mockResolvedValue(null);

      const result = await service.isParticipant('room-123', 'user-123');

      expect(result).toBe(false);
    });
  });

  describe('findByIdWithParticipants', () => {
    it('should return room with participants', async () => {
      roomsRepository.findOne.mockResolvedValue(mockRoom);
      participantsRepository.find.mockResolvedValue([mockParticipant]);

      const result = await service.findByIdWithParticipants('room-123');

      expect(result.id).toBe(mockRoom.id);
      expect(result.participants).toHaveLength(1);
      expect(result.participants[0].userId).toBe(mockParticipant.userId);
    });

    it('should throw NotFoundException if room not found', async () => {
      roomsRepository.findOne.mockResolvedValue(null);

      await expect(
        service.findByIdWithParticipants('non-existent'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getParticipants', () => {
    it('should return list of participants for room', async () => {
      roomsRepository.findOne.mockResolvedValue(mockRoom);
      participantsRepository.find.mockResolvedValue([mockParticipant]);

      const result = await service.getParticipants('room-123');

      expect(result).toHaveLength(1);
      expect(result[0].nickname).toBe('testuser');
    });

    it('should throw NotFoundException if room not found', async () => {
      roomsRepository.findOne.mockResolvedValue(null);

      await expect(service.getParticipants('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
