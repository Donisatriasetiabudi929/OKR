import { IsNotEmpty, IsNumber, IsString } from "class-validator";

export class CreateProgresDto{

    @IsString()
    readonly id_projek: string;

    @IsString()
    readonly id_objek: string;

    @IsString()
    @IsNotEmpty()
    readonly id_keyresult: string;

    @IsString()
    readonly id_profile: string;

    @IsString()
    readonly nama_profile: string;

    @IsString()
    readonly foto_profile: string;

    @IsString()
    readonly tanggal: string;

    @IsString()
    @IsNotEmpty()
    readonly nama: string;

    @IsNumber()
    @IsNotEmpty()
    readonly total: number;

    @IsString()
    readonly file: string;

    @IsString()
    readonly link: string;

    @IsString()
    readonly status: string;

}