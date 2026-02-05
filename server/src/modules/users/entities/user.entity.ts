import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 50, unique: true })
  @Index()
  nickname: string;

  @Column({
    name: 'session_token',
    type: 'varchar',
    length: 500,
    nullable: true,
  })
  @Index({ unique: true, where: '"session_token" IS NOT NULL' })
  sessionToken: string | null;

  @Column({ name: 'is_online', default: false })
  @Index()
  isOnline: boolean;

  @Column({ name: 'last_seen_at', type: 'timestamptz', nullable: true })
  lastSeenAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
