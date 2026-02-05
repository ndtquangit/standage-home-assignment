import { Socket } from 'socket.io';
import { User } from '../../modules/users/entities/user.entity';

export interface AuthenticatedSocket extends Socket {
  user: User;
}
