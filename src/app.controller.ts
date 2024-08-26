import {
  Body,
  Controller,
  Get,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { AppService } from './app.service.js';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiConsumes } from '@nestjs/swagger';
import { Settings, Ollama } from 'llamaindex';
import { ConfigService } from '@nestjs/config';
import got from 'got';
import { GitDto } from './git.dto.js';
import { Octokit } from 'octokit';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly configService: ConfigService,
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Post('review')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('application/json')
  async review(@Body() dto: GitDto) {
    console.log('review call');
    console.log({ dto });

    const [owner, repository] = dto.repository.split('/');
    const url = `/repos/${owner}/${repository}/pulls/${dto.pullRequestNumber}`;

    const octokit = new Octokit({
      auth: dto.githubToken,
    });

    const result = await octokit.request(`GET ${url}`, {
      owner,
      repo: repository,
      pull_number: dto.pullRequestNumber,
      headers: {
        'X-GitHub-Api-Version': '2022-11-28',
      },
    });

    // console.log({ result });

    const files = await octokit.rest.pulls.listFiles({
      owner,
      repo: repository,
      pull_number: dto.pullRequestNumber,
      headers: {
        'X-GitHub-Api-Version': '2022-11-28',
      },
    });

    // const files = await octokit.request(
    //   `GET /repos/${owner}/${repository}/pulls/${dto.pullRequestNumber}/files`,
    //   {
    //     owner,
    //     repo: repository,
    //     pull_number: dto.pullRequestNumber,
    //     headers: {
    //       'X-GitHub-Api-Version': '2022-11-28',
    //     },
    //   },
    // );

    // console.log({ files });

    // console.log({ filesData: files.data });

    const filteredFiles = files.data
      .filter((file) => file.filename.includes('src/'))
      .map((file) => {
        return {
          fileName: file.filename,
          diff: file.patch,
        };
      });
    // console.log({ filteredFiles });
    console.log({ filteredFilesCount: filteredFiles.length });

    const formattedComment = `
        ## 📝 Code Review Summary
        
        ### ✅ Passed
        - All unit tests passed.
        - No major security issues found.
        
        ### ⚠️ Issues Found
        - **Function \`calculateTotal\`:** The performance can be improved by avoiding unnecessary loops.
        - **Variable \`userList\`:** The naming convention does not follow the project guidelines.
        
        ### 📈 Recommendations
        - Refactor the \`calculateTotal\` function to reduce the time complexity.
        - Rename \`userList\` to \`activeUsers\` to better reflect its purpose.
        
        ---
        
        **Overall:** Great work! Please address the mentioned issues before merging. 👍
    `;

    await octokit.rest.issues.createComment({
      owner,
      repo: repository,
      issue_number: dto.pullRequestNumber,
      body: formattedComment,
      headers: {
        'X-GitHub-Api-Version': '2022-11-28',
      },
    });

    console.log('commented');

    const llm = new Ollama({
      model: 'llama3',
      config: {
        host: 'http://localhost:11434',
      },
    });

    const diffContent = filteredFiles;

    console.time('llm');
    const review = await llm.complete({
      prompt: `
        You are a code review assistant. Your task is to review the following code changes made in a GitHub Pull Request.
        The purpose of the review is to identify potential issues, suggest improvements, and ensure that the code follows best practices.

        Please analyze the code considering the following aspects:
        1. **Code Quality**: Is the code well-written and maintainable? Are there any anti-patterns or redundant code?
        2. **Bugs**: Are there any potential bugs or logical errors in the code?
        3. **Security**: Does the code handle sensitive data correctly? Are there any security vulnerabilities or risky practices?
        4. **Performance**: Are there any parts of the code that could be optimized for better performance?
        5. **Documentation**: Are the comments and documentation sufficient and clear? Is it easy for other developers to understand the code?
        6. **Coding Style**: Does the code follow the project's coding standards and style guidelines?

        Here is the code diff that needs to be reviewed:
        [${diffContent}]

        Please provide your feedback in the following format:
        - **Issue**: [Describe the issue]
        - **Suggestion**: [Describe the recommended change]
        - **Example**: [Provide an example if applicable]

        Make sure to explain your reasoning for each suggestion, and if the code appears to be well-written and without issues, acknowledge that as well.
        `,
    });
    console.timeEnd('llm');
    console.log(review.text);
  }
}
