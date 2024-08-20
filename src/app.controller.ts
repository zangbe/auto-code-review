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

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Post('review')
  @UseInterceptors(FileInterceptor('file'))
  review(@UploadedFile() file: Express.Multer.File, @Body() body: any): string {
    console.log({ body });
    console.log({ file });
    console.log('review api: ', new Date());
    return 'review';
  }
}
