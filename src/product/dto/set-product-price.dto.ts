import { IsBoolean, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class SetProductPriceDto {
  @IsInt()
  @Min(0)
  priceCents!: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
