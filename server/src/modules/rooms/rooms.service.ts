import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { Room } from './entities/room.entity';
import { RoomParticipant } from './entities/room-participant.entity';
import {
  RoomResponseDto,
  RoomDetailResponseDto,
  ParticipantResponseDto,
} from './dto';

@Injectable()
export class RoomsService {
  private readonly logger = new Logger(RoomsService.name);

  constructor(
    @InjectRepository(Room)
    private readonly roomsRepository: Repository<Room>,
    @InjectRepository(RoomParticipant)
    private readonly participantsRepository: Repository<RoomParticipant>,
  ) {}

  async create(name: string, creatorId: string): Promise<RoomResponseDto> {
    const room = this.roomsRepository.create({
      name,
      creatorId,
    });

    const savedRoom = await this.roomsRepository.save(room);
    this.logger.log(`Room created: ${savedRoom.id} by user ${creatorId}`);

    // Auto-join creator to the room
    await this.joinRoom(savedRoom.id, creatorId);

    return this.toRoomResponse(savedRoom);
  }

  async findAll(): Promise<RoomResponseDto[]> {
    const rooms = await this.roomsRepository.find({
      order: { createdAt: 'DESC' },
    });

    // Get participant counts
    const roomsWithCounts = await Promise.all(
      rooms.map(async (room) => {
        const count = await this.participantsRepository.count({
          where: { roomId: room.id, leftAt: IsNull() },
        });
        return { ...this.toRoomResponse(room), participantCount: count };
      }),
    );

    return roomsWithCounts;
  }

  async findById(id: string): Promise<Room | null> {
    return this.roomsRepository.findOne({ where: { id } });
  }

  async findByIdWithParticipants(id: string): Promise<RoomDetailResponseDto> {
    const room = await this.roomsRepository.findOne({
      where: { id },
    });

    if (!room) {
      throw new NotFoundException('Room not found');
    }

    const participants = await this.participantsRepository.find({
      where: { roomId: id, leftAt: IsNull() },
      relations: ['user'],
      order: { joinedAt: 'ASC' },
    });

    return {
      ...this.toRoomResponse(room),
      participants: participants.map((p) => this.toParticipantResponse(p)),
    };
  }

  async delete(roomId: string, userId: string): Promise<void> {
    const room = await this.roomsRepository.findOne({
      where: { id: roomId },
    });

    if (!room) {
      throw new NotFoundException('Room not found');
    }

    if (room.creatorId !== userId) {
      throw new ForbiddenException('Only the room creator can delete the room');
    }

    // Soft delete the room (will also cascade to messages via DB)
    await this.roomsRepository.softDelete(roomId);
    this.logger.log(`Room deleted: ${roomId} by user ${userId}`);
  }

  async joinRoom(roomId: string, userId: string): Promise<void> {
    const room = await this.roomsRepository.findOne({
      where: { id: roomId },
    });

    if (!room) {
      throw new NotFoundException('Room not found');
    }

    // Check if user is already a participant
    const existingParticipant = await this.participantsRepository.findOne({
      where: { roomId, userId },
    });

    if (existingParticipant) {
      if (existingParticipant.leftAt === null) {
        throw new ConflictException('Already a member of this room');
      }
      // Re-join: clear leftAt
      existingParticipant.leftAt = null;
      await this.participantsRepository.save(existingParticipant);
      this.logger.log(`User ${userId} re-joined room ${roomId}`);
      return;
    }

    // Create new participant
    const participant = this.participantsRepository.create({
      roomId,
      userId,
    });

    await this.participantsRepository.save(participant);
    this.logger.log(`User ${userId} joined room ${roomId}`);
  }

  async leaveRoom(roomId: string, userId: string): Promise<void> {
    const participant = await this.participantsRepository.findOne({
      where: { roomId, userId, leftAt: IsNull() },
    });

    if (!participant) {
      throw new NotFoundException('Not a member of this room');
    }

    participant.leftAt = new Date();
    await this.participantsRepository.save(participant);
    this.logger.log(`User ${userId} left room ${roomId}`);
  }

  async getParticipants(roomId: string): Promise<ParticipantResponseDto[]> {
    const room = await this.roomsRepository.findOne({
      where: { id: roomId },
    });

    if (!room) {
      throw new NotFoundException('Room not found');
    }

    const participants = await this.participantsRepository.find({
      where: { roomId, leftAt: IsNull() },
      relations: ['user'],
      order: { joinedAt: 'ASC' },
    });

    return participants.map((p) => this.toParticipantResponse(p));
  }

  async isParticipant(roomId: string, userId: string): Promise<boolean> {
    const participant = await this.participantsRepository.findOne({
      where: { roomId, userId, leftAt: IsNull() },
    });
    return !!participant;
  }

  async getUserRooms(userId: string): Promise<Room[]> {
    const participants = await this.participantsRepository.find({
      where: { userId, leftAt: IsNull() },
      relations: ['room'],
    });

    return participants
      .map((p) => p.room)
      .filter((room) => room.deletedAt === null);
  }

  private toRoomResponse(room: Room): RoomResponseDto {
    return {
      id: room.id,
      name: room.name,
      creatorId: room.creatorId,
      createdAt: room.createdAt,
    };
  }

  private toParticipantResponse(
    participant: RoomParticipant,
  ): ParticipantResponseDto {
    return {
      id: participant.id,
      userId: participant.userId,
      nickname: participant.user.nickname,
      isOnline: participant.user.isOnline,
      joinedAt: participant.joinedAt,
    };
  }
}
