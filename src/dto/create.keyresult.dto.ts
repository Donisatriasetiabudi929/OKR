import { IsNotEmpty, IsNumber, IsString } from "class-validator";

export class CreateKeyresultDto{
    @IsString()
    @IsNotEmpty()//Untuk mengecek bahwa jangan sampai field nya tidak terisi
    readonly id_projek: string;

    @IsString()
    @IsNotEmpty()//Untuk mengecek bahwa jangan sampai field nya tidak terisi
    readonly id_objek: string;

    @IsString()
    @IsNotEmpty()
    readonly nama: string;

    readonly file: string;

    @IsString()
    readonly link: string;

    @IsString()
    @IsNotEmpty()
    readonly assign_to: string;

    @IsString()
    readonly nama_profile: string;

    readonly foto_profile: string;

    @IsNumber()
    @IsNotEmpty()
    readonly target_value: string;

    @IsNumber()
    readonly current_value: string;

    readonly status: string;

}