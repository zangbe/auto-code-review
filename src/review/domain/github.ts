import { Injectable } from '@nestjs/common';
import { Octokit } from 'octokit';

@Injectable()
export class GitHub extends Octokit {
  async getDiffFiles(
    owner: string,
    repository: string,
    pullRequestNumber: number,
  ) {
    const files = await this.rest.pulls.listFiles({
      owner,
      repo: repository,
      pull_number: pullRequestNumber,
      headers: {
        'X-GitHub-Api-Version': '2022-11-28',
      },
    });

    return files.data
      .filter((file) => file.filename.includes('src/'))
      .filter((file) => !file.filename.includes('module'))
      .filter((file) => !file.filename.includes('spec'))
      .filter((file) => !file.filename.includes('app'))
      .map((file) => {
        return {
          fileName: file.filename,
          diff: file.patch,
        };
      });
  }

  async createComment(
    owner: string,
    repository: string,
    pullRequestNumber: number,
    feedback: string,
  ) {
    await this.rest.issues.createComment({
      owner,
      repo: repository,
      issue_number: pullRequestNumber,
      body: feedback,
      headers: {
        'X-GitHub-Api-Version': '2022-11-28',
      },
    });
  }
}
