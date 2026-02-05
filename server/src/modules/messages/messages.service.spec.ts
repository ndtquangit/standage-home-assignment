import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { MessagesService } from './messages.service';
import { Message } from './entities/message.entity';
import { RoomsService } from '../rooms/rooms.service';
import { Room } from '../rooms/entities/room.entity';

describe('MessagesService', () => {
  let service: MessagesService;
  let messagesRepository: jest.Mocked<Repository<Message>>;
  let roomsService: jest.Mocked<RoomsService>;

  const mockRoom: Room = {
    id: 'room-123',
    name: 'Test Room',
    creatorId: 'user-creator',
    createdAt: new Date(),
  } as Room;

  const mockMessage: Message = {
    id: 'message-123',
    content: 'Hello world',
    senderId: 'user-alice',
    roomId: 'room-123',
    isEdited: false,
    createdAt: new Date('2024-01-01T10:00:00Z'),
    updatedAt: new Date('2024-01-01T10:00:00Z'),
    sender: {
      id: 'user-alice',
      nickname: 'alice',
    },
  } as Message;

  beforeEach(async () => {
    const mockMessagesRepository = {
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
      softDelete: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    const mockRoomsService = {
      findById: jest.fn(),
      isParticipant: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MessagesService,
        { provide: getRepositoryToken(Message), useValue: mockMessagesRepository },
        { provide: RoomsService, useValue: mockRoomsService },
      ],
    }).compile();

    service = module.get<MessagesService>(MessagesService);
    messagesRepository = module.get(getRepositoryToken(Message));
    roomsService = module.get(RoomsService);
  });

  describe('create', () => {
    it('should create a message successfully', async () => {
      roomsService.findById.mockResolvedValue(mockRoom);
      roomsService.isParticipant.mockResolvedValue(true);
      messagesRepository.create.mockReturnValue(mockMessage);
      messagesRepository.save.mockResolvedValue(mockMessage);
      messagesRepository.findOne.mockResolvedValue(mockMessage);

      const result = await service.create('room-123', 'user-alice', 'Hello world');

      expect(roomsService.findById).toHaveBeenCalledWith('room-123');
      expect(roomsService.isParticipant).toHaveBeenCalledWith('room-123', 'user-alice');
      expect(messagesRepository.create).toHaveBeenCalledWith({
        content: 'Hello world',
        senderId: 'user-alice',
        roomId: 'room-123',
      });
      expect(result.content).toBe('Hello world');
      expect(result.senderNickname).toBe('alice');
    });

    it('should throw NotFoundException if room not found', async () => {
      roomsService.findById.mockResolvedValue(null);

      await expect(
        service.create('non-existent', 'user-alice', 'Hello'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if user is not participant', async () => {
      roomsService.findById.mockResolvedValue(mockRoom);
      roomsService.isParticipant.mockResolvedValue(false);

      await expect(
        service.create('room-123', 'user-outsider', 'Hello'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('update (EDIT CONSTRAINT TESTS)', () => {
    /**
     * Edit Constraint Business Rule:
     * A user can only edit their message if:
     * 1. They own the message
     * 2. It's their last message in the room
     * 3. No other user has sent a message after theirs
     */

    it('should allow editing own last message when no one else sent after', async () => {
      const queryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(null), // No newer messages from others
      };

      messagesRepository.findOne
        .mockResolvedValueOnce(mockMessage) // Find message by id
        .mockResolvedValueOnce(mockMessage); // User's last message check

      messagesRepository.createQueryBuilder.mockReturnValue(queryBuilder as any);
      messagesRepository.save.mockResolvedValue({
        ...mockMessage,
        content: 'Edited content',
        isEdited: true,
      });

      const result = await service.update('message-123', 'user-alice', 'Edited content');

      expect(result.content).toBe('Edited content');
      expect(result.isEdited).toBe(true);
    });

    it('should REJECT editing if not the message owner', async () => {
      messagesRepository.findOne.mockResolvedValue(mockMessage);

      await expect(
        service.update('message-123', 'user-bob', 'Try to edit'),
      ).rejects.toThrow(ForbiddenException);
      await expect(
        service.update('message-123', 'user-bob', 'Try to edit'),
      ).rejects.toThrow('You can only edit your own messages');
    });

    it('should REJECT editing if not the last message', async () => {
      const olderMessage = { ...mockMessage, id: 'old-message' };
      const newerMessage = {
        ...mockMessage,
        id: 'newer-message',
        createdAt: new Date('2024-01-01T11:00:00Z'),
      };

      messagesRepository.findOne
        .mockResolvedValueOnce(olderMessage) // Find the old message
        .mockResolvedValueOnce(newerMessage); // User's last message is different

      await expect(
        service.update('old-message', 'user-alice', 'Try to edit old'),
      ).rejects.toThrow('You can only edit your last message');
    });

    it('should REJECT editing if another user sent a message after', async () => {
      const aliceMessage = mockMessage;
      const bobMessage = {
        ...mockMessage,
        id: 'bob-message',
        senderId: 'user-bob',
        createdAt: new Date('2024-01-01T11:00:00Z'),
      };

      const queryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(bobMessage), // Bob sent a message after
      };

      messagesRepository.findOne
        .mockResolvedValueOnce(aliceMessage) // Find Alice's message
        .mockResolvedValueOnce(aliceMessage); // It IS her last message

      messagesRepository.createQueryBuilder.mockReturnValue(queryBuilder as any);

      await expect(
        service.update('message-123', 'user-alice', 'Try to edit after Bob'),
      ).rejects.toThrow('Cannot edit message: another user has sent a message after yours');
    });

    it('should throw NotFoundException if message not found', async () => {
      messagesRepository.findOne.mockResolvedValue(null);

      await expect(
        service.update('non-existent', 'user-alice', 'content'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('delete', () => {
    it('should delete own message', async () => {
      messagesRepository.findOne.mockResolvedValue(mockMessage);
      messagesRepository.softDelete.mockResolvedValue(undefined);

      await service.delete('message-123', 'user-alice');

      expect(messagesRepository.softDelete).toHaveBeenCalledWith('message-123');
    });

    it('should throw ForbiddenException when deleting others message', async () => {
      messagesRepository.findOne.mockResolvedValue(mockMessage);

      await expect(service.delete('message-123', 'user-bob')).rejects.toThrow(
        ForbiddenException,
      );
      expect(messagesRepository.softDelete).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException if message not found', async () => {
      messagesRepository.findOne.mockResolvedValue(null);

      await expect(service.delete('non-existent', 'user-alice')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findByRoom', () => {
    it('should return paginated messages', async () => {
      const messages = [
        { ...mockMessage, id: 'msg-1' },
        { ...mockMessage, id: 'msg-2' },
      ];

      const queryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(messages),
      };

      roomsService.findById.mockResolvedValue(mockRoom);
      messagesRepository.createQueryBuilder.mockReturnValue(queryBuilder as any);

      const result = await service.findByRoom('room-123', undefined, 50);

      expect(result.messages).toHaveLength(2);
      expect(result.hasMore).toBe(false);
    });

    it('should return hasMore=true when more messages exist', async () => {
      // Return 51 messages (limit + 1) to indicate more exist
      const messages = Array(51)
        .fill(null)
        .map((_, i) => ({ ...mockMessage, id: `msg-${i}` }));

      const queryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(messages),
      };

      roomsService.findById.mockResolvedValue(mockRoom);
      messagesRepository.createQueryBuilder.mockReturnValue(queryBuilder as any);

      const result = await service.findByRoom('room-123', undefined, 50);

      expect(result.messages).toHaveLength(50);
      expect(result.hasMore).toBe(true);
      expect(result.nextCursor).toBe('msg-49');
    });

    it('should throw NotFoundException if room not found', async () => {
      roomsService.findById.mockResolvedValue(null);

      await expect(service.findByRoom('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
