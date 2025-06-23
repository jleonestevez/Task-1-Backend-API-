import { Module } from '@nestjs/common';
import { ScraperController } from './scraper.controller';
import { ScraperService } from './scraper.service';
import { ExcelExportService } from './services/excel-export.service';
import { ImageDownloadService } from './services/image-download.service';

@Module({
  controllers: [ScraperController],
  providers: [ScraperService, ExcelExportService, ImageDownloadService],
  exports: [ScraperService, ExcelExportService, ImageDownloadService],
})
export class ScraperModule {} 