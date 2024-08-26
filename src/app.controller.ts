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

Please provide the review results in a well-formatted Markdown report, following the same structure as the Code Review Focus sections. Additionally, translate all review results into Korean.

### 📝 **코드 리뷰 요약**
코드 품질, 프로젝트 컨벤션 준수 여부 및 전체 설계에 대한 개요를 제공하세요.

### 1. **컨벤션 준수 여부**
- 코드가 제공된 프로젝트 컨벤션을 얼마나 잘 따르고 있는지 평가하세요.

### 2. **객체지향 설계 (Object-Oriented Design)**
- 객체지향 원칙(캡슐화, 상속, 다형성)에 따라 코드가 설계되었는지 평가하세요.
- 객체의 역할과 책임에 따른 설계가 이루어졌는지 확인하세요.
- 코드가 낮은 결합도와 높은 응집도를 유지하고 있는지 평가하세요.
- 예시:
  - **파일명**: \`src/models/User.js\`
  - **라인 번호**: 15-20
  - **문제점**: \`User\` 클래스에서 캡슐화가 부족합니다.
  - **문제가 있는 코드**:
    \`\`\`javascript
    class User {
        constructor(name, email) {
            this.name = name;
            this.email = email;
        }
    } // ❌ 캡슐화 부족으로 인해 내부 상태가 외부에 노출됨
    \`\`\`
  - **개선된 코드**:
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

        // 내부 상태를 보호하기 위한 추가 메서드
    } // ✅ 캡슐화를 통해 내부 상태를 보호
    \`\`\`

  - **파일명**: \`src/services/OrderService.js\`
  - **라인 번호**: 30-40
  - **문제점**: OrderService가 지나치게 많은 역할을 수행하고 있어 높은 결합도를 야기함.
  - **문제가 있는 코드**:
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
    } // ❌ 높은 결합도와 낮은 응집도를 가진 코드
    \`\`\`
  - **개선된 코드**:
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
            // 결제 처리 로직
        }
    }

    class StockManager {
        manage(items) {
            // 재고 관리 로직
        }
    } // ✅ 역할과 책임에 따라 잘 분리된 객체
    \`\`\`

### 3. **코드 품질**
- 코드의 구조, 가독성 및 유지보수성을 평가하세요.
- 코드 스멜이나 안티 패턴이 있는지 확인하세요.

### 4. **버그 및 논리적 오류**
- 코드 내에서 잠재적인 버그나 논리적 오류를 확인하세요.

### 5. **보안**
- 보안 취약점이 있는지 코드를 검토하세요.
- 민감한 데이터가 올바르게 처리되고 있는지 확인하세요.

### 6. **성능**
- 성능을 향상시킬 수 있는 영역을 식별하세요.

### 💡 **전체 평가**
코드의 전반적인 품질을 요약하고, 최종 권장 사항을 제공하여 병합할 준비가 되었는지 여부를 설명하세요.

다음은 코드 diff입니다:

\`\`\`diff
${JSON.stringify(diffContent)}
\`\`\`

리뷰를 위의 구조를 사용하여 작성하고, 필요한 경우 파일 이름, 줄 번호, 코드 예제를 포함하세요.
`;

    console.log(formattedComment);

    // console.log(formattedComment);

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
