import { IsNotEmpty, IsString } from "class-validator";

export class CreateDivisiDto {
    @IsString()
    @IsNotEmpty()
    readonly nama: string;


}