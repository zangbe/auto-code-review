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
You are a code review assistant with expertise in following specific project conventions. The project you are reviewing has a defined set of conventions that must be adhered to. Please review the following code changes and ensure that they comply with these conventions.

**Project Conventions**:
Please refer to the following project conventions when conducting your review:

[Please refer to the project conventions here: https://developer.mozilla.org/en-US/docs/MDN/Writing_guidelines/Writing_style_guide/Code_style_guide/JavaScript]

**Code Review Focus**:
1. **Adherence to Conventions**: Ensure the code strictly follows the provided project conventions.
2. **Object-Oriented Design**: Assess whether the code follows object-oriented principles such as encapsulation, inheritance, and polymorphism. Evaluate if the objects are designed according to their roles and responsibilities, ensuring low coupling and high cohesion.
3. **Code Quality**: Is the code well-structured, readable, and maintainable? Identify any code smells or anti-patterns.
4. **Bugs and Logical Errors**: Can you spot any potential bugs, logical errors, or edge cases that might have been missed?
5. **Security**: Assess the code for potential security vulnerabilities. Does it handle sensitive data correctly and follow security best practices?
6. **Performance**: Identify any potential performance issues or opportunities for optimization.

Please provide the review results in a well-formatted Markdown report, following the same structure as the Code Review Focus sections:

### 📝 **Code Review Summary**
Provide a brief overview of the code quality, adherence to the project's conventions, and overall design.

### 1. **Adherence to Conventions**
- Evaluate how well the code adheres to the specified project conventions.

### 2. **Object-Oriented Design**
- Review the code for adherence to object-oriented principles such as encapsulation, inheritance, and polymorphism.
- Evaluate whether the objects are designed according to their roles and responsibilities.
- Assess whether the code maintains low coupling and high cohesion.
- Example:
  - **File Name**: \`src/models/User.js\`
  - **Line Number**: 15-20
  - **Issue**: Lack of encapsulation in the \`User\` class.
  - **Problematic Code**:
    \`\`\`javascript
    class User {
        constructor(name, email) {
            this.name = name;
            this.email = email;
        }
    } // ❌ Public properties without encapsulation
    \`\`\`
  - **Suggested Improvement**:
    \`\`\`javascript
    class User {
        constructor(name, email) {
            this._name = name;
            this._email = email;
        }

        get name() {
            return this._name;
        }

        set name(value) {
            this._name = value;
        }

        // Additional methods for encapsulation
    } // ✅ Encapsulated properties with getters and setters
    \`\`\`

  - **File Name**: \`src/services/OrderService.js\`
  - **Line Number**: 30-40
  - **Issue**: The OrderService class performs too many roles, leading to high coupling.
  - **Problematic Code**:
    \`\`\`javascript
    class OrderService {
        constructor(paymentService, inventoryService) {
            this.paymentService = paymentService;
            this.inventoryService = inventoryService;
        }

        processOrder(order) {
            this.paymentService.charge(order.paymentInfo);
            this.inventoryService.updateStock(order.items);
        }
    } // ❌ High coupling and low cohesion
    \`\`\`
  - **Suggested Improvement**:
    \`\`\`javascript
    class OrderService {
        constructor() {
            this.paymentProcessor = new PaymentProcessor();
            this.stockManager = new StockManager();
        }

        processOrder(order) {
            this.paymentProcessor.process(order.paymentInfo);
            this.stockManager.manage(order.items);
        }
    }

    class PaymentProcessor {
        process(paymentInfo) {
            // Payment processing logic
        }
    }

    class StockManager {
        manage(items) {
            // Stock management logic
        }
    } // ✅ Roles and responsibilities are well separated with low coupling
    \`\`\`

### 3. **Code Quality**
- Assess the structure, readability, and maintainability of the code.
- Identify any code smells or anti-patterns.

### 4. **Bugs and Logical Errors**
- Identify any potential bugs or logical errors within the code.

### 5. **Security**
- Review the code for any security vulnerabilities.
- Ensure that sensitive data is handled correctly and that security best practices are followed.

### 6. **Performance**
- Identify any areas where the code could be optimized for better performance.

### 💡 **Overall Assessment**
Provide a concluding statement summarizing the overall quality of the code and whether it is ready to be merged, with any final recommendations.

Here's the code diff:

\`\`\`diff
${JSON.stringify(diffContent)}
\`\`\`

Please format your review using the structure above and include file names, line numbers, and code examples where necessary to illustrate your points.
`;

    console.log('llm review start...');
    console.time('llm');
    const review = await llm.complete({
      prompt: formattedComment,
    });
    console.timeEnd('llm');
    // console.log(review.text);

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
