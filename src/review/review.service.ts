import { GitHub } from './domain/github.js';
import { ReviewDto } from './dto/review.dto.js';
import { Injectable } from '@nestjs/common';
import { LLM } from './domain/llm.js';

@Injectable()
export class ReviewService {
  constructor(private readonly llm: LLM) {}

  async request(dto: ReviewDto) {
    const [owner, repository] = dto.repository.split('/');

    const octokit = new GitHub({ auth: dto?.githubToken });

    const diffFiles = await octokit.getDiffFiles(
      owner,
      repository,
      dto?.pullRequestNumber,
    );

    const review = await this.llm.openAI.complete({
      prompt: this.llm.getPrompt(diffFiles),
    });

    await octokit.createComment(
      owner,
      repository,
      dto?.pullRequestNumber,
      review?.text,
    );

    return {
      reviewSuccess: true,
    };
  }
}
