import { ApiProperty } from '@nestjs/swagger';

export class ReviewDto {
  @ApiProperty({
    required: true,
    nullable: false,
    type: String,
  })
  public githubToken: string;

  @ApiProperty({
    required: true,
    nullable: false,
    type: Number,
  })
  public pullRequestNumber: number;

  @ApiProperty({
    required: true,
    nullable: false,
    type: String,
  })
  public repository: string;
}
