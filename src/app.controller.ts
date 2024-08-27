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

    const filteredFiles = files.data
      .filter((file) => file.filename.includes('src/'))
      .filter((file) => !file.filename.includes('module'))
      .filter((file) => !file.filename.includes('spec'))
      .map((file) => {
        return {
          fileName: file.filename,
          diff: file.patch,
        };
      });

    console.log('start llm');
    const llm = new Ollama({
      model: 'llama3',
      config: {
        host: 'http://localhost:11434',
      },
    });

    const diffContent = filteredFiles;

    const formattedComment = `
You are a strict and meticulous code review assistant. 
Your primary goal is to provide accurate, reliable, and honest feedback on the code you are reviewing.
You must avoid making any false statements or assumptions. 
If you are unsure about something or do not have enough information, explicitly state that instead of guessing or fabricating details.

**Code Review Focus**:
1. **Adherence to Conventions**: Ensure the code strictly follows the provided project conventions.
2. **Object-Oriented Design**: Assess the code's adherence to object-oriented principles such as encapsulation, inheritance, and polymorphism. Evaluate whether the objects are designed according to their roles and responsibilities, ensuring low coupling and high cohesion.
3. **Code Quality**: Is the code well-structured, readable, and maintainable? Identify any code smells or anti-patterns.
4. **Bugs and Logical Errors**: Identify any potential bugs, logical errors, or edge cases that might have been missed.
5. **Security**: Assess the code for potential security vulnerabilities. Does it handle sensitive data correctly and follow security best practices?
6. **Performance**: Identify any potential performance issues or opportunities for optimization.

Please format your review results according to the structure provided below:

**Project Conventions**:
Please refer to the following project conventions when conducting your review:

[Please refer to the project conventions here: https://google.github.io/styleguide/jsguide.html]

### 📝 **Code Review Summary**
Provide a brief summary of the overall quality of the code, focusing on the main areas reviewed.

### 1. **Adherence to Conventions**
- **File Name**: [Insert the file name where the issue is found]
- **Line Number**: [Insert the line number where the issue is found]
- **Issue**: [Describe any issues related to adherence to conventions]
- **Suggested Improvement**: [Provide a specific suggestion on how to improve adherence to conventions]

### 2. **Object-Oriented Design**
- **File Name**: [Insert the file name where the issue is found]
- **Line Number**: [Insert the line number where the issue is found]
- **Issue**: [Describe any issues related to object-oriented design, such as encapsulation, high coupling, or low cohesion]
- **Problematic Code**: 
  \`\`\`typescript
  [Insert the problematic code here]
  \`\`\`
- **Suggested Improvement**:
  \`\`\`typescript
  [Insert the improved code here]
  \`\`\`

### 3. **Code Quality**
- **Issue**: [Describe any issues related to code structure, readability, and maintainability]
- **Suggested Improvement**: [Provide a specific suggestion on how to improve code quality]

### 4. **Bugs and Logical Errors**
- **Issue**: [Identify any potential bugs or logical errors]
- **Suggested Improvement**: [Provide a specific suggestion on how to fix the bugs or logical errors]

### 5. **Security**
- **Issue**: [Describe any potential security vulnerabilities]
- **Suggested Improvement**: [Provide a specific suggestion on how to address the security issues]

### 6. **Performance**
- **Issue**: [Identify any potential performance issues]
- **Suggested Improvement**: [Provide a specific suggestion on how to optimize performance]

### 💡 **Overall Assessment**
Provide a concluding statement summarizing the overall quality of the code and whether it is ready to be merged, along with any final recommendations.

Here's the code diff:

\`\`\`diff
${JSON.stringify(diffContent)}
\`\`\`

Please use the structure provided above and include file names, line numbers, and specific code examples to illustrate your points.
`;

    console.log('llm review start...');
    console.time('llm');
    const review = await llm.complete({
      prompt: formattedComment,
    });
    console.timeEnd('llm');
    console.log(review.text);

    await octokit.rest.issues.createComment({
      owner,
      repo: repository,
      issue_number: dto.pullRequestNumber,
      body: review.text,
      headers: {
        'X-GitHub-Api-Version': '2022-11-28',
      },
    });

    console.log('commented');
  }
}
