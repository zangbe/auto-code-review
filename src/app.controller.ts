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

    // const formattedComment = `
    //     ## 📝 Code Review Summary

    //     ### ✅ Passed
    //     - All unit tests passed.
    //     - No major security issues found.

    //     ### ⚠️ Issues Found
    //     - **Function \`calculateTotal\`:** The performance can be improved by avoiding unnecessary loops.
    //     - **Variable \`userList\`:** The naming convention does not follow the project guidelines.

    //     ### 📈 Recommendations
    //     - Refactor the \`calculateTotal\` function to reduce the time complexity.
    //     - Rename \`userList\` to \`activeUsers\` to better reflect its purpose.

    //     ---

    //     **Overall:** Great work! Please address the mentioned issues before merging. 👍
    // `;

    // await octokit.rest.issues.createComment({
    //   owner,
    //   repo: repository,
    //   issue_number: dto.pullRequestNumber,
    //   body: formattedComment,
    //   headers: {
    //     'X-GitHub-Api-Version': '2022-11-28',
    //   },
    // });

    // console.log('commented');

    console.log('start llm');
    const llm = new Ollama({
      model: 'llama3',
      config: {
        host: 'http://localhost:11434',
      },
    });

    const diffContent = filteredFiles;

    const formattedComment = `
You are a code review assistant with expertise in following specific project conventions. The project you are reviewing has a defined set of conventions that must be adhered to. Please review the following code changes and ensure that they comply with these conventions.

**Project Conventions**:
Please refer to the following project conventions when conducting your review:

[https://developer.mozilla.org/en-US/docs/MDN/Writing_guidelines/Writing_style_guide/Code_style_guide/JavaScript]

**Code Review Focus**:
1. **Adherence to Conventions**: Ensure the code strictly follows the provided project conventions.
2. **Code Quality**: Is the code well-structured, readable, and maintainable? Identify any code smells or anti-patterns.
3. **Bugs and Logical Errors**: Can you spot any potential bugs, logical errors, or edge cases that might have been missed?
4. **Security**: Assess the code for potential security vulnerabilities. Does it handle sensitive data correctly and follow security best practices?
5. **Performance**: Identify any potential performance issues or opportunities for optimization.

Please provide the review results in a well-formatted Markdown report, including the following sections:

### 📝 **Code Review Summary**
Provide a brief overview of the code quality and adherence to the project's conventions.

### ✅ **Passed**
- List the aspects of the code that meet the standards and follow best practices.
- Example: \`- The function names follow the convention of starting with a verb.\`

### ⚠️ **Issues Found**
- List any issues or areas where the code does not adhere to the project conventions or best practices.
- For each issue, provide:
  - **File Name**: The name of the file where the issue was found.
  - **Line Number**: The specific line number or range of lines where the issue occurs.
  - **Description**: A brief description of the issue.
  - **Problematic Code**: Show the code that has the issue.
  - **Suggested Improvement**: Provide a code example that shows how to fix the issue.
  
- Example:
  - **File Name**: \`src/utils/helpers.js\`
  - **Line Number**: 23
  - **Issue**: Variable name is not descriptive enough.
  - **Problematic Code**:
    \`\`\`javascript
    const a = 19; // ❌ Incorrect
    \`\`\`
  - **Suggested Improvement**:
    \`\`\`javascript
    const age = 19; // ✅ Correct
    \`\`\`

### 📈 **Recommendations**
- Suggest improvements or refactoring opportunities to enhance the code quality, performance, or security.
- Example: \`- Consider refactoring the \`calculateTotal\` function to reduce time complexity.\`

### 💡 **Overall Assessment**
Provide a concluding statement summarizing the overall quality of the code and whether it is ready to be merged, with any final recommendations.

Here's the code diff:

\`\`\`diff
[${diffContent}]
\`\`\`

Please format your review using the structure above and include file names, line numbers, and code examples where necessary to illustrate your points.
`;

    console.time('llm');
    const review = await llm.complete({
      prompt: formattedComment,
    });
    console.timeEnd('llm');
    console.log(review.text);
  }
}
