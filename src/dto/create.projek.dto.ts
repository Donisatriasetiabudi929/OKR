import { IsNotEmpty, IsString } from "class-validator";

export class CreateProjekDto {
    @IsString()
    @IsNotEmpty()
    readonly nama: string;

    @IsString()
    @IsNotEmpty()
    readonly deskripsi: string;

    @IsString()
    @IsNotEmpty()
    readonly start_date: string;

    @IsString()
    @IsNotEmpty()
    readonly end_date: string;

    @IsString()
    @IsNotEmpty()
    readonly team: string[];


    readonly status: string;


}