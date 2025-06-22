import { Controller, Get, Post, Body, Query, ValidationPipe } from '@nestjs/common';
import { ScraperService } from './scraper.service';
import { ScrapeDto } from './dto/scrape.dto';
import { CrawlDto } from './dto/crawl.dto';

@Controller('scraper')
export class ScraperController {
  constructor(private readonly scraperService: ScraperService) {}

  @Post('scrape')
  async scrapeUrl(@Body(ValidationPipe) scrapeDto: ScrapeDto) {
    return this.scraperService.scrapeUrl(scrapeDto.url, scrapeDto.selector);
  }

  @Post('crawl')
  async crawlSite(@Body(ValidationPipe) crawlDto: CrawlDto) {
    return this.scraperService.crawlSite(
      crawlDto.url,
      crawlDto.maxDepth,
      crawlDto.targetPhrases,
      crawlDto.maxFilteredPages
    );
  }

  @Get('quick-scrape')
  async quickScrape(@Query('url') url: string, @Query('selector') selector?: string) {
    return this.scraperService.scrapeUrl(url, selector);
  }
}