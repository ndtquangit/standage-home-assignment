import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  async findById(id: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { id } });
  }

  async findByNickname(nickname: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { nickname } });
  }

  async findBySessionToken(sessionToken: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { sessionToken } });
  }

  async create(nickname: string): Promise<User> {
    const user = this.usersRepository.create({ nickname });
    return this.usersRepository.save(user);
  }

  async updateSessionToken(
    userId: string,
    sessionToken: string | null,
  ): Promise<void> {
    await this.usersRepository.update(userId, { sessionToken });
  }

  async setOnline(userId: string, isOnline: boolean): Promise<void> {
    const updateData: Partial<User> = { isOnline };
    if (!isOnline) {
      updateData.lastSeenAt = new Date();
    }
    await this.usersRepository.update(userId, updateData);
  }

  async findAll(): Promise<User[]> {
    return this.usersRepository.find({
      order: { nickname: 'ASC' },
    });
  }

  async findOnlineUsers(): Promise<User[]> {
    return this.usersRepository.find({
      where: { isOnline: true },
      order: { nickname: 'ASC' },
    });
  }
}
