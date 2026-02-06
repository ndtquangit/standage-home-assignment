import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { RoomsService } from './rooms.service';
import { ChatGateway } from '../chat/chat.gateway';
import {
  CreateRoomDto,
  RoomResponseDto,
  RoomDetailResponseDto,
  ParticipantResponseDto,
} from './dto';

@Controller('rooms')
@UseGuards(JwtAuthGuard)
export class RoomsController {
  constructor(
    private readonly roomsService: RoomsService,
    @Inject(forwardRef(() => ChatGateway))
    private readonly chatGateway: ChatGateway,
  ) {}

  @Post()
  async create(
    @Body() createRoomDto: CreateRoomDto,
    @CurrentUser() user: User,
  ): Promise<RoomResponseDto> {
    const room = await this.roomsService.create(createRoomDto.name, user.id);
    this.chatGateway.broadcastRoomCreated({ ...room, participantCount: 1 });
    return room;
  }

  @Get()
  async findAll(): Promise<RoomResponseDto[]> {
    return this.roomsService.findAll();
  }

  @Get(':id')
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<RoomDetailResponseDto> {
    return this.roomsService.findByIdWithParticipants(id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ): Promise<void> {
    await this.roomsService.delete(id, user.id);
  }

  @Post(':id/join')
  @HttpCode(HttpStatus.NO_CONTENT)
  async join(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ): Promise<void> {
    await this.roomsService.joinRoom(id, user.id);
  }

  @Post(':id/leave')
  @HttpCode(HttpStatus.NO_CONTENT)
  async leave(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ): Promise<void> {
    await this.roomsService.leaveRoom(id, user.id);
  }

  @Get(':id/participants')
  async getParticipants(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ParticipantResponseDto[]> {
    return this.roomsService.getParticipants(id);
  }
}
