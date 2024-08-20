import { Body, Controller, Get, Post } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Post('review')
  review(@Body() body: any): string {
    console.log({ body });
    const a = 123;
    console.log('review api: ', new Date());
    return 'review';
  }
}
