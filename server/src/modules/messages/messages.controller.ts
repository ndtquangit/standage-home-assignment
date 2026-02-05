import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { MessagesService } from './messages.service';
import {
  CreateMessageDto,
  UpdateMessageDto,
  MessagesQueryDto,
  MessageResponseDto,
  PaginatedMessagesResponseDto,
} from './dto';

@Controller('rooms/:roomId/messages')
@UseGuards(JwtAuthGuard)
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Post()
  async create(
    @Param('roomId', ParseUUIDPipe) roomId: string,
    @Body() createMessageDto: CreateMessageDto,
    @CurrentUser() user: User,
  ): Promise<MessageResponseDto> {
    return this.messagesService.create(
      roomId,
      user.id,
      createMessageDto.content,
    );
  }

  @Get()
  async findAll(
    @Param('roomId', ParseUUIDPipe) roomId: string,
    @Query() query: MessagesQueryDto,
  ): Promise<PaginatedMessagesResponseDto> {
    return this.messagesService.findByRoom(roomId, query.cursor, query.limit);
  }

  @Patch(':messageId')
  async update(
    @Param('roomId', ParseUUIDPipe) roomId: string,
    @Param('messageId', ParseUUIDPipe) messageId: string,
    @Body() updateMessageDto: UpdateMessageDto,
    @CurrentUser() user: User,
  ): Promise<MessageResponseDto> {
    return this.messagesService.update(
      messageId,
      user.id,
      updateMessageDto.content,
    );
  }

  @Delete(':messageId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(
    @Param('roomId', ParseUUIDPipe) roomId: string,
    @Param('messageId', ParseUUIDPipe) messageId: string,
    @CurrentUser() user: User,
  ): Promise<void> {
    await this.messagesService.delete(messageId, user.id);
  }
}
