import { Body, Controller, Post } from '@nestjs/common';
import { ReviewService } from './review.service.js';
import { ReviewDto } from './dto/review.dto.js';
import { ApiConsumes, ApiTags } from '@nestjs/swagger';

@Controller('review')
@ApiTags('review')
export class ReviewController {
  constructor(private readonly reviewService: ReviewService) {}

  @Post()
  @ApiConsumes('application/json')
  async review(@Body() dto: ReviewDto) {
    return await this.reviewService.request(dto);
  }
}
