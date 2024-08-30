import { Module } from '@nestjs/common';
import { ReviewController } from './review.controller.js';
import { ReviewService } from './review.service.js';
import { GitHub } from './domain/github.js';
import { LLM } from './domain/llm.js';

@Module({
  imports: [],
  controllers: [ReviewController],
  providers: [ReviewService, GitHub, LLM],
})
export class ReviewModule {}
