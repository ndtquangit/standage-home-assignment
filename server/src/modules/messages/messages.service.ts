import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Message } from './entities/message.entity';
import { RoomsService } from '../rooms/rooms.service';
import { MessageResponseDto, PaginatedMessagesResponseDto } from './dto';

@Injectable()
export class MessagesService {
  private readonly logger = new Logger(MessagesService.name);

  constructor(
    @InjectRepository(Message)
    private readonly messagesRepository: Repository<Message>,
    private readonly roomsService: RoomsService,
  ) {}

  async create(
    roomId: string,
    senderId: string,
    content: string,
  ): Promise<MessageResponseDto> {
    // Verify room exists
    const room = await this.roomsService.findById(roomId);
    if (!room) {
      throw new NotFoundException('Room not found');
    }

    // Verify user is a participant
    const isParticipant = await this.roomsService.isParticipant(
      roomId,
      senderId,
    );
    if (!isParticipant) {
      throw new ForbiddenException('You must join the room to send messages');
    }

    const message = this.messagesRepository.create({
      content,
      senderId,
      roomId,
    });

    const savedMessage = await this.messagesRepository.save(message);
    this.logger.log(`Message created: ${savedMessage.id} in room ${roomId}`);

    // Reload with sender relation
    const messageWithSender = await this.messagesRepository.findOne({
      where: { id: savedMessage.id },
      relations: ['sender'],
    });

    return this.toMessageResponse(messageWithSender!);
  }

  async findByRoom(
    roomId: string,
    cursor?: string,
    limit: number = 50,
  ): Promise<PaginatedMessagesResponseDto> {
    // Verify room exists
    const room = await this.roomsService.findById(roomId);
    if (!room) {
      throw new NotFoundException('Room not found');
    }

    const queryBuilder = this.messagesRepository
      .createQueryBuilder('message')
      .leftJoinAndSelect('message.sender', 'sender')
      .where('message.roomId = :roomId', { roomId })
      .orderBy('message.createdAt', 'DESC')
      .take(limit + 1); // Fetch one extra to check if there are more

    if (cursor) {
      // Get the cursor message to find its createdAt
      const cursorMessage = await this.messagesRepository.findOne({
        where: { id: cursor },
      });

      if (cursorMessage) {
        queryBuilder.andWhere('message.createdAt < :cursorDate', {
          cursorDate: cursorMessage.createdAt,
        });
      }
    }

    const messages = await queryBuilder.getMany();

    const hasMore = messages.length > limit;
    const resultMessages = hasMore ? messages.slice(0, limit) : messages;
    const nextCursor = hasMore
      ? resultMessages[resultMessages.length - 1].id
      : null;

    return {
      messages: resultMessages.map((m) => this.toMessageResponse(m)),
      nextCursor,
      hasMore,
    };
  }

  async findById(id: string): Promise<Message | null> {
    return this.messagesRepository.findOne({
      where: { id },
      relations: ['sender'],
    });
  }

  async update(
    messageId: string,
    userId: string,
    content: string,
  ): Promise<MessageResponseDto> {
    const message = await this.messagesRepository.findOne({
      where: { id: messageId },
      relations: ['sender'],
    });

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    // Check ownership
    if (message.senderId !== userId) {
      throw new ForbiddenException('You can only edit your own messages');
    }

    // Check if this is the user's last message in the room
    const userLastMessage = await this.messagesRepository.findOne({
      where: { roomId: message.roomId, senderId: userId },
      order: { createdAt: 'DESC' },
    });

    if (!userLastMessage || userLastMessage.id !== messageId) {
      throw new ForbiddenException('You can only edit your last message');
    }

    // Check if any other user sent a message after this one
    const newerMessageFromOthers = await this.messagesRepository
      .createQueryBuilder('message')
      .where('message.roomId = :roomId', { roomId: message.roomId })
      .andWhere('message.senderId != :userId', { userId })
      .andWhere('message.createdAt > :messageDate', {
        messageDate: message.createdAt,
      })
      .getOne();

    if (newerMessageFromOthers) {
      throw new ForbiddenException(
        'Cannot edit message: another user has sent a message after yours',
      );
    }

    // Update the message
    message.content = content;
    message.isEdited = true;
    const updatedMessage = await this.messagesRepository.save(message);

    this.logger.log(`Message updated: ${messageId} by user ${userId}`);

    return this.toMessageResponse(updatedMessage);
  }

  async delete(messageId: string, userId: string): Promise<void> {
    const message = await this.messagesRepository.findOne({
      where: { id: messageId },
    });

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    // Check ownership
    if (message.senderId !== userId) {
      throw new ForbiddenException('You can only delete your own messages');
    }

    // Soft delete the message
    await this.messagesRepository.softDelete(messageId);
    this.logger.log(`Message deleted: ${messageId} by user ${userId}`);
  }

  private toMessageResponse(message: Message): MessageResponseDto {
    return {
      id: message.id,
      content: message.content,
      senderId: message.senderId,
      senderNickname: message.sender.nickname,
      roomId: message.roomId,
      isEdited: message.isEdited,
      createdAt: message.createdAt,
      updatedAt: message.updatedAt,
    };
  }
}
