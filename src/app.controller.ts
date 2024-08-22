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

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Post('review')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes(...['multipart/form-data', 'application/json'])
  async review(@UploadedFile() file: Express.Multer.File, @Body() body: any) {
    const llm = new Ollama({
      model: 'llama3',
      config: {
        host: 'http://localhost:11434',
      },
    });

    // const chat = await llm.chat({
    //   messages: [{ content: 'Tell me a joke.', role: 'user' }],
    //   stream: false,
    // });
    // console.log('Response 1:', chat);

    // const prompt = await llm.complete({
    //   prompt: 'How are you?',
    // });
    // console.log('Response 2:', prompt);

    // console.log({ body });
    // console.log({ file });
    // console.log('review api: ', new Date());

    const diffContent = file.buffer.toString('utf-8');
    // console.log('Diff Content:', diffContent);

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
        Please provide your feedback in both Korean and English. For each issue, write the problem description, suggestions for improvement, and examples in both languages.
        `,
    });
    console.timeEnd('llm');
    console.log(review.text);

    return 'review1';
  }
}
