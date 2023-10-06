import { IsNotEmpty, IsString } from "class-validator";

export class CreateProjekDto{
    @IsString()
    @IsNotEmpty()//Untuk mengecek bahwa jangan sampai field nya tidak terisi
    readonly nama: string;

    @IsString()
    @IsNotEmpty()//Untuk mengecek bahwa jangan sampai field nya tidak terisi
    readonly deskripsi: string;

    @IsString()
    @IsNotEmpty()//Untuk mengecek bahwa jangan sampai field nya tidak terisi
    readonly start_date: string;

    @IsString()
    @IsNotEmpty()//Untuk mengecek bahwa jangan sampai field nya tidak terisi
    readonly end_date: string;

    
    readonly status: string;


}