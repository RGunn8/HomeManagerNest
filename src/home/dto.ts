import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateHomeDto {
  @ApiProperty() @IsString() @IsNotEmpty() name!: string;
}

export class CreateHomeInvitationDto {
  @ApiProperty({ example: 'family@example.com' }) @IsEmail() email!: string;
}

export class AcceptHomeInvitationDto {
  @ApiProperty() @IsString() @IsNotEmpty() token!: string;
}

export class HomeRoomDto {
  @ApiProperty() id!: string;
  @ApiProperty() name!: string;
  @ApiProperty({ type: String, nullable: true }) roomEmoji!: string | null;
  @ApiProperty() homeId!: string;
  @ApiProperty({ format: 'date-time' }) createdAt!: string;
  @ApiProperty({ format: 'date-time' }) updatedAt!: string;
}

export class HomeDto {
  @ApiProperty() id!: string;
  @ApiProperty() name!: string;
  @ApiProperty() ownerId!: string;
  @ApiProperty({ format: 'date-time' }) createdAt!: string;
  @ApiProperty({ format: 'date-time' }) updatedAt!: string;
}

export class HomeWithRoomsDto extends HomeDto {
  @ApiProperty({ type: [HomeRoomDto] }) rooms!: HomeRoomDto[];
}

export class HomeInvitationDto {
  @ApiProperty() id!: string;
  @ApiProperty() homeId!: string;
  @ApiProperty() email!: string;
  @ApiProperty({ description: 'Share with the invitee; it is only returned once' }) token!: string;
  @ApiProperty({ format: 'date-time' }) expiresAt!: string;
}

export class AcceptHomeInvitationResponseDto {
  @ApiProperty() homeId!: string;
  @ApiProperty({ enum: ['MEMBER'] }) role!: 'MEMBER';
}

export class HomeMemberDto {
  @ApiProperty() id!: string;
  @ApiProperty() email!: string;
  @ApiProperty({ type: String, nullable: true }) firstName!: string | null;
  @ApiProperty({ type: String, nullable: true }) lastName!: string | null;
  @ApiProperty({ enum: ['OWNER', 'MEMBER'] }) role!: 'OWNER' | 'MEMBER';
}
