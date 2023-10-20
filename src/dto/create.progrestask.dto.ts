import { IsNotEmpty, IsNumber, IsString } from "class-validator";

export class CreateTaskDto{

    @IsString()
    @IsNotEmpty()
    readonly id_task: string;

    @IsString()
    readonly id_profile: string;

    @IsString()
    readonly nama_profile: string;

    @IsString()
    readonly foto_profile: string;

    @IsString()
    @IsNotEmpty()
    readonly tanggal: string;

    @IsString()
    @IsNotEmpty()
    readonly nama: string;

    @IsString()
    @IsNotEmpty()
    readonly deskripsi: string;

    @IsString()
    readonly file: string;

    @IsString()
    readonly link: string;

    @IsString()
    readonly status: string;

}