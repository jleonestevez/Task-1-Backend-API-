import { IsNotEmpty, IsString, IsOptional } from 'class-validator';

export class ScrapeDto {
  @IsNotEmpty()
  @IsString()
  url: string;

  @IsOptional()
  @IsString()
  selector?: string;
}