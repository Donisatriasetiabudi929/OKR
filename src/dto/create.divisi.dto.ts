import { IsNotEmpty, IsString } from "class-validator";

export class CreateDivisiDto{
    @IsString()
    @IsNotEmpty()//Untuk mengecek bahwa jangan sampai field nya tidak terisi
    readonly nama: string;


}