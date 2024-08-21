import {
  Body,
  Controller,
  Get,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { AppService } from './app.service';
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

    const chat = await llm.chat({
      messages: [{ content: 'Tell me a joke.', role: 'user' }],
      stream: false,
    });
    console.log('Response 1:', chat);

    const prompt = await llm.complete({
      prompt: 'How are you?',
    });
    console.log('Response 2:', prompt);

    console.log({ body });
    console.log({ file });
    console.log('review api: ', new Date());

    const diffContent = file.buffer.toString('utf-8');
    console.log('Diff Content:', diffContent);

    return 'review1';
  }
}
