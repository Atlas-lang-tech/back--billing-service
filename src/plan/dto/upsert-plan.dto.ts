import { IsBoolean, IsInt, IsOptional, IsString, Min } from 'class-validator';

// Toggles only the plan's active flag, without touching limits or price.
export class SetPlanActiveDto {
  @IsBoolean()
  isActive!: boolean;
}

export class UpsertPlanDto {
  @IsString()
  code!: string;

  @IsString()
  name!: string;

  @IsInt()
  @Min(0)
  maxDictionaries!: number;

  @IsInt()
  @Min(0)
  maxWordsPerDict!: number;

  @IsInt()
  @Min(0)
  priceCents!: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

// Update allows changing everything except the immutable `code` (the PK).
export class UpdatePlanDto {
  @IsString()
  name!: string;

  @IsInt()
  @Min(0)
  maxDictionaries!: number;

  @IsInt()
  @Min(0)
  maxWordsPerDict!: number;

  @IsInt()
  @Min(0)
  priceCents!: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
