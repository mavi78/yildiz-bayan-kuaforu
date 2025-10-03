import { Transform, Type } from "class-transformer";
import { IsEnum, IsNumber, IsOptional } from "class-validator";
import { Role } from "@prisma/client";

/**
 * Davet listeleme query DTO'su
 */
export class ListInvitationsQueryDto {
  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined || value === null || value === "") {
      return undefined;
    }

    return value === "true" || value === true;
  })
  isUsed?: boolean;

  @IsOptional()
  @IsEnum(Role, { message: "Rol değeri geçersiz" })
  role?: Role;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  skip?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  take?: number;
}
