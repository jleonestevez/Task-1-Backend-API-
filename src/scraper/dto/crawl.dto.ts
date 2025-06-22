import { IsNotEmpty, IsString, IsOptional, IsInt, Min, Max, IsArray } from 'class-validator';

export class CrawlDto {
  @IsNotEmpty()
  @IsString()
  url: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(3) // Limitamos la profundidad para evitar crawling excesivo
  maxDepth?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  targetPhrases?: string[];

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100) // Limitamos el número máximo de páginas filtradas
  maxFilteredPages?: number;
}