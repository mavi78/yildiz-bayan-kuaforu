import { IsNotEmpty, IsString, MaxLength } from "class-validator";

/**
 * Hizmet notu ekleme DTO'su
 */
export class AddServiceNoteDto {
  @IsString()
  @IsNotEmpty({ message: "Not içeriği zorunludur" })
  @MaxLength(1000, { message: "Not maksimum 1000 karakter olabilir" })
  content!: string;
}
