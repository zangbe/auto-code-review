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
  review(@UploadedFile() file: Express.Multer.File, @Body() body: any): string {
    console.log({ body });
    console.log({ file });
    console.log('review api: ', new Date());

    const diffContent = file.buffer.toString('utf-8');
    console.log('Diff Content:', diffContent);

    return 'review1';
  }
}
