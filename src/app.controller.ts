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
    
    [Please refer to the project conventions here: https://developer.mozilla.org/en-US/docs/MDN/Writing_guidelines/Writing_style_guide/Code_style_guide/JavaScript]
    
    **Code Review Focus**:
    1. **Adherence to Conventions**: Ensure the code strictly follows the provided project conventions.
    2. **Code Quality**: Is the code well-structured, readable, and maintainable? Identify any code smells or anti-patterns.
    3. **Bugs and Logical Errors**: Can you spot any potential bugs, logical errors, or edge cases that might have been missed?
    4. **Security**: Assess the code for potential security vulnerabilities. Does it handle sensitive data correctly and follow security best practices?
    5. **Performance**: Identify any potential performance issues or opportunities for optimization.
    
    Please provide the review results in a well-formatted Markdown report, following the same structure as the Code Review Focus sections:
    
    ### 📝 **Code Review Summary**
    Provide a brief overview of the code quality and adherence to the project's conventions.
    
    ### 1. **Adherence to Conventions**
    - Evaluate how well the code adheres to the specified project conventions.
    - Example:
      - **File Name**: \`src/utils/helpers.js\`
      - **Line Number**: 23
      - **Issue**: Variable name does not follow the convention.
      - **Problematic Code**:
        \`\`\`javascript
        const a = 19; // ❌ Incorrect
        \`\`\`
      - **Suggested Improvement**:
        \`\`\`javascript
        const age = 19; // ✅ Correct
        \`\`\`
    
    ### 2. **Code Quality**
    - Assess the structure, readability, and maintainability of the code.
    - Identify any code smells or anti-patterns.
    - Example:
      - **File Name**: \`src/components/Calculator.js\`
      - **Line Number**: 45-47
      - **Issue**: Complex logic within a single function reduces readability.
      - **Problematic Code**:
        \`\`\`javascript
        function calculateTotal(items) {
            let total = 0;
            for (let i = 0; i < items.length; i++) {
                total += items[i];
            }
            return total;
        } // ❌ Inefficient and complex
        \`\`\`
      - **Suggested Improvement**:
        \`\`\`javascript
        function calculateTotal(items) {
            return items.reduce((total, item) => total + item, 0);
        } // ✅ Simplified and more efficient
        \`\`\`
    
    ### 3. **Bugs and Logical Errors**
    - Identify any potential bugs or logical errors within the code.
    - Example:
      - **File Name**: \`src/services/UserService.js\`
      - **Line Number**: 12
      - **Issue**: Possible null reference error when accessing user data.
      - **Problematic Code**:
        \`\`\`javascript
        const userName = user.name.toUpperCase(); // ❌ Potential null reference error
        \`\`\`
      - **Suggested Improvement**:
        \`\`\`javascript
        const userName = user?.name?.toUpperCase() ?? 'Unknown'; // ✅ Safe access and default value
        \`\`\`
    
    ### 4. **Security**
    - Review the code for any security vulnerabilities.
    - Ensure that sensitive data is handled correctly and that security best practices are followed.
    - Example:
      - **File Name**: \`src/controllers/AuthController.js\`
      - **Line Number**: 34
      - **Issue**: Password is stored in plaintext in the database.
      - **Problematic Code**:
        \`\`\`javascript
        saveUser({ username, password }); // ❌ Storing password in plaintext
        \`\`\`
      - **Suggested Improvement**:
        \`\`\`javascript
        const hashedPassword = hashPassword(password);
        saveUser({ username, password: hashedPassword }); // ✅ Password is hashed before storing
        \`\`\`
    
    ### 5. **Performance**
    - Identify any areas where the code could be optimized for better performance.
    - Example:
      - **File Name**: \`src/utils/ArrayUtils.js\`
      - **Line Number**: 8-12
      - **Issue**: Unnecessary iteration over the array.
      - **Problematic Code**:
        \`\`\`javascript
        let result = [];
        for (let i = 0; i < arr.length; i++) {
            result.push(arr[i] * 2);
        } // ❌ Inefficient looping
        \`\`\`
      - **Suggested Improvement**:
        \`\`\`javascript
        const result = arr.map(item => item * 2); // ✅ More efficient using map()
        \`\`\`
    
    ### 💡 **Overall Assessment**
    Provide a concluding statement summarizing the overall quality of the code and whether it is ready to be merged, with any final recommendations.    

    Here's the code diff:

    \`\`\`diff
    [${JSON.stringify(diffContent)}]
    \`\`\`

    Please format your review using the structure above and include file names, line numbers, and code examples where necessary to illustrate your points.
`;

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
